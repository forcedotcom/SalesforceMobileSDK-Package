#!/usr/bin/env node

const path = require('path')
const execSync = require('child_process').execSync
console.log('Installing npm dependencies')

let deps = []
for (let dir of ['sfdx', 'release'].values()) {
    const pjson = require(path.join(__dirname, dir, 'package.json'))
    if (pjson.dependencies) {
        deps = deps.concat(Object.entries(pjson.dependencies).map(entry => `${entry[0]}@${entry[1]}`))
    }

    if (pjson.devDependencies) {
        deps = deps.concat(Object.entries(pjson.devDependencies).map(entry => `${entry[0]}@${entry[1]}`))
    }
}

execSync(`npm install ${deps.join(' ')}`, {stdio:[0,1,2]})

