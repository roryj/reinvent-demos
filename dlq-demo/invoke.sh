#!/bin/sh

while true
do
    BUCKET_NAME=$(cat /dev/urandom | LC_CTYPE=C tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    PAYLOAD="{\"Records\":    [{\"bucket\":\"$BUCKET_NAME\", \"key\":\"s3-file.zip\"}]}"
    echo "Sending payload: $PAYLOAD"
    aws lambda invoke --function-name get-from-bucket --payload "$PAYLOAD" out --region us-east-2 --invocation-type Event --profile serverless-demo
    sleep 5
done
