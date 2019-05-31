#!/usr/bin/env node

// Dependencies
const spawnSync = require('child_process').spawnSync,
      path = require('path'),
      shelljs = require('shelljs'),
      prompts = require('prompts')
      utils = require('../shared/utils'),
      templateHelper = require('../shared/templateHelper.js'),
      SDK = require('../shared/constants'),
      COLOR = require('../shared/outputColors')

const REPO = {
    shared: 'SalesforceMobileSDK-Shared',
    android: 'SalesforceMobileSDK-Android',
    ios: 'SalesforceMobileSDK-iOS',
    ioshybrid: 'SalesforceMobileSDK-iOS',
    iospecs: 'SalesforceMobileSDK-iOS-Specs',
    cordovaplugin: 'SalesforceMobileSDK-CordovaPlugin',
    reactnative: 'SalesforceMobileSDK-ReactNative',
    templates: 'SalesforceMobileSDK-Templates',
    pkg: 'SalesforceMobileSDK-Package'
}

// Calling start
var config = {}
start()

//
// Main function
//
async function start() {
    config = await prompts([
        {
            type: 'text',
            name: 'org',
            message: 'Organization (e.g. forcedotcom) ?'
        },
        {
            type: 'text',
            name: 'masterBranch',
            message: 'Release branch (e.g. master) ?'
        },
        {
            type: 'text',
            name: 'devBranch',
            message: 'Development branch (e.g. dev) ?'
        },
        {
            type: 'text',
            name: 'versionReleased',
            message: 'Version being released (e.g. 7.5.0) ?'
        },
        {
            type: 'text',
            name: 'versionCodeReleased',
            message: 'Version code for Android being released (e.g. 64) ?'
        },
        {
            type: 'text',
            name: 'nextVersion',
            message: 'Next version (e.g. 7.6.0) ?'
        },
        {
            type: 'text',
            name: 'nextVersionCode',
            message: 'Next version code for Android (e.g. 65) ?'
        }
    ])

    
    // Extra confirmation step for forcedotcom
    if (config.org === 'forcedotcom') {
        const confirmation = await prompts([{type:'confirm',
                                             name:'value',
                                             initial:false,
                                             message:'Are you sure you want to run the script against forcedotcom?'}])
        if (!confirmation.value) {
            process.exit(0)
        }
    }

    // Final confirmation
    utils.logParagraph([
        `RELEASING version ${config.versionReleased} (code ${config.versionCodeReleased} on Android)`,
        `Will merge ${config.devBranch} to ${config.masterBranch} on ${config.org}`,
        `Afterwards ${config.devBranch} will be for version ${config.nextVersion} (code ${config.nextVersionCode} on Android)`
    ])
    const finalConfirmation = await prompts([{type:'confirm',
                                              name:'value',
                                              initial:false,
                                              message:'Are you sure you want to proceed?'}])                                         
    if (!finalConfirmation.value) {
        process.exit(0)
    }

    
    config.tmpDir = utils.mkTmpDir()

    // Release!!
    releaseShared()
}

//
// Release function for shared repo
//
function releaseShared() {
    utils.logInfo(`* PROCESSING ${REPO.shared}`)
    cloneAndRun(REPO.shared, [
        `git fetch origin ${config.masterBranch}`,
        `git fetch origin ${config.devBranch}`,
        `git checkout ${config.masterBranch}`,
        `git merge --no-ff -m "Mobile SDK ${config.versionReleased}"" ${config.devBranch}`,
        `git push origin ${config.masterBranch}`,
        `git checkout ${config.devBranch}`,
        `git pull origin ${config.masterBranch}`,
        `git setVersion.sh -v ${config.nextVersion}`,
        `./tools/update.sh`,
        `git add *`,
        `git commit -m "Merging ${config.masterBranch} back to ${config.devBranch}"`,
        `git push origin ${config.devBranch}`
    ])
}

//
// Helper functions
//
function cloneAndRun(repo, cmds) {
    run(1, cmds.length+1, `git clone ${urlForRepo(repo)}`, config.tmpDir)
    const repoDir = path.join(config.tmpDir, repo)
    for (i=0; i<cmds.length; i++) {
        run(i+2, cmds.length+1, cmds[i], repoDir)
    }
}

function run(index, count, cmd, dir) {
        utils.logInfo(`** ${index}/${count} ${cmd}`)
//        utils.runProcessThrowError(cmd, dir)
}

function urlForRepo(repo) {
    return `git@github.com:${config.org}/${repo}`;
}

