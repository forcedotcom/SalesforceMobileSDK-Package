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

const DEPTH_PREFIX = {
    1: '=',
    2: '-',
    3: ' ',
    4: ' ',
    5: ' ',
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
    config.tmpDir = utils.mkTmpDir()
    await releaseShared()
    await releaseAndroid()
    await releaseIOS()
    await releaseIOSHybrid()
    await releaseIOSSpecs()
    await releaseCordovaPlugin()
    await releaseReactNative()
    await releaseTemplates()
    await releasePackage()
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
    await releaseRepo(REPO.shared, false /* runInstall */)
}

//
// Release function for android repo (missing: javadoc generation)
//
async function releaseAndroid() {
    await releaseRepo(REPO.android, true /* runInstall */, ['external/shared'])
}

//
// Release function for iOS repo (missing: apple doc generation)
//
async function releaseIOS() {
    await releaseRepo(REPO.ios, true /* runInstall */)
}

//
// Release function for iOS-Hybrid repo
//
async function releaseIOSHybrid() {
    await releaseRepo(REPO.ioshybrid, true /* runInstall */, ['external/shared', 'external/SalesforceMobileSDK-iOS'])
}

//
// Release function for iOS-Specs repo
//
async function releaseIOSSpecs() {
    const repo = REPO.iospecs
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            cloneAndInstall(repo),
            checkoutMasterAndMergeDev(),
            `update.sh -b ${config.masterBranch} -v {config.versionReleased}`,
            commitAndPushMaster()
        ]
    }
    await runCmds(path.join(config.tmpDir, repo), cmds)
}

//
// Release function for CordovaPlugin repo
//
async function releaseCordovaPlugin() {
    await releaseRepo(REPO.cordovaplugin, false /* runInstall */, null, `./tools/update.sh -b ${config.masterBranch}`, `./tools/update.sh -b ${config.devBranch}`)
}

//
// Release function for ReactNative repo
//
async function releaseReactNative() {
    await releaseRepo(REPO.reactnative)
}

//
// Release function for Templates repo
//
async function releaseTemplates() {
    await releaseRepo(REPO.templates)
}

//
// Release function for Package repo
//
async function releasePackage() {
    await releaseRepo(REPO.pkg)
}


//
// Helper functions
//
async function releaseRepo(repo, runInstall, submodulePaths, masterPostMergeCmd, devPostMergeCmd) {
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            cloneAndInstall(repo, runInstall),
            // master
            {
                msg: `Working on ${config.masterBranch}`,
                cmds: [
                    checkoutMasterAndMergeDev(),
                    masterPostMergeCmd,
                    setVersion(config.versionReleased, false, config.versionCodeReleased),
                    updateSubmodules(config.masterBranch, submodulePaths),
                    commitAndPushMaster(),
                    tagMaster()
                ]
            },
            // dev
            {
                msg: `Working on ${config.devBranch}`,
                cmds: [
                    checkoutDevAndMergeMaster(),
                    devPostMergeCmd,
                    setVersion(config.nextVersion, true, config.nextVersionCode),
                    updateSubmodules(config.devBranch, submodulePaths),
                    commitAndPushDev()
                ]
            }
        ]
    }
    await runCmds(path.join(config.tmpDir, repo), cmds)
}

function cloneAndInstall(repo, runInstall) {
    return {
        msg: `Cloning ${repo}`,
        cmds: [
            {cmd:`git clone ${urlForRepo(repo)}`, dir:config.tmpDir},
            runInstall ? 'install.sh' : null,
        ]
    }
}

function checkoutMasterAndMergeDev() {
    return {
        msg: `Merging ${config.devBranch} to ${config.masterBranch}`,
        cmds: [
            `git checkout ${config.devBranch}`,
            `git checkout ${config.masterBranch}`,
            `git merge --no-ff -m "Mobile SDK ${config.versionReleased}" ${config.devBranch}`,
        ]
    }
}

function setVersion(version, isDev, code) {
    return {
        msg: `Running setVersion ${version}`,
        cmds: [
            `./setVersion.sh -v ${version}`  + (isDev != undefined ? ` -d ${isDev}`:'') + (code != undefined ? ` -c ${code}`:'')
        ]
    }
}

function updateSubmodules(branch, submodulePaths) {
    if (submodulePaths == null || submodulePaths.length == 0) return null;

    return {
        msg: `Updating submodules to ${branch}`,
        cmds: submodulePaths.map(path => { return {cmd:`git pull origin ${branch}`, reldir:path} })
    }
}

function commitAndPushMaster() {
    return {
        msg: `Pushing to ${config.masterBranch}`,
        cmds: [
            `git add *`,
            `git commit -m "Mobile SDK ${config.versionReleased}"`,
            `git push origin ${config.masterBranch}`,
        ]
    }
}

function tagMaster() {
    return {
        msg: `Tagging ${config.masterBranch} with ${config.versionReleased}`,
        cmds: [
            `git tag ${config.versionReleased}`,
            `git push origin ${config.masterBranch} --tag`,
        ]
    }
}

function commitAndPushDev() {
    return {
        msg: `Pushing to ${config.devBranch}`,
        cmds: [
            `git add *`,
            `git commit -m "Merging ${config.masterBranch} back to ${config.devBranch}"`,
            `git push origin ${config.devBranch}`
        ]
    }
}

function checkoutDevAndMergeMaster() {
    return {
        msg: `Merging ${config.masterBranch} back to ${config.devBranch}`,
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
            runCmds(dir, cmd, depth + 1)
        }
    }
}

function runCmd(dir, cmd, index, count, depth) {
    print(cmd, index, count, depth)
    try {
        //        utils.runProcessThrowError(cmd, dir)
    } catch (e) {
        process.exit(1);        
    }
}

function print(msg, index, count, depth) {
    const prefix = new Array(2*(depth+1)).join(DEPTH_PREFIX[depth])
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
