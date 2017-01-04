from __future__ import print_function

import json
import urllib
import boto3
from botocore.client import Config

print('Loading function')

s3 = boto3.client('s3', config=Config(signature_version='s3v4'))

def lambda_handler(event, context):

    # Get the object from the event and show its content type
    bucket = event['Records'][0]['bucket']
    key = urllib.unquote_plus(event['Records'][0]['key'].encode('utf8'))
    try:
        response = s3.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read()
        print("CONTENT: " + content )
        return content
    except Exception as e:
        print(e)
        print('Error getting object {} from bucket {}. Make sure they exist and your bucket is in the same region as this function.'.format(key, bucket))
        raise e
