import { Stack, StackProps } from "aws-cdk-lib";
import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { Certificate, ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  ARecord,
  HostedZone,
  IHostedZone,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import { ApiGatewayDomain } from "aws-cdk-lib/aws-route53-targets";
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
}
