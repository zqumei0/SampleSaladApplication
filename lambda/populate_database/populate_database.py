import boto3
import json
import os
import typing

ITEM_TABLE = os.environ["ITEM_TABLE"]
DYNAMODB_CLIENT = boto3.resource("dynamodb")


def parse_data_file() -> typing.Dict[str, str]:
    with open("MOCK_DATA.json") as data_file:
        return json.load(data_file)


def insert_item(item: typing.Dict[str, str], transaction_table):
    transaction_table.put_item(Item=item)


def lambda_handler(event, context):
    item_table = DYNAMODB_CLIENT.Table(ITEM_TABLE)
    mock_data = parse_data_file()

    for item in mock_data:
        insert_item(item, item_table)