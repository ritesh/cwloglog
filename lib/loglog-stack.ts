import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as logs from '@aws-cdk/aws-logs';
import * as iam from '@aws-cdk/aws-iam';
import * as autoscaling from '@aws-cdk/aws-autoscaling';
import { Duration, AssetStaging } from '@aws-cdk/core';
import { UpdateType } from '@aws-cdk/aws-autoscaling';


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

		logasg.addUserData('#!/bin/bash', 'rpm -Uvh https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm',
			`/opt/aws/bin/cfn-init -v --stack ${cdk.Aws.STACK_NAME} --resource ${asgResource.logicalId} --region ${cdk.Aws.REGION} --configsets default`,
			`/opt/aws/bin/cfn-signal -e $? --stack ${cdk.Aws.STACK_NAME} --resource ${asgResource.logicalId} --region ${cdk.Aws.REGION}`);
		logasg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
		//Required for SSM to be able to connect
		logasg.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

		//Borrowed from here: https://raw.githubusercontent.com/awslabs/aws-cloudformation-templates/master/aws/solutions/AmazonCloudWatchAgent/inline/amazon_linux.template
		//A bit sad in terms of the json file, but will fix in later versions
		const cfn_loglog = logasg.node.defaultChild as ec2.CfnInstance;
		cfn_loglog.cfnOptions.creationPolicy =
		{
			autoScalingCreationPolicy:
			{
				minSuccessfulInstancesPercent: 100
			},
			resourceSignal: {
				count: 2, timeout: "PT5M"
			}
		};
		cfn_loglog.cfnOptions.metadata = {
			"AWS::CloudFormation::Init": {
				"configSets": {
					"default": [
						"01_setupCfnHup",
						"02_config-amazon-cloudwatch-agent",
						"03_restart_amazon-cloudwatch-agent"
					],
					"UpdateEnvironment": [
						"02_config-amazon-cloudwatch-agent",
						"03_restart_amazon-cloudwatch-agent"
					]
				},
				"02_config-amazon-cloudwatch-agent": {
					"files": {
						"/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json": {
							"content": {
								"Fn::Sub": "{\r\n \t\"agent\": {\r\n \t\t\"logfile\": \"\/opt\/aws\/amazon-cloudwatch-agent\/logs\/amazon-cloudwatch-agent.log\"\r\n \t},\r\n \t\"logs\": {\r\n \t\t\"logs_collected\": {\r\n \t\t\t\"files\": {\r\n \t\t\t\t\"collect_list\": [{\r\n \t\t\t\t\t\t\"file_path\": \"\/var\/log\/messages\",\r\n \t\t\t\t\t\t\"log_group_name\": \"\/ec2\/instance-logs\",\r\n \t\t\t\t\t\t\"log_stream_name\": \"{instance_id}-messages\",\r\n \t\t\t\t\t\t\"timezone\": \"UTC\"\r\n \t\t\t\t\t},\r\n \t\t\t\t\t{\r\n \t\t\t\t\t\t\"file_path\": \"\/var\/log\/secure\",\r\n \t\t\t\t\t\t\"log_group_name\": \"\/ec2\/instance-logs\",\r\n \t\t\t\t\t\t\"log_stream_name\": \"{instance_id}-secure\",\r\n \t\t\t\t\t\t\"timezone\": \"UTC\"\r\n \t\t\t\t\t}\r\n \t\t\t\t]\r\n \t\t\t}\r\n \t\t}\r\n \t}\r\n }"
							}
						}
					}
				},
				"03_restart_amazon-cloudwatch-agent": {
					"commands": {
						"01_stop_service": {
							"command": "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a stop"
						},
						"02_start_service": {
							"command": "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s"
						}
					}
				},
				"01_setupCfnHup": {
					"files": {
						"/etc/cfn/cfn-hup.conf": {
							"content": {
								"Fn::Sub": "[main]\nstack=${AWS::StackId}\nregion=${AWS::Region}\ninterval=1\n"
							},
							"mode": "000400",
							"owner": "root",
							"group": "root"
						},
						"/etc/cfn/hooks.d/amazon-cloudwatch-agent-auto-reloader.conf": {
							"content": {
								"Fn::Sub": "[cfn-auto-reloader-hook]\ntriggers=post.update\npath=Resources.EC2Instance.Metadata.AWS::CloudFormation::Init.02_config-amazon-cloudwatch-agent\naction=/opt/aws/bin/cfn-init -v --stack ${AWS::StackId} --resource EC2Instance --region ${AWS::Region} --configsets UpdateEnvironment\nrunas=root\n"
							},
							"mode": "000400",
							"owner": "root",
							"group": "root"
						},
						"/lib/systemd/system/cfn-hup.service": {
							"content": {
								"Fn::Sub": "[Unit]\nDescription=cfn-hup daemon\n[Service]\nType=simple\nExecStart=/opt/aws/bin/cfn-hup\nRestart=always\n[Install]\nWantedBy=multi-user.target\n"
							}
						}
					},
					"commands": {
						"01enable_cfn_hup": {
							"command": {
								"Fn::Sub": "systemctl enable cfn-hup.service\n"
							}
						},
						"02start_cfn_hup": {
							"command": {
								"Fn::Sub": "systemctl start cfn-hup.service\n"
							}
						}
					}
				}
			}
		};
		const logGroup = new logs.LogGroup(this, '/ec2/instance-logs/', {
			retention: logs.RetentionDays.ONE_WEEK,
			logGroupName: '/ec2/instance-logs'
		});
	}
}