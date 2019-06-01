#!/usr/bin/env node

// Dependencies
const path = require('path'),
      prompts = require('prompts'),
      utils = require('../shared/utils'),
      COLOR = require('../shared/outputColors')

// Constants
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

// Questions
const QUESTIONS = [
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
        message: 'Version being released (e.g. 7.2.0) ?'
    },
    {
        type: 'text',
        name: 'versionCodeReleased',
        message: 'Version code for Android being released (e.g. 64) ?'
    },
    {
        type: 'text',
        name: 'nextVersion',
        message: 'Next version (e.g. 7.3.0) ?'
    },
    {
        type: 'text',
        name: 'nextVersionCode',
        message: 'Next version code for Android (e.g. 65) ?'
    }
]

// Calling start
var config = {}
start()

//
// Main function
//
async function start() {
    config = await prompts(QUESTIONS)

    await validateConfig()

    // Final confirmation
    utils.logParagraph([
        `RELEASING version ${config.versionReleased} (code ${config.versionCodeReleased} on Android)`,
        `Will merge ${config.devBranch} to ${config.masterBranch} on ${config.org}`,
        `Afterwards ${config.devBranch} will be for version ${config.nextVersion} (code ${config.nextVersionCode} on Android)`
    ], COLOR.red)
    const finalConfirmation = await prompts([{type:'confirm',
                                              name:'value',
                                              initial:false,
                                              message:'Are you sure you want to proceed?'}])                                         

     if (!finalConfirmation.value) {
        process.exit(0)
    }
    
    // Release!!
    config.tmpDir = utils.mkTmpDir()
    releaseShared()
    releaseAndroid()
}

//
// Config validation
//
async function validateConfig() {
    if (Object.keys(config).length < QUESTIONS.length) {
        process.exit(0)
    }
    
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
}    

//
// Release function for shared repo
//
function releaseShared() {
    const repo = REPO.shared
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            cloneAndCheckout(repo),
            `git merge --no-ff -m "Mobile SDK ${config.versionReleased}" ${config.devBranch}`,
            `git tag ${config.versionReleased}`,
            `git push origin ${config.masterBranch} --tag`,
            `git checkout ${config.devBranch}`,
            `git pull origin ${config.masterBranch}`,
            `./setVersion.sh -v ${config.nextVersion}`,
            `./tools/update.sh`,
            commitAndPushDev()
        ]
    }
    runCmds(path.join(config.tmpDir, repo), cmds)
}

//
// Release function for android repo
//
function releaseAndroid() {
    const repo = REPO.android
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            cloneAndCheckout(repo),
            `./install.sh`,
            `git merge --no-ff ${config.devBranch}`,
            `./setVersion.sh -v ${config.versionReleased} -c ${config.versionCodeReleased} -d no`,
            {cmd:`git pull origin ${config.masterBranch}`, dir:'external/shared'},
            `git add *`,
            `git commit -m "Mobile SDK ${config.versionReleased}"`,
            `git tag ${config.versionReleased}`,
            `git push origin ${config.masterBranch} --tag`,
            `git checkout ${config.devBranch}`,
            `git pull origin ${config.masterBranch}`,
            `./setVersion.sh -v ${config.nextVersion} -c ${config.nextVersionCode} -d yes`,
            {cmd:`git pull origin ${config.devBranch}`, dir:'external/shared'},
            commitAndPushDev()
        ]
    }
    runCmds(path.join(config.tmpDir, repo), cmds)
}

//
// Helper functions
//
function cloneAndCheckout(repo) {
    return {
        msg: `Cloning ${repo}`,
        cmds: [
            {cmd:`git clone ${urlForRepo(repo)}`, dir:config.tmpDir},
            `git checkout ${config.devBranch}`,
            `git checkout ${config.masterBranch}`
        ]
    }
}

function commitAndPushDev() {
    return {
        msg: `Committing back to ${config.devBranch}`,
        cmds: [
            `git add *`,
            `git commit -m "Merging ${config.masterBranch} back to ${config.devBranch}"`,
            `git push origin ${config.devBranch}`
        ]
    }
}

function runCmds(dir, cmds, depth) {
    if (!depth) {
        utils.logInfo(`=== ${cmds.msg} ===`, COLOR.magenta)
    }

    depth = depth || 1
    const count = cmds.cmds.length
    for (var i=0; i<count; i++) {
        const cmd = cmds.cmds[i]
        if (typeof(cmd) === 'string') {
            runCmd(dir, cmd, i+1, count, depth)
        } else if (cmd.cmd) {
            runCmd(cmd.dir, cmd.cmd, i+1, count, depth)
        } else if (cmd.cmds) {
            print(cmd.msg, i+1, count, depth)
            runCmds(dir, cmd, depth + 1)
        }
    }
}
        
function runCmd(dir, cmd, index, count, depth) {
    print(cmd, index, count, depth)
    // utils.runProcessThrowError(cmd, dir)
}

function print(msg, index, count, depth) {
    const prefix = new Array(depth+1).join("*")
    utils.logInfo(`${prefix} ${index}/${count} ${msg}`, COLOR.green)
}

function urlForRepo(repo) {
    return `git@github.com:${config.org}/${repo}`;
}

/* To cleanup / setup test branches
   git branch -D master2; git push origin :master2
   git branch -D dev2; git push origin :dev2
   git tag -d 7.2.0; git push --delete origin 7.2.0
   git checkout master; git checkout -b master2; git push origin master2
   git checkout dev;    git checkout -b dev2;    git push origin dev2
*/
