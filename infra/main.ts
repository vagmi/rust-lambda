import { Construct } from "constructs";
import { App, TerraformOutput, TerraformStack } from "cdktf";
import * as aws from "@cdktf/provider-aws";

const PROJECT_TAGS = {"name": "rust-lambda", "provisioner": "cdktf"}

const lambdaRolePolicy = {
    Version: "2012-10-17",
    Statement: [
        {
            Action: "sts:AssumeRole",
            Principal: {
                Service: "lambda.amazonaws.com",
            },
            Effect: "Allow",
            Sid: "",
        },
    ],
};

class RustLambdaStack extends TerraformStack {
    constructor(scope: Construct, id: string) {
        super(scope, id);
        new aws.provider.AwsProvider(this, "aws", {
            region: "us-east-1",
        })
        // EcrRepository
        const repo = new aws.ecrRepository.EcrRepository(this, "ecr", {name: "rust-lambda", tags:PROJECT_TAGS})
        const role = new aws.iamRole.IamRole(this, "lambda-exec", {
            name: `rust-lambda-exec-${id}`,
            assumeRolePolicy: JSON.stringify(lambdaRolePolicy),
            tags: PROJECT_TAGS
        });
        new aws.iamRolePolicyAttachment.IamRolePolicyAttachment(this, "lambda-exec-policy", {
            role: role.name,
            policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        })

        const lambda = new aws.lambdaFunction.LambdaFunction(this, "rust-lambda", {
            functionName: "rust-lambda",
            packageType: "Image",
            role: role.arn,
            imageUri: `${repo.repositoryUrl}:latest`,
        })

        const apiGw = new aws.apigatewayv2Api.Apigatewayv2Api(this, "api-gw", {
            name: "rust-lambda",
            protocolType: "HTTP",
            target: lambda.arn,
        })

        new aws.lambdaPermission.LambdaPermission(this, "api-gw-lambda", {
            functionName: lambda.functionName,
            action: "lambda:InvokeFunction",
            principal: "apigateway.amazonaws.com",
            sourceArn: `${apiGw.executionArn}/*/*`,
        })
        
        new TerraformOutput(this, "api-gw-url", {
            value: apiGw.apiEndpoint,
        })
    }
}

const app = new App();
new RustLambdaStack(app, "infra");
app.synth();
