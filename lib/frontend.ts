import {
  App,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  Distribution,
  OriginAccessIdentity,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from 'aws-cdk-lib/aws-s3';
import {
  BucketDeployment,
  Source,
} from 'aws-cdk-lib/aws-s3-deployment';
import { resolve } from 'path';

const WEB_APPLICATION_SOURCE_DIR : string = '../frontend/example-salad-app/build';

export interface FrontEndStackProps extends StackProps {
  readonly frontendStackPrefix: string;
}

export class FrontEndStack extends Stack {
  readonly props: FrontEndStackProps;

  readonly frontendBucket: Bucket;

  readonly cloudfrontDistribution: Distribution;

  constructor(scope: App, id: string, props: FrontEndStackProps) {
    super(scope, id, props);
    this.props = props;

    this.frontendBucket = this.createBucket();
    this.cloudfrontDistribution = this.setupCdnHosting();
    this.mountReactApplication();
  }

  private createBucket() : Bucket {
    return new Bucket(this, `${this.props.frontendStackPrefix}-FrontendBucket`, {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  private setupCdnHosting() : Distribution {
    const originAccessIdentity = new OriginAccessIdentity(
      this,
      `${this.props.frontendStackPrefix}-OriginAccessIdentity`,
    );
    this.frontendBucket.grantRead(originAccessIdentity);

    return new Distribution(this, `${this.props.frontendStackPrefix}-CloudFrontDistribution`, {
      defaultBehavior: {
        origin: new S3Origin(this.frontendBucket, { originAccessIdentity }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
    });
  }

  private mountReactApplication() : void {
    new BucketDeployment(this, `${this.props.frontendStackPrefix}-ReactDeployment`, {
      destinationBucket: this.frontendBucket,
      distribution: this.cloudfrontDistribution,
      sources: [Source.asset(resolve(__dirname, WEB_APPLICATION_SOURCE_DIR))],
    });
  }
}