#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { LoglogStack } from '../lib/loglog-stack';

const app = new cdk.App();
new LoglogStack(app, 'LoglogStack');
