import { Construct } from "constructs";
import { TerraformStack } from "cdktf";
import * as aws from "@cdktf/provider-aws";

const PROJECT_NAME="rust-lambda"
const PROJECT_TAGS = {"name": PROJECT_NAME, "provisioner": "cdktf"}

// Stack for setting up S3 and the DynamoDB table for the remote S3Backend
export class RemoteBackendStack extends TerraformStack {
    constructor(scope: Construct, id: string) {
        super(scope, id);
        new aws.provider.AwsProvider(this, "aws", {
            region: "us-east-1",
        })
        new aws.s3Bucket.S3Bucket(this, "cdktf-backends", {
            bucket: "cdktf-backends",
            tags: PROJECT_TAGS
        })
        new aws.dynamodbTable.DynamodbTable(this, "cdktf-remote-backend-lock", {
            name: "cdktf-remote-backend-lock",
            billingMode: "PAY_PER_REQUEST",
            hashKey: "LockID",
            attribute: [
                {
                    name: "LockID",
                    type: "S",
                },
            ],
            tags: PROJECT_TAGS
        })
    }
}

