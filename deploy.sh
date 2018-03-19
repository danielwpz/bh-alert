#!/usr/bin/env bash

# Usage
# deploy.sh job-spec.hcl
# This will convert the hcl file to json and push the job definition
# to a SQS queue, which then is consumed by our deploy service.

DEPLOY_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/055970264539/deploy-queue"

# convert hcl file to json
JOB_JSON="$(nomad run -output $1)"

# construct job message
JOB_MSG="{\"action\":\"deploy\",\"definition\":${JOB_JSON}}"
JOB_MSG="$(echo $JOB_MSG | tr -d '[:space:]')"
echo $JOB_MSG

# push message to sqs
aws sqs send-message --queue-url $DEPLOY_QUEUE_URL --message-body "${JOB_MSG}"
