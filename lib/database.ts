import {
  App,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  AttributeType,
  BillingMode,
  Table,
  TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import {
  Code,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { TriggerFunction } from 'aws-cdk-lib/triggers';
import { LAMBDA_SOURCE_CODE_DIR } from './constants';
import { resolve } from 'path';

export interface DatabaseStackProps extends StackProps {
  databasePrefix: string,
}

export class DatabaseStack extends Stack {
  readonly itemsTable: Table;

  readonly props: DatabaseStackProps;

  constructor(scope: App, id: string, props: DatabaseStackProps) {
    super(scope, id, props);
    this.props = props;
    this.itemsTable = this.createDatabase();
    this.populateDatabase();
  }

  private createDatabase() : Table {
    const tableName = `${this.props.databasePrefix}-ItemsTable`;
    return new Table(this, tableName, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'id', type: AttributeType.STRING },
      encryption: TableEncryption.DEFAULT,
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: tableName,
    });
  }

  private populateDatabase() : void {
    const triggerFunctionName = `${this.props.databasePrefix}-PopulateDatabaseFunction`;

    const populateDatabaseFunction = new TriggerFunction(this, triggerFunctionName, {
      code: Code.fromAsset(resolve(__dirname, LAMBDA_SOURCE_CODE_DIR, 'populate_database')),
      environment: {
        ITEM_TABLE: this.itemsTable.tableName,
      },
      handler: 'populate_database.lambda_handler',
      runtime: Runtime.PYTHON_3_9,
    });
    this.itemsTable.grantWriteData(populateDatabaseFunction);
  }
}
