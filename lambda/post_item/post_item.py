import boto3
import json
import os

ITEM_TABLE = os.environ["ITEM_TABLE"]
DYNAMODB_CLIENT = boto3.resource("dynamodb")


def lambda_handler(event, context):
    print(event)
    item_id = event["pathParameters"]["itemId"]
    item_value = json.loads(event["body"])["item"]
    table = DYNAMODB_CLIENT.Table(ITEM_TABLE)
    try:
        table.put_item(
            Item={
                "id": item_id,
                "item": item_value,
            },
        )
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Operation Successful"})
        }
    except Exception as error:
        print(f"Write failed: {error}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Operation Failed"})
        }