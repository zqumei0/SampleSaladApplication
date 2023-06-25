import { App } from 'aws-cdk-lib';
import { ApiStack } from './api';
import { DatabaseStack } from './database';
import { APPLICATION_NAME } from './constants';

const app = new App();
const databaseStack = new DatabaseStack(app, `${APPLICATION_NAME}-DatabaseStack`, {
  databasePrefix: APPLICATION_NAME,
  stackName: `${APPLICATION_NAME}-DatabaseStack`,
});
const apiStack = new ApiStack(app, `${APPLICATION_NAME}-ApiStack`, {
  apiStackPrefix: APPLICATION_NAME,
  itemsTable: databaseStack.itemsTable,
  stackName: `${APPLICATION_NAME}-ApiStack`,
});

apiStack.addDependency(databaseStack);


