import { TerraformOutput } from "cdktf";
import { Construct } from "constructs";
import * as aws from "@cdktf/provider-aws";
import * as random from "@cdktf/provider-random";
import {RdsAurora, RdsAuroraConfig} from "./.gen/modules/rds-aurora";

const PROJECT_TAGS = {"name": "rust-lambda", "provisioner": "cdktf"}

export class RdsStack extends Construct {
  rdsAurora: RdsAurora;
  password: random.password.Password;
  constructor(scope: Construct, name: string) {
    super(scope, name);
    new random.provider.RandomProvider(this, "random", {});
    const password = new random.password.Password(this, "password", {
      length: 20
    })

    this.password = password;

    const vpc = new aws.dataAwsVpc.DataAwsVpc(this, "vpc", {default: true});
    const subnetIds = new aws.dataAwsSubnets.DataAwsSubnets(this, "subnetIds", {
      filter: [{
        name: "vpc-id",
        values: [vpc.id]
      }]
    })
    const rdsAuroraConfig: RdsAuroraConfig = {
        vpcId: vpc.id,
        subnets: subnetIds.ids,
        name: "rust-lambda-aurora",
        engine: "aurora-postgresql",
        engineMode: "serverless",
        masterUsername: "root",
        masterPassword: password.result,
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
        value: rdsAurora.clusterEndpointOutput
    });
    this.rdsAurora = rdsAurora;
  }
}
