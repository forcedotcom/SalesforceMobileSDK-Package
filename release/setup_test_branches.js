#!/usr/bin/env node
/*
 * Copyright (c) 2019-present, salesforce.com, inc.
 * All rights reserved.
 * Redistribution and use of this software in source and binary forms, with or
 * without modification, are permitted provided that the following conditions
 * are met:
 * - Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * - Neither the name of salesforce.com, inc. nor the names of its contributors
 * may be used to endorse or promote products derived from this software without
 * specific prior written permission of salesforce.com, inc.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

// Dependencies
const path = require('path'),
      prompts = require('prompts'),
      utils = require('../shared/utils'),
      COLOR = require('../shared/outputColors'),
      proceedPrompt = require('./common.js').proceedPrompt,
      runCmds = require('./common.js').runCmds,
      cloneOrClean = require('./common.js').cloneOrClean,
      setAutoYesForPrompts = require('./common.js').setAutoYesForPrompts,
      REPO = require('./common.js').REPO,
      VERSION = require('../shared/constants.js').version

// Default values for prompt
const tmpDirDefault = "generate-new-dir"
const testOrgDefault = "wmathurin"
const testMasterBranchDefault = "master2"
const testDevBranchDefault = "dev2"
const testDocBranchDefault = "gh-pages2"
const testVersionDefault = VERSION

const templatesPackageJsons = [
    './AndroidIDPTemplate/package.json',
    './AndroidNativeKotlinTemplate/package.json',
    './AndroidNativeLoginTemplate/package.json',
    './AndroidNativeTemplate/package.json',
    './HybridLocalTemplate/package.json',
    './HybridLwcTemplate/package.json',
    './HybridRemoteTemplate/package.json',
    './MobileSyncExplorerKotlinTemplate/package.json',
    './MobileSyncExplorerReactNative/package.json',
    './MobileSyncExplorerSwift/package.json',
    './ReactNativeDeferredTemplate/package.json',
    './ReactNativeTemplate/package.json',
    './ReactNativeTypeScriptTemplate/package.json',
    './iOSIDPTemplate/package.json',
    './iOSNativeLoginTemplate/package.json',
    './iOSNativeSwiftEncryptedNotificationTemplate/package.json',
    './iOSNativeSwiftPackageManagerTemplate/package.json',
    './iOSNativeSwiftTemplate/package.json',
    './iOSNativeTemplate/package.json'
]

// Questions
const QUESTIONS = [
    {
        type: 'text',
        name: 'tmpDir',
        message: 'Work directory ?',
        initial: tmpDirDefault
    },
    {
        type: 'text',
        name: 'testOrg',
        message: 'Organization ?',
        initial: testOrgDefault
    },
    {
        type: 'text',
        name: 'testMasterBranch',
        message: 'Name of test master branch ?',
        initial: testMasterBranchDefault
    },
    {
        type: 'text',
        name: 'testDevBranch',
        message: 'Name of test dev branch ?',
        initial: testDevBranchDefault
    },
    {
        type: 'text',
        name: 'testDocBranch',
        message: 'Name of test doc branch ?',
        initial: testDocBranchDefault
    },
    {
        type: 'text',
        name: 'testVersion',
        message: `Name of test version ?`,
        initial: testVersionDefault
    },
    {
        type:'confirm',
        name: 'cleanupOnly',
        message: `Cleanup only?`,
        initial: false
    },
    {
        type:'confirm',
        name: 'autoYesForPrompts',
        message: `Automatically answer yes to all prompts?`,
        initial: false
    }
]

// Calling start
utils.setLogLevel(utils.LOG_LEVELS.DEBUG)
var config = {}
start()

//
// Main function
//
async function start() {
    config = await prompts(QUESTIONS)

    validateConfig()
    setAutoYesForPrompts(config.autoYesForPrompts)

    // Final confirmation
    utils.logParagraph([
        ` SETTING UP TEST BRANCHES FOR RELEASE TESTING `,
        ``,
        `Will drop ${config.testMasterBranch} ` + (config.cleanupOnly ? "" : `and recreate it off of master on all repos in ${config.testOrg}`),
        `Will drop ${config.testDevBranch} ` + (config.cleanupOnly ? "" : `and recreate it off of dev on all applicable repos`),
        `Will drop tag v${config.testVersion}`
    ], COLOR.magenta)

    if (!await proceedPrompt()) {
        process.exit(0)
    }

    if (config.tmpDir == tmpDirDefault) {
        config.tmpDir = utils.mkTmpDir()
    } else {
        utils.mkDirIfNeeded(config.tmpDir)
    }

    await prepareRepo(REPO.shared)
    await prepareRepo(REPO.android, {hasDoc:true, filesWithOrg: ['.gitmodules', './libs/SalesforceReact/package.json'], submodulePaths:['./external/shared']})
    await prepareRepo(REPO.ios, {hasDoc:true})
    await prepareRepo(REPO.ioshybrid, {filesWithOrg: ['.gitmodules'], submodulePaths:['./external/shared', './external/SalesforceMobileSDK-iOS']})
    await prepareRepo(REPO.iosspecs, {noTag: true, noDev: true, filesWithOrg:['update.sh']})
    await prepareRepo(REPO.iosspm, {noTagPrefix: true, noDev: true})
    await prepareRepo(REPO.cordovaplugin, {filesWithOrg:['./plugin.xml','./tools/update.sh']})
    await prepareRepo(REPO.reactnative)
    await prepareRepo(REPO.templates, {filesWithOrg:templatesPackageJsons})
    await prepareRepo(REPO.pkg, {filesWithOrg:['./shared/constants.js']})
}

async function prepareRepo(repo, params) {
    params = params || {}
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            cloneOrClean(config.testOrg, repo, config.tmpDir),
            {
                msg: `Cleaning up test branches/tag in ${repo}`,
                cmds: [
                    deleteBranch(config.testMasterBranch),
                    !params.noDev ? deleteBranch(config.testDevBranch) : null,
                    params.hasDoc ? deleteBranch(config.testDocBranch) : null,
                    !params.noTag ? deleteTag(config.testVersion, params.noTagPrefix) : null
                ]
            },
            config.cleanupOnly ? null : {
                msg: `Setting up test branches in ${repo}`,
                cmds: [
                    {
                        msg: `Setting up ${config.testMasterBranch}`,
                        cmds: [
                            createBranch(config.testMasterBranch, 'master'),
                            params.filesWithOrg ? pointToFork(config.testMasterBranch, params) : null,
                            params.submodulePaths ? updateSubmodules(config.testMasterBranch, params) : null  
                        ]
                    },
                    params.hasDoc ? createBranch(config.testDocBranch, 'gh-pages') : null,
                    params.noDev ? null : {
                        msg: `Setting up ${config.testDevBranch}`,
                        cmds: [
                            createBranch(config.testDevBranch, 'dev'),
                            mergeMasterToDev(),
                            params.filesWithOrg ? pointToFork(config.testDevBranch, params) : null,
                            params.submodulePaths ? updateSubmodules(config.testDevBranch, params) : null
                        ]
                    }
                ]
            }
        ]
    }

    await runCmds(path.join(config.tmpDir, repo), cmds)
}

//
// Helper functions
//
function deleteBranch(branch) {
    return {
        msg: `Deleting ${branch} branch`,
        cmds: [
            `git checkout master`,
            {cmd: `git branch -D ${branch}`, ignoreError: true},
            {cmd: `git push origin :${branch}`, ignoreError: true}
        ]
    }
}

function deleteTag(tag, noTagPrefix) {
    const fullTag = `${noTagPrefix ? '' : 'v'}${tag}`
    return {
        msg: `Deleting ${fullTag} tag`,
        cmds: [
            {cmd: `git tag -d ${fullTag}`, ignoreError: true},
            {cmd: `git push --delete origin ${fullTag}`, ignoreError: true}
        ]
    }
}

function createBranch(branch, rootBranch) {
    return    {
        msg: `Creating ${branch} branch off of ${rootBranch}`,
        cmds: [
            `git checkout ${rootBranch}`,
            `git checkout -b ${branch}`, 
            `git push origin ${branch}`
        ]
    }    
}

function mergeMasterToDev() {
    return {
        msg: `Merging ${config.testMasterBranch} to ${config.testDevBranch}`,
        cmds: [
            `git checkout ${config.testDevBranch}`,
            `git submodule sync`,
            `git submodule update --init`,
            `git merge -Xours -m "Merge from ${config.testMasterBranch}" ${config.testMasterBranch}`,
            `git push origin ${config.testDevBranch}`
        ]
    }
}

function pointToFork(branch, params) {
    return {
        msg: `Pointing to fork ${config.testOrg} in ${branch} branch`,
        cmds: [
            `git checkout ${branch}`,
            ... params.filesWithOrg.map(path => {
                return {
                    msg: `Editing file ${path}`,
                    cmds: [
                        `gsed -i "s/forcedotcom/${config.testOrg}/g" ${path}`,
                        `git add ${path}`
                    ]
                }
            }),
            `git commit -m "Pointing to fork"`,
            `git push origin ${branch}`,
        ]
    }
}

function updateSubmodules(branch, params) {
    return {
        msg: `Updating submodules in ${branch} branch`,
        cmds: [
            `git checkout ${branch}`,
            `git submodule sync`,
            `git submodule update --init`,
            ... params.submodulePaths.map(path => {
                return {
                    msg: `Fixing submodule ${path}`,
                    cmds: [
                        {cmd: `git pull origin ${branch}`, reldir:path },
                        `git add ${path}`
                    ]
                }
            }),
            `git commit -m "Updating submodules"`,
            `git push origin ${branch}`,
        ]
    }
}


//
// Config validation
//
function validateConfig() {
    if (Object.keys(config).length < QUESTIONS.length) {
        process.exit(1)
    }

    if (config.testOrg === 'forcedotcom') {
        utils.logError(`You can't use ${config.testOrg} for testing`)
        process.exit(1)
    }

    if (config.testMasterBranch === 'master') {
        utils.logError(`You can't use ${config.testMasterBranch} for testing`)
        process.exit(1)
    }

    if (config.testDevBranch === 'dev') {
        utils.logError(`You can't use ${config.testDevBranch} for testing`)
        process.exit(1)
    }

    if (config.testDocBranch === 'gh-pages') {
        utils.logError(`You can't use ${config.testDocBranch} for testing`)
        process.exit(1)
    }
    
    if (config.testVersion < VERSION) {
        utils.logError(`You can't use ${config.testVersion} for testing`)
        process.exit(1)
    }

}    
