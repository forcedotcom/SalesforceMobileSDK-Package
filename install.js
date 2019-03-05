#!/usr/bin/env node

const path = require('path');
const execSync = require('child_process').execSync;
console.log('Installing npm dependencies');

const pjson = require(path.join(__dirname, 'sfdx', 'package.json'));

let deps = [];
if (pjson.dependencies) {
  deps = Object.entries(pjson.dependencies).map(entry => `${entry[0]}@${entry[1]}`);
}

let devDeps = [];
if (pjson.devDependencies) {
  devDeps = Object.entries(pjson.devDependencies).map(entry => `${entry[0]}@${entry[1]}`);
}
const oclifDevCli = devDeps.find((element) => element.includes('@oclif/dev-cli'));

if (oclifDevCli) {
  // This is needed globally so the npm prepare script runs during the tests.
  execSync(`npm install ${oclifDevCli} -g`);
}

execSync(`npm install ${[].concat(...deps).concat(...devDeps).join(' ')}`, {stdio:[0,1,2]});

