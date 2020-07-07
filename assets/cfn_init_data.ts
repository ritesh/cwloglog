const cloudwatch_agent_config = {
    "agent": {
        "logfile": "/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log"
    },
    "logs": {
        //TODO fix this hardcoded URL!
        "endpoint_override": "logs.us-east-2.amazonaws.com",
        "logs_collected": {
            "files": {
                "collect_list": [{
                    "file_path": "/var/log/messages",
                    "log_group_name": "/ec2/instance-logs",
                    "log_stream_name": "{instance_id}-messages",
                    "timezone": "UTC"
                },
                {
                    "file_path": "/var/log/secure",
                    "log_group_name": "/ec2/instance-logs",
                    "log_stream_name": "{instance_id}-secure",
                    "timezone": "UTC"
                },
                {
                    "file_path": "/var/log/gollum",
                    "log_group_name": "/ec2/instance-logs",
                    "log_stream_name": "{instance_id}-gollum",
                    "timezone": "UTC"
                },
                {
                    "file_path": "/var/log/gimli",
                    "log_group_name": "/ec2/instance-logs",
                    "log_stream_name": "{instance_id}-gimli",
                    "timezone": "UTC"
                }
                ]
            }
        }
    }
};
//This sets up the unified cloudwatch logs agent
export let cfn_metadata = {
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
                    "content": JSON.stringify(cloudwatch_agent_config)
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
//Wait until all instances are available, but timeout after 5 mins
export let asg_creation_policy = {
    autoScalingCreationPolicy:
    {
        minSuccessfulInstancesPercent: 100
    },
    resourceSignal: {
        count: 2, timeout: "PT5M"
    }
};

