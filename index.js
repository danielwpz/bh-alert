'use strict';

const rp = require('request-promise');
const express = require('express');
const cheerio = require('cheerio');
const cron = require('node-cron');
const urlJoin = require('url-join');
const moment = require('moment-timezone');
const _ = require('lodash');
const config = require('./config');
const lib = require('lib')({ token: process.env.STDLIB_TOKEN });
const messageBird = lib.messagebird.sms['@0.1.3'];
const app = express();

async function query(productId) {
  const productUrl = urlJoin(config.bh_base_url, productId);

  const $ = await rp({
    uri: productUrl,
    transform: cheerio.load
  });

  const productName = parseProductName($('h1.pProductName').text());

  const inStockStatus = $('span[data-selenium=inStock]').text();
  const notStockStatus = $('span[data-selenium=notStock]').text();
  const stockStatus = inStockStatus || notStockStatus;

  if (productName && stockStatus) {
    return {
      id: productId,
      product: productName,
      available: !!inStockStatus,
      status: stockStatus
    };
  }

  return null;
}

async function queryAll() {
  return Promise.all(config.products.map(query));
}

function parseProductName(rawString) {
  return rawString
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .split(' ')
    .filter(s => s !== '')
    .join(' ');
}

function statusNotEqual(a, b) {
  if (!a || !b) {
    return false;
  }

  return a.status !== b.status;
}

async function notifySMS(productStatus) {
  const message = buildSMS(productStatus);

  config.sms.forEach(async (number) => {
    console.log(`Notifying ${number}`);
    return await messageBird.create({
      recipient: number,
      body: message
    })
  });
}

function buildSMS(status) {
  const title = '[B&H Alert]';
  const bodys = status.map(s => {
    const statusString = s.available? 'now IN STOCK' : 'not available';
    return `${s.product} is ${statusString} (${s.status})`;
  });
  const time = moment().tz('America/Los_Angeles').format('lll');

  return title + '\n\n' + bodys.join('\n\n') + '\n\n' + time;
}

// -- HTTP server --
app.get('/status/health', (req, res) => res.json({ health: 'ok' }));

app.get('/status/version', (req, res) => res.json({ version: process.env.npm_package_version }));

app.get('/products', async (req, res) => res.json(await queryAll()));

app.listen(config.port, () => console.log(`Listening at ${config.port}...`));

// -- cron job --
let pastStatus = {};

async function doNotify() {
  console.log('Checking status...');

  try {
    const latestStatus = (await queryAll()).filter(s => !!s);
    let productsNeedsNotify = [];

    latestStatus.forEach(s => {
      // if it's the first time we saw this product and it's available OR
      // the status of this product has changed
      // we do notify
      if ((!pastStatus[s.id] && s.available) || statusNotEqual(s, _.last(pastStatus[s.id]))) {
        productsNeedsNotify.push(s);
      }

      // push latest status
      pastStatus[s.id] = pastStatus[s.id] || [];
      pastStatus[s.id].push(s);
    });

    if (productsNeedsNotify.length > 0) {
      console.log(`${productsNeedsNotify.length} products need to be notified:`);
      console.log(productsNeedsNotify.map(p => p.product));
      await notifySMS(productsNeedsNotify);
    } else {
      console.log('No product to be notified');
    }
  }catch (e) {
    console.log(e);
    console.log(e.stack);
  }
}

cron.schedule('* * * * *', doNotify);
