import {
  App,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
} from 'aws-cdk-lib/aws-cognito';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  Resource,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import {
  Code,
  Function as LFunction,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { LAMBDA_SOURCE_CODE_DIR } from './constants';
import { resolve } from 'path';

export interface ApiStackProps extends StackProps {
  readonly apiStackPrefix: string,
  readonly itemsTable: Table,
}

export class ApiStack extends Stack {
  readonly props: ApiStackProps;

  readonly restApiGateway: RestApi;

  private userPool: UserPool;

  public cognitoAppClient: UserPoolClient;

  readonly cognitoAuthorizer: CognitoUserPoolsAuthorizer;

  constructor(scope: App, id: string, props: ApiStackProps) {
    super(scope, id, props);
    this.props = props;

    this.restApiGateway = this.createApiGateway();
    this.cognitoAuthorizer = this.createCognitoAuthorizer();
    this.createItemResource();
  }

  private createApiGateway() : RestApi {
    return new RestApi(this, `${this.props.apiStackPrefix}-RestApi`, {
      restApiName: `${this.props.apiStackPrefix}-RestApi`,
    });
  }

  private createCognitoAuthorizer() : CognitoUserPoolsAuthorizer {
    this.userPool = new UserPool(this, `${this.props.apiStackPrefix}-UserPool`, {
      removalPolicy: RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      userPoolName: `${this.props.apiStackPrefix}-UserPool`,
    });
    this.cognitoAppClient = this.userPool.addClient(`${this.props.apiStackPrefix}-UserPoolAppClient`, {
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
        custom: true,
      },
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO,
      ],
    });
    return new CognitoUserPoolsAuthorizer(this, `${this.props.apiStackPrefix}-CognitoAuthorizer`, {
      cognitoUserPools: [this.userPool],
    });
  }

  private createItemResource() : void {
    const itemResource = this.restApiGateway.root.addResource('item');
    this.createItemMethods(itemResource);
  }

  private createItemMethods(itemResource: Resource) : void {
    const lambdaHealthCheckFunction = new LFunction(this, `${this.props.apiStackPrefix}-HealthCheckFunction`, {
      code: Code.fromAsset(resolve(__dirname, LAMBDA_SOURCE_CODE_DIR, 'healthcheck')),
      functionName: `${this.props.apiStackPrefix}-HealthCheckFunction`,
      handler: 'healthcheck.lambda_handler',
      runtime: Runtime.PYTHON_3_9,
    });

    const lambdaGetItemFunction = new LFunction(this, `${this.props.apiStackPrefix}-GetItemFunction`, {
      code: Code.fromAsset(resolve(__dirname, LAMBDA_SOURCE_CODE_DIR, 'get_item')),
      environment: {
        ITEM_TABLE: this.props.itemsTable.tableName,
      },
      functionName: `${this.props.apiStackPrefix}-GetItemFunction`,
      handler: 'get_item.lambda_handler',
      runtime: Runtime.PYTHON_3_9,
    });
    const lambdaPostItemFunction = new LFunction(this, `${this.props.apiStackPrefix}-PostItemFunction`, {
      code: Code.fromAsset(resolve(__dirname, LAMBDA_SOURCE_CODE_DIR, 'post_item')),
      environment: {
        ITEM_TABLE: this.props.itemsTable.tableName,
      },
      functionName: `${this.props.apiStackPrefix}-PostItemFunction`,
      handler: 'post_item.lambda_handler',
      runtime: Runtime.PYTHON_3_9,
    });
    this.props.itemsTable.grantReadData(lambdaGetItemFunction);
    this.props.itemsTable.grantWriteData(lambdaPostItemFunction);

    const lambdaDefaultIntegration = new LambdaIntegration(
      lambdaHealthCheckFunction,
      { proxy: true },
    );
    const lambdaGetItemIntegration = new LambdaIntegration(
      lambdaGetItemFunction,
      { proxy: true },
    );
    const lambdaPostItemIntegration = new LambdaIntegration(
      lambdaPostItemFunction,
      { proxy: true },
    );

    const itemIdResource = itemResource.addResource('{itemId}', {
      defaultIntegration: lambdaDefaultIntegration,
    });
    itemIdResource.addMethod('GET', lambdaGetItemIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
    itemIdResource.addMethod('POST', lambdaPostItemIntegration, {
      authorizer: this.cognitoAuthorizer,
      authorizationType: AuthorizationType.COGNITO,
    });
  }
}