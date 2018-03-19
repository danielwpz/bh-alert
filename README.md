# bh-alert
In stock alert service for B&amp;H photos.
      
## Description
The job of this service is really simple:     
When given a list of product ids in B&amp;H photos, it will check if those products are in stock or not.     
- A REST API is published at `/products` to show the query results.      
- And a cron job is also scheduled every minute to periodcally check the in stock status.
If the status changed, it will send out SMS notifications to all subscribers.         
        
List of product IDs and subscriber phone numbers are configured in `config.js`
      
## Run
> To run it you'll need a stdlib token that has access to messagebird, which allows you to send SMS messages.      
        
1. `npm i`    
2. `STDLIB_TOKEN=YOUR_TOKEN npm run start`

## Deploy
> Make sure you have `docker`, `nomad`, `aws-cli` locally installed. And for AWS, you'll need a credential which has access to SQS deploy queue configured in `deploy.sh`        
      
`npm version VERSION`
