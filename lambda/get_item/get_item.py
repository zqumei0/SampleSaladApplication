import boto3
import json
import os

ITEM_TABLE = os.environ["ITEM_TABLE"]
DYNAMODB_CLIENT = boto3.resource("dynamodb")


def lambda_handler(event, context):
    print(event)
    item_id = event["pathParameters"]["itemId"]
    table = DYNAMODB_CLIENT.Table(ITEM_TABLE)

    try:
        response = table.get_item(
            Key={ "id" : item_id },
        )

        if "Item" not in response:
            print(f"Item {item_id} not found.")
            raise ValueError(
                f"Error: No Item found with itemId {item_id}"
            )
        return {
            "statusCode": 200,
            "body": json.dumps(response["Item"])
        }
    except ValueError as error:
        print(f"Client side error for item {item_id}")
        return {
            "statusCode": 404,
            "body": json.dumps({"error": str(error)})
        }
    except Exception as error:
        print(f"Internal error for item {item_id}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(error)})
        }
