#!/usr/bin/env node

var execSync = require('child_process').execSync;
console.log('Installing npm dependencies');
execSync('npm install shelljs@0.7.0', {stdio:[0,1,2]});
execSync('npm install @oclif/command@^1', {stdio:[0,1,2]});
execSync('npm install @oclif/config@^1', {stdio:[0,1,2]});
execSync('npm install @salesforce/core@^1.0.1', {stdio:[0,1,2]});
