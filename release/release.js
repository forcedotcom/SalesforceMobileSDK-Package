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
    ioshybrid: 'SalesforceMobileSDK-iOS-Hybrid',
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

    validateConfig()

    // Final confirmation
    utils.logParagraph([
        `RELEASING version ${config.versionReleased} (code ${config.versionCodeReleased} on Android)`,
        `Will merge ${config.devBranch} to ${config.masterBranch} on ${config.org}`,
        `Afterwards ${config.devBranch} will be for version ${config.nextVersion} (code ${config.nextVersionCode} on Android)`
    ], COLOR.magenta)
    if (!await proceedPrompt()) {
        process.exit(0)
    }
    
    // Release!!
    utils.setExitOnFailure(true)
    config.tmpDir = utils.mkTmpDir()
    await releaseShared()
    await releaseAndroid()
    await releaseIOS()
    await releaseIOSHybrid()
}

//
// Config validation
//
function validateConfig() {
    if (Object.keys(config).length < QUESTIONS.length) {
        process.exit(0)
    }
}    

//
// Proceed prompt
async function proceedPrompt() {
    const confirmation = await prompts([{type:'confirm',
                                              name:'value',
                                              initial:false,
                                              message:'Are you sure you want to proceed?'}])                                         

    return confirmation.value
}

//
// Release function for shared repo
//
async function releaseShared() {
    const repo = REPO.shared
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            cloneAndCheckout(repo),
            mergeDevToMaster(),
            commitTagAndPushMaster(),
            checkoutDevAndPullMaster(),
            `./setVersion.sh -v ${config.nextVersion}`,
            `./tools/update.sh`,
            commitAndPushDev()
        ]
    }
    await runCmds(path.join(config.tmpDir, repo), cmds)
}

//
// Release function for android repo (missing: javadoc generation)
//
async function releaseAndroid() {
    const repo = REPO.android
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            cloneAndCheckout(repo),
            `./install.sh`,
            mergeDevToMaster(),
            `./setVersion.sh -v ${config.versionReleased} -c ${config.versionCodeReleased} -d no`,
            updateSubmodules(config.masterBranch, ['external/shared']),
            commitTagAndPushMaster(),
            checkoutDevAndPullMaster(),
            `./setVersion.sh -v ${config.nextVersion} -c ${config.nextVersionCode} -d yes`,
            updateSubmodules(config.devBranch, ['external/shared']),
            commitAndPushDev()
        ]
    }
    await runCmds(path.join(config.tmpDir, repo), cmds)
}

//
// Release function for iOS repo (missing: apple doc generation)
//
async function releaseIOS() {
    const repo = REPO.ios
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            cloneAndCheckout(repo),
            `./install.sh`,
            mergeDevToMaster(),
            `./setVersion.sh -v ${config.versionReleased} -d no`,
            commitTagAndPushMaster(),
            checkoutDevAndPullMaster(),
            `./setVersion.sh -v ${config.nextVersion} -d yes`,
            commitAndPushDev()
        ]
    }
    await runCmds(path.join(config.tmpDir, repo), cmds)
}

//
// Release function for iOS-Hybrid repo
//
async function releaseIOSHybrid() {
    const repo = REPO.ioshybrid
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            cloneAndCheckout(repo),
            `./install.sh`,
            mergeDevToMaster(),
            updateSubmodules(config.masterBranch, ['external/shared', 'external/SalesforceMobileSDK-iOS']),
            commitTagAndPushMaster(),
            checkoutDevAndPullMaster(),
            `./setVersion.sh -v ${config.nextVersion}`,
            updateSubmodules(config.devBranch, ['external/shared', 'external/SalesforceMobileSDK-iOS']),
            commitAndPushDev()
        ]
    }
    await runCmds(path.join(config.tmpDir, repo), cmds)
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

function mergeDevToMaster() {
    return {
        msg: `Merging ${config.devBranch} to ${config.masterBranch}`,
        cmds: [
            `git merge --no-ff -m "Mobile SDK ${config.versionReleased}" ${config.devBranch}`,
        ]
    }
}

function updateSubmodules(branch, submodulePaths) {
    return {
        msg: `Updating submodules to ${branch}`,
        cmds: submodulePaths.map(path => { return {cmd:`git pull origin ${branch}`, reldir:path} })
    }
}

function commitTagAndPushMaster(commit) {
    return {
        msg: `Committing and tagging ${config.masterBranch}`,
        cmds: [
            commit ? `git add *` : null,
            commit ? `git commit -m "Mobile SDK ${config.versionReleased}"` : null,
            `git tag ${config.versionReleased}`,
            `git push origin ${config.masterBranch} --tag`,
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

function checkoutDevAndPullMaster() {
    return {
        msg: `Back to ${config.devBranch}`,
        cmds: [
            `git checkout ${config.devBranch}`,
            `git pull origin ${config.masterBranch}`
        ]
    }
}

async function runCmds(dir, cmds, depth) {
    if (!depth) {
        utils.logInfo(`\n=== ${cmds.msg} ===`, COLOR.magenta)
        if (!await proceedPrompt()) {
            return
        }
    }

    depth = depth || 1
    cmds.cmds = cmds.cmds.filter(x => !!x)
    const count = cmds.cmds.length
    for (var i=0; i<count; i++) {
        const cmd = cmds.cmds[i]
        if (typeof(cmd) === 'string') {
            runCmd(dir, cmd, i+1, count, depth)
        } else if (cmd.cmd) {
            runCmd(cmd.dir || path.join(dir, cmd.reldir), cmd.cmd, i+1, count, depth)
        } else if (cmd.cmds) {
            print(cmd.msg, i+1, count, depth)
            if (!await proceedPrompt()) {
                return
            }
            runCmds(dir, cmd, depth + 1)
        }
    }
}
        
function runCmd(dir, cmd, index, count, depth) {
    print(cmd, index, count, depth)
    utils.runProcessCatchError(cmd, cmd, dir)
}

function print(msg, index, count, depth) {
    const prefix = new Array(depth+1).join("*")
    utils.logInfo(`${prefix} ${index}/${count} ${msg}`, COLOR.green)
}

function urlForRepo(repo) {
    return `git@github.com:${config.org}/${repo}`;
}
 
/* To cleanup / setup test branches

   git checkout master
   git branch -D master2; git push origin :master2
   git branch -D dev2; git push origin :dev2
   git tag -d 7.2.0; git push --delete origin 7.2.0
   git checkout master; git checkout -b master2; git push origin master2
   gsed -i "s/forcedotcom/wmathurin/g" .gitmodules
   git add .gitmodules
   git commit -m "Pointing to fork"
   git push origin master2
   git checkout dev;    git checkout -b dev2;    git push origin dev2
   gsed -i "s/forcedotcom/wmathurin/g" .gitmodules
   git add .gitmodules
   git commit -m "Pointing to fork"
   git push origin dev2

*/
