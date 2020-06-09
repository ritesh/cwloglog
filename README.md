# Implements a test stack that creates EC2 to log rubbish data

This directory has a weird layout to work with nix-env

the outer package.json is to install cdk etc (not globally, within node_modules/.bin). The inner loglog directory has teh actual cdk code

