import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as logs from '@aws-cdk/aws-logs';
import * as iam from '@aws-cdk/aws-iam';
import * as autoscaling from '@aws-cdk/aws-autoscaling';
import { cfn_metadata, asg_creation_policy } from '../assets/cfn_init_data'
import { RemovalPolicy } from '@aws-cdk/core';
import * as cloudwatch from '@aws-cdk/aws-cloudwatch';


interface LogLogStackProps extends cdk.StackProps {
	vpc: ec2.IVpc;
}
export class LoglogStack extends cdk.Stack {
	constructor(scope: cdk.Construct, id: string, props: LogLogStackProps) {
		super(scope, id, props);
		const vpc = props.vpc;
		const logasg = new autoscaling.AutoScalingGroup(this, 'fooasg', {
			vpc,
			instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
			machineImage: new ec2.AmazonLinuxImage({ generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2 }), // get the latest Amazon Linux image,
			desiredCapacity: 3
		});
		const asgResource = logasg.node.defaultChild as autoscaling.CfnAutoScalingGroup;
		logasg.addUserData('#!/bin/bash', 'yum -y upgrade', `rpm -Uvh https://s3.${cdk.Aws.REGION}.amazonaws.com/amazoncloudwatch-agent-${cdk.Aws.REGION}/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm`,
			`/opt/aws/bin/cfn-init -v --stack ${cdk.Aws.STACK_NAME} --resource ${asgResource.logicalId} --region ${cdk.Aws.REGION} --configsets default`,
			`/opt/aws/bin/cfn-signal -e $? --stack ${cdk.Aws.STACK_NAME} --resource ${asgResource.logicalId} --region ${cdk.Aws.REGION}`);
		//required for cwl 
		logasg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
		//Required for SSM to be able to connect
		logasg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

		//Taken from here: https://raw.githubusercontent.com/awslabs/aws-cloudformation-templates/master/aws/solutions/AmazonCloudWatchAgent/inline/amazon_linux.template
		//The metadata itself is in ../assets/cfn_init_data.ts to keep this file tidy
		const cfn_loglog = logasg.node.defaultChild as ec2.CfnInstance;
		cfn_loglog.cfnOptions.creationPolicy = asg_creation_policy;
		cfn_loglog.cfnOptions.metadata = cfn_metadata;
		const logGroup = new logs.LogGroup(this, '/ec2/instance-logs/', {
			retention: logs.RetentionDays.ONE_DAY,
			logGroupName: '/ec2/instance-logs',
			removalPolicy: RemovalPolicy.DESTROY
		});

		const add_user_metric = new cloudwatch.Metric({
			namespace: "SecOps Metrics",
			metricName: "UsersAdded"
		})
		//TODO refactor this into a filters and metrics stack that takes
		//A log group as a parameter
		//and generates filters on this
		new logs.MetricFilter(this, 'AddedUsersEc2', {
			logGroup: logGroup,
			filterPattern: logs.FilterPattern.anyTerm('useradd', 'useradd', 'addgroup'),
			metricName: add_user_metric.metricName,
			metricNamespace: add_user_metric.namespace,
			metricValue: "1"
		});

		new cloudwatch.Alarm(this, "UserAddedAlarm", {
			evaluationPeriods: 1,
			statistic: "sum",
			metric: add_user_metric,
			treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
			threshold: 1,
			period: cdk.Duration.minutes(5)
		})
	}
}
