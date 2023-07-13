import { TerraformOutput, TerraformStack } from "cdktf";
import { Construct } from "constructs";
import * as aws from "@cdktf/provider-aws";
import {RdsAurora, RdsAuroraConfig} from "./.gen/modules/rds-aurora";

const PROJECT_TAGS = {"name": "rust-lambda", "provisioner": "cdktf"}

export class RdsStack extends TerraformStack {
  rdsAurora: RdsAurora;
  constructor(scope: Construct, name: string, password: string) {
    super(scope, name);
    const vpc = new aws.dataAwsVpc.DataAwsVpc(this, "vpc", {default: true});
    const subnetIds = new aws.dataAwsSubnetIds.DataAwsSubnetIds(this, "subnetIds", {vpcId: vpc.id});
    const rdsAuroraConfig: RdsAuroraConfig = {
        vpcId: vpc.id,
        subnets: subnetIds.ids,
        name: "rust-lambda-aurora",
        engine: "aurora-postgresql",
        engineMode: "serverless",
        masterUsername: "root",
        masterPassword: password,
        applyImmediately: true,
        storageEncrypted: true,
        monitoringInterval: 60,
        
        scalingConfiguration: {
            autoPause: 'true',
            maxCapacity: '2',
            secondsUntilAutoPause: '300',
            timeoutAction: "ForceApplyCapacityChange",
        },


        tags: PROJECT_TAGS
    }
    const rdsAurora = new RdsAurora(this, "rdsAurora", rdsAuroraConfig);
    new TerraformOutput(this, "rds-aurora-endpoint", {
        value: rdsAurora.endpoints,
    });
    this.rdsAurora = rdsAurora;
  }
}
