import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Loglog from '../lib/loglog-stack';
import * as VPCStack from '../lib/vpc-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const vpc = new VPCStack.VpcStack(app, 'vpc');
  const stack = new Loglog.LoglogStack(app, 'MyTestStack', { vpc: vpc.vpc });
  // THEN
  expectCDK(stack).to(matchTemplate({
    "Resources": {}
  }, MatchStyle.EXACT))
});
