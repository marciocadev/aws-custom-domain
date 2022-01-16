import { join } from "path";
import { App, CfnOutput, StackProps } from "aws-cdk-lib";
import { LambdaIntegration, LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { CustomDomainStack } from "./custom-domain";

export class MyStack extends CustomDomainStack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    // Cria um lambda para teste
    const lambda = new NodejsFunction(this, "GatewayLambda", {
      functionName: "GatewayDomainLambda",
      entry: join(__dirname, "lambda-fns/gateway/index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
    });
    // Integra o lambda com o ApiGateway
    const gateway = new LambdaRestApi(this, "Gateway", {
      handler: lambda,
      proxy: false,
    });
    // Cria os paths /api/get
    const apiResource = gateway.root.addResource("api");
    const getResource = apiResource.addResource("get");
    // Cria o método GET
    getResource.addMethod("GET", new LambdaIntegration(lambda));
    // Vincula um domínio ao endpoint
    // https://gtw.marciocadev.com/api/get
    const gatewayUrl = this.setApiGatewaySubDomain("gtw", gateway);
    new CfnOutput(this, "MyGatewayUrl", {
      value: gatewayUrl,
      exportName: "my-gateway-url",
    });
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, "aws-custom-domain", { env: devEnv });
// new MyStack(app, "aws-custom-domain", { env: prodEnv });

app.synth();
