import { Stack, StackProps } from "aws-cdk-lib";
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { Certificate, ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  Behavior,
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
import { IVersion } from "aws-cdk-lib/aws-lambda";
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
    gateway?: RestApi,
    edge?: IVersion
  ): string {
    const domainName = subDomain + "." + env.zoneName;
    const url = "https://" + domainName;

    let originConfigs: SourceConfiguration[] = [];
    if (bucket) {
      let bucketBehaviors: Behavior = {};
      if (edge) {
        bucketBehaviors = {
          isDefaultBehavior: true,
          lambdaFunctionAssociations: [
            {
              eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
              lambdaFunction: edge,
            },
          ],
        };
      } else {
        bucketBehaviors = {
          isDefaultBehavior: true,
        };
      }

      const bucketSourceConfiguration: SourceConfiguration = {
        s3OriginSource: { s3BucketSource: bucket },
        behaviors: [bucketBehaviors],
      };
      originConfigs.push(bucketSourceConfiguration);
    }

    if (gateway) {
      let gatewayBehaviors = {};
      if (edge) {
        gatewayBehaviors = {
          isDefaultBehavior: false,
          pathPattern: "api/*",
          allowedMethods: CloudFrontAllowedMethods.ALL,
          lambdaFunctionAssociations: [
            {
              eventType: LambdaEdgeEventType.ORIGIN_RESPONSE,
              lambdaFunction: edge,
            },
          ],
        };
      } else {
        gatewayBehaviors = {
          isDefaultBehavior: false,
          pathPattern: "api/*",
          allowedMethods: CloudFrontAllowedMethods.ALL,
        };
      }

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
        behaviors: [gatewayBehaviors],
      };
      originConfigs.push(gatewaySourceConfiguration);
    }

    const props: CloudFrontWebDistributionProps = {
      originConfigs: originConfigs,
      viewerCertificate: ViewerCertificate.fromAcmCertificate(
        this.certificate, //Certificate.fromCertificateArn(this, "certificate", env.certificateArn),
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
      "WebDistribution-" + subDomain,
      props
    );

    new ARecord(this, "CloudfrontDomain-" + subDomain, {
      recordName: subDomain,
      zone: this.hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });

    return url;
  }
}
