#!/usr/bin/env node

const path = require('path');
const execSync = require('child_process').execSync;
console.log('Installing npm dependencies');

const pjson = require(path.join(__dirname, 'sfdx', 'package.json'));

const deps = Object.entries(pjson.dependencies).map(entry => `${entry[0]}@${entry[1]}`);
const devDeps = Object.entries(pjson.devDependencies).map(entry => `${entry[0]}@${entry[1]}`);

execSync(`npm install ${[].concat(...deps).concat(...devDeps).join(' ')}`, {stdio:[0,1,2]});

