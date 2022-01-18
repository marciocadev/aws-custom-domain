import { join } from "path";
import { App, CfnOutput, RemovalPolicy, StackProps } from "aws-cdk-lib";
import { LambdaIntegration, LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { Runtime, Version } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
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

    const siteDomain = "marciocadev.com";
    // Cria o bucket
    const siteBucket = new Bucket(this, "MySiteBucket", {
      bucketName: siteDomain,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: true,
    });
    // Faz o deploy do site no bucket
    new BucketDeployment(this, "MyBucketDeployment", {
      sources: [Source.asset("src/website")],
      destinationBucket: siteBucket,
      destinationKeyPrefix: "/",
    });
    // Cria uma lambda para teste com cloudfront
    const cfLambda = new NodejsFunction(this, "CloudfrontLambda", {
      functionName: "CloudfrontDomainLambda",
      entry: join(__dirname, "lambda-fns/cloudfront/index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
    });
    // Integra a lambda a um ApiGateway
    const gatewayCloudfront = new LambdaRestApi(this, "GatewayCloudfront", {
      handler: cfLambda,
      proxy: false,
    });
    // Cria os paths /api/get
    const apiCFResource = gatewayCloudfront.root.addResource("api");
    const getCFResource = apiCFResource.addResource("get");
    // Cria o método GET
    getCFResource.addMethod("GET", new LambdaIntegration(cfLambda));

    // Cria lambda edge - Observatory Mozilla F note
    const edgeF = new NodejsFunction(this, "EdgeF", {
      functionName: "EdgeFLambda",
      entry: join(__dirname, "lambda-fns/edge-f/index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
    });
    const edgeFVersion = new Version(this, "EdgeFVersion", {
      lambda: edgeF,
    });
    // Vincula um domínio ao cloudfront (CDN)
    // https://site-f.marciocadev.com/api/get
    // https://site-f.marciocadev.com/
    const cloudfrontFUrl = this.setCloudfrontSubDomain(
      "site-f",
      siteBucket,
      gatewayCloudfront,
      edgeFVersion
    );
    new CfnOutput(this, "MyCloudfrontFUrl", {
      value: cloudfrontFUrl,
      exportName: "my-cloudfront-f-url",
    });

    // Cria lambda edge - Observatory Mozilla D+ note
    const edgeDPlus = new NodejsFunction(this, "EdgeDPlus", {
      functionName: "EdgeDPlusLambda",
      entry: join(__dirname, "lambda-fns/edge-d-plus/index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
    });
    const edgeDPlusVersion = new Version(this, "EdgeDPlusVersion", {
      lambda: edgeDPlus,
    });
    // Vincula um domínio ao cloudfront (CDN)
    // https://site-d-plus.marciocadev.com/api/get
    // https://site-d-plus.marciocadev.com/
    const cloudfrontDPlusUrl = this.setCloudfrontSubDomain(
      "site-d-plus",
      siteBucket,
      gatewayCloudfront,
      edgeDPlusVersion
    );
    new CfnOutput(this, "MyCloudfrontDPlusUrl", {
      value: cloudfrontDPlusUrl,
      exportName: "my-cloudfront-d-plus-url",
    });

    // Cria lambda edge - Observatory Mozilla B- note
    const edgeBMinus = new NodejsFunction(this, "EdgeBMinus", {
      functionName: "EdgeBMinusLambda",
      entry: join(__dirname, "lambda-fns/edge-b-minus/index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
    });
    const edgeBMinusVersion = new Version(this, "EdgeBMinusVersion", {
      lambda: edgeBMinus,
    });
    // Vincula um domínio ao cloudfront (CDN)
    // https://site-b-minus.marciocadev.com/api/get
    // https://site-b-minus.marciocadev.com/
    const cloudfrontBMinusUrl = this.setCloudfrontSubDomain(
      "site-b-minus",
      siteBucket,
      gatewayCloudfront,
      edgeBMinusVersion
    );
    new CfnOutput(this, "MyCloudfrontBMinusUrl", {
      value: cloudfrontBMinusUrl,
      exportName: "my-cloudfront-b-minus-url",
    });

    // Cria lambda edge - Observatory Mozilla B note
    const edgeB = new NodejsFunction(this, "EdgeB", {
      functionName: "EdgeBLambda",
      entry: join(__dirname, "lambda-fns/edge-b/index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
    });
    const edgeBVersion = new Version(this, "EdgeBVersion", {
      lambda: edgeB,
    });
    // Vincula um domínio ao cloudfront (CDN)
    // https://site-b.marciocadev.com/api/get
    // https://site-b.marciocadev.com/
    const cloudfrontBUrl = this.setCloudfrontSubDomain(
      "site-b",
      siteBucket,
      gatewayCloudfront,
      edgeBVersion
    );
    new CfnOutput(this, "MyCloudfrontBUrl", {
      value: cloudfrontBUrl,
      exportName: "my-cloudfront-b-url",
    });

    // Cria lambda edge - Observatory Mozilla A+ note
    const edgeAPlus = new NodejsFunction(this, "EdgeAPlus", {
      functionName: "EdgeAPlusLambda",
      entry: join(__dirname, "lambda-fns/edge-a-plus/index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
    });
    const edgeAPlusVersion = new Version(this, "EdgeAPlusVersion", {
      lambda: edgeAPlus,
    });
    // Vincula um domínio ao cloudfront (CDN)
    // https://site-a-plus.marciocadev.com/api/get
    // https://site-a-plus.marciocadev.com/
    const cloudfrontAPlusUrl = this.setCloudfrontSubDomain(
      "site-a-plus",
      siteBucket,
      gatewayCloudfront,
      edgeAPlusVersion
    );
    new CfnOutput(this, "MyCloudfrontAPlusUrl", {
      value: cloudfrontAPlusUrl,
      exportName: "my-cloudfront-a-plus-url",
    });

    // Cria lambda edge - Observatory Mozilla Best note
    const edge = new NodejsFunction(this, "Edge", {
      functionName: "EdgeLambda",
      entry: join(__dirname, "lambda-fns/edge/index.ts"),
      handler: "handler",
      runtime: Runtime.NODEJS_14_X,
    });
    const edgeVersion = new Version(this, "EdgeVersion", {
      lambda: edge,
    });
    // Vincula um domínio ao cloudfront (CDN)
    // https://site.marciocadev.com/api/get
    // https://site.marciocadev.com/
    const cloudfrontUrl = this.setCloudfrontSubDomain(
      "site",
      siteBucket,
      gatewayCloudfront,
      edgeVersion
    );
    new CfnOutput(this, "MyCloudfrontUrl", {
      value: cloudfrontUrl,
      exportName: "my-cloudfront-url",
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
