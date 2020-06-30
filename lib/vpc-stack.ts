import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import { FlowLog, FlowLogResourceType, FlowLogTrafficType } from '@aws-cdk/aws-ec2';

export class VpcStack extends cdk.Stack {
    public readonly vpc: ec2.Vpc;
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const vpc = new ec2.Vpc(this, 'VPC', {
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'priv-subnet-1',
                    subnetType: ec2.SubnetType.ISOLATED
                },
                {
                    cidrMask: 24,
                    name: 'priv-subnet-2',
                    subnetType: ec2.SubnetType.ISOLATED
                },
                {
                    cidrMask: 24,
                    name: 'priv-subnet-3',
                    subnetType: ec2.SubnetType.ISOLATED
                }
            ],
        });
        this.vpc = vpc;

        new ec2.InterfaceVpcEndpoint(this, 'cloudformation', {
            vpc,
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDFORMATION
        });

        new ec2.InterfaceVpcEndpoint(this, 'ssm-interface', {
            vpc,
            service: ec2.InterfaceVpcEndpointAwsService.SSM
        });

        new ec2.InterfaceVpcEndpoint(this, 'ssmmessages', {
            vpc,
            service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES
        });

        new ec2.InterfaceVpcEndpoint(this, 'autoscaling', {
            vpc,
            service: {
                name: `com.amazonaws.${cdk.Aws.REGION}.autoscaling`,
                port: 443
            }
        });
        new ec2.InterfaceVpcEndpoint(this, 'ec2messages', {
            vpc,
            service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES
        });
        //TODO add policy
        new ec2.GatewayVpcEndpoint(this, 's3', {
            vpc,
            service: ec2.GatewayVpcEndpointAwsService.S3

        })
        new ec2.GatewayVpcEndpoint(this, 'ddb', {
            vpc,
            service: ec2.GatewayVpcEndpointAwsService.DYNAMODB
        })
    }
} 