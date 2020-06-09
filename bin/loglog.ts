#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { LoglogStack } from '../lib/loglog-stack';
import { VpcStack } from '../lib/vpc-stack';

const app = new cdk.App();
const vpcstack = new VpcStack(app, 'VPCStack');
new LoglogStack(app, 'LoglogStack', { vpc: vpcstack.vpc });
