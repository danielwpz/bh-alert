FROM node:8.9.0-alpine

WORKDIR /usr/src

# Install packages first,
# this will make best use of cache
COPY package.json .
COPY package-lock.json .
RUN npm install

COPY . .

EXPOSE 5050

CMD ["npm", "run", "start"]