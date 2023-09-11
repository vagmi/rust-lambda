import { Construct } from "constructs";
import { App, S3Backend, TerraformOutput, TerraformStack } from "cdktf";
import * as aws from "@cdktf/provider-aws";
import { RemoteBackendStack } from "./backend";
import { RdsStack } from "./rds-stack";
import { EcrRepository } from "@cdktf/provider-aws/lib/ecr-repository";

const PROJECT_NAME="rust-lambda"

const PROJECT_TAGS = {"name": PROJECT_NAME, "provisioner": "cdktf"}

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

class EcrStack extends TerraformStack {
    repo: EcrRepository
    constructor(scope: Construct, id: string) {
        super(scope, id);
        new aws.provider.AwsProvider(this, "aws", {
            region: "us-east-1",
        });
        new S3Backend(this, {
            bucket: "cdktf-backends",
            key: `${PROJECT_NAME}/ecr/terraform.tfstate`,
            region: "us-east-1",
            encrypt: true,
            dynamodbTable: "cdktf-remote-backend-lock",
        });
        this.repo = new aws.ecrRepository.EcrRepository(this, "ecr", {
            name: PROJECT_NAME, 
            forceDelete: true,
            tags:PROJECT_TAGS
        })
    }
}

class RustLambdaStack extends TerraformStack {
    constructor(scope: Construct, id: string, repoUrl: string) {
        super(scope, id);
        new aws.provider.AwsProvider(this, "aws", {
            region: "us-east-1",
        })

        const role = new aws.iamRole.IamRole(this, "lambda-exec", {
            name: `${PROJECT_NAME}-exec-${id}`,
            assumeRolePolicy: JSON.stringify(lambdaRolePolicy),
            tags: PROJECT_TAGS
        });

        new aws.iamRolePolicyAttachment.IamRolePolicyAttachment(this, "lambda-exec-policy", {
            role: role.name,
            policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        });
        new aws.iamRolePolicyAttachment.IamRolePolicyAttachment(this, "lambda-vpc-exec-policy", {
            role: role.name,
            policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
        });

        const defaultVpc = new aws.dataAwsVpc.DataAwsVpc(this, "vpc", {default: true})
        const defaultSubnets = new aws.dataAwsSubnets.DataAwsSubnets(this, "subnets", {
            filter: [{
                name: "vpc-id",
                values: [defaultVpc.id]
            }]
        })
        
        const defaultSG = new aws.dataAwsSecurityGroup.DataAwsSecurityGroup(this, "default-security-group", {
            vpcId: defaultVpc.id,
            filter: [{
                name: "group-name",
                values: ["default"]
            }]
        })

        const commitSha = process.env.COMMIT_SHA || "latest"
        const rdsStack = new RdsStack(this, "rds-stack")
        
        const lambda = new aws.lambdaFunction.LambdaFunction(this, PROJECT_NAME, {
            functionName: PROJECT_NAME,
            packageType: "Image",
            role: role.arn,
            imageUri: `${repoUrl}:${commitSha}`,
            vpcConfig: {
                subnetIds: defaultSubnets.ids,
                securityGroupIds: [rdsStack.rdsAurora.securityGroupIdOutput, defaultSG.id]
            },
            environment: {
                variables: {
                    "DATABASE_URL": `postgres://root:${rdsStack.password.result}@${rdsStack.rdsAurora.clusterEndpointOutput}:5432/postgres?sslmode=disable`,
                    "COMMIT_SHA": commitSha
                }
            }
        })

        const apiGw = new aws.apigatewayv2Api.Apigatewayv2Api(this, "api-gw", {
            name: PROJECT_NAME,
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

        new TerraformOutput(this, "rds-aurora-endpoint", {
            value: rdsStack.rdsAurora.clusterEndpointOutput
        });
        new S3Backend(this, {
            bucket: "cdktf-backends",
            key: `${PROJECT_NAME}/infra/terraform.tfstate`,
            region: "us-east-1",
            encrypt: true,
            dynamodbTable: "cdktf-remote-backend-lock",
        })
    }
}

const app = new App();
const ecrStack = new EcrStack(app, "ecr");
const lambdaStack = new RustLambdaStack(app, "infra", ecrStack.repo.repositoryUrl);
new RemoteBackendStack(app, "remote-backend");

lambdaStack.addDependency(ecrStack);

app.synth();
