import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Loglog from '../lib/loglog-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Loglog.LoglogStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
