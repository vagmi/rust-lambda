import { TerraformOutput } from "cdktf";
import { Construct } from "constructs";
import * as aws from "@cdktf/provider-aws";
import * as random from "@cdktf/provider-random";
import {RdsAurora, RdsAuroraConfig} from "./.gen/modules/rds-aurora";

const PROJECT_NAME = "rust-lambda"
const PROJECT_TAGS = {"name": PROJECT_NAME, "provisioner": "cdktf"}

export class RdsStack extends Construct {
    rdsAurora: RdsAurora;
    password: random.password.Password;
    constructor(scope: Construct, name: string) {
        super(scope, name);
        new random.provider.RandomProvider(this, "random", {});
        const password = new random.password.Password(this, "password", {
            length: 20,
            special: false
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
            createDbSubnetGroup: true,
            publiclyAccessible: true,
            autoscalingEnabled: true,
            name: `${PROJECT_NAME}-aurora`,
            engine: "aurora-postgresql",
            engineMode: "serverless",
            masterUsername: "root",
            masterPassword: password.result,
            manageMasterUserPassword: false,
            applyImmediately: true,
            storageEncrypted: true,
            monitoringInterval: 60,
            autoscalingMinCapacity: 2,
            autoscalingMaxCapacity: 8,
            skipFinalSnapshot: true,
            scalingConfiguration: {
                auto_pause: 'true',
                min_capacity: '2',
                max_capacity: '8',
                second_until_auto_pause: '300',
                timeout_action: "ForceApplyCapacityChange",
            },
            securityGroupRules: [
                {
                    cidr_blocks: ["0.0.0.0/0"],
                }
            ],
            enableHttpEndpoint: true,
            tags: PROJECT_TAGS
        }
        const rdsAurora = new RdsAurora(this, "rdsAurora", rdsAuroraConfig);

        console.log('scaling configuration', rdsAurora.scalingConfiguration)

        new TerraformOutput(this, "rds-aurora-endpoint", {
            value: rdsAurora.clusterEndpointOutput
        });
        this.rdsAurora = rdsAurora;
    }
}
