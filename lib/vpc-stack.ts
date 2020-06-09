import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

export class VpcStack extends cdk.Stack {
    public readonly vpc: ec2.Vpc;
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const vpc = new ec2.Vpc(this, 'VPC');
        this.vpc = vpc;
        //Add VPC endpoints for access to private EC2 instance
        new ec2.InterfaceVpcEndpoint(this, 'ssm-interface', {
            vpc,
            service: {
                name: `com.amazonaws.${cdk.Aws.REGION}.ssm`,
                port: 443
            }
        });
        new ec2.InterfaceVpcEndpoint(this, 'ssmmessages', {
            vpc,
            service: {
                name: `com.amazonaws.${cdk.Aws.REGION}.ssmmessages`,
                port: 443
            }
        });
        new ec2.InterfaceVpcEndpoint(this, 'ec2messages', {
            vpc,
            service: {
                name: `com.amazonaws.${cdk.Aws.REGION}.ec2messages`,
                port: 443
            }
        });
    }
} 