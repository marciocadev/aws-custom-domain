import { join } from "path";
import { Stack, StackProps } from "aws-cdk-lib";
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { Certificate, ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  CloudFrontAllowedMethods,
  CloudFrontWebDistribution,
  CloudFrontWebDistributionProps,
  LambdaEdgeEventType,
  OriginProtocolPolicy,
  SecurityPolicyProtocol,
  SourceConfiguration,
  SSLMethod,
  ViewerCertificate,
} from "aws-cdk-lib/aws-cloudfront";
import { Runtime, Version } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  ARecord,
  HostedZone,
  IHostedZone,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import {
  ApiGatewayDomain,
  CloudFrontTarget,
} from "aws-cdk-lib/aws-route53-targets";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

var env = {
  zoneName: "marciocadev.com",
  certificateArn:
    "arn:aws:acm:us-east-1:549672552044:certificate/cd2994c4-66ac-4a60-869d-31ec7c5428d3",
  hostedZoneId: "Z014672621L0K2RACEWVV",
};

export class CustomDomainStack extends Stack {
  certificate: ICertificate;
  hostedZone: IHostedZone;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.certificate = Certificate.fromCertificateArn(
      this,
      "DomainCertificate",
      env.certificateArn
    );

    this.hostedZone = HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId: env.hostedZoneId,
      zoneName: env.zoneName,
    });
  }

  setApiGatewaySubDomain(subDomain: string, gateway: RestApi): string {
    const domainName = subDomain + "." + env.zoneName;
    const url = "https://" + domainName;

    const domain = gateway.addDomainName("Domain", {
      certificate: this.certificate,
      domainName: domainName,
    });

    new ARecord(this, "GatewayDomain", {
      recordName: subDomain,
      zone: this.hostedZone,
      target: RecordTarget.fromAlias(new ApiGatewayDomain(domain)),
    });

    return url;
  }

  setCloudfrontSubDomain(
    subDomain: string,
    bucket?: Bucket,
    gateway?: RestApi
  ): string {
    const domainName = subDomain + "." + env.zoneName;
    const url = "https://" + domainName;

    const edge = new NodejsFunction(this, "Edge", {
      functionName: "EdgeLambda",
      entry: join(__dirname, "lambda-fns/edge/index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
    });

    const edgeVersion = new Version(this, "EdgeVersion", {
      lambda: edge,
    });

    let originConfigs: SourceConfiguration[] = [];
    if (bucket) {
      const bucketSourceConfiguration: SourceConfiguration = {
        s3OriginSource: { s3BucketSource: bucket },
        behaviors: [
          {
            isDefaultBehavior: true,
            lambdaFunctionAssociations: [
              {
                eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
                lambdaFunction: edgeVersion,
              },
            ],
          },
        ],
      };
      originConfigs.push(bucketSourceConfiguration);
    }

    if (gateway) {
      const gatewaySourceConfiguration: SourceConfiguration = {
        customOriginSource: {
          domainName:
            gateway.restApiId +
            ".execute-api." +
            this.region +
            "." +
            this.urlSuffix,
          originPath: "/" + gateway.deploymentStage.stageName,
          httpPort: 80,
          httpsPort: 443,
          originProtocolPolicy: OriginProtocolPolicy.HTTPS_ONLY,
        },
        behaviors: [
          {
            isDefaultBehavior: false,
            pathPattern: "api/*",
            allowedMethods: CloudFrontAllowedMethods.ALL,
            lambdaFunctionAssociations: [
              {
                eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
                lambdaFunction: edgeVersion,
              },
            ],
          },
        ],
      };
      originConfigs.push(gatewaySourceConfiguration);
    }

    const props: CloudFrontWebDistributionProps = {
      originConfigs: originConfigs,
      viewerCertificate: ViewerCertificate.fromAcmCertificate(
        Certificate.fromCertificateArn(this, "certificate", env.certificateArn),
        {
          aliases: [domainName],
          sslMethod: SSLMethod.SNI,
          securityPolicy: SecurityPolicyProtocol.TLS_V1_2_2021,
        }
      ),
    };

    // Cria o Cloudfront (CDN) para expor o site
    const distribution = new CloudFrontWebDistribution(
      this,
      "WebDistribution",
      props
    );

    new ARecord(this, "CloudfrontDomain", {
      recordName: subDomain,
      zone: this.hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    return url;
  }
}
