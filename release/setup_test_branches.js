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
      urlForRepo = require('./common.js').urlForRepo,
      setAutoYesForPrompts = require('./common.js').setAutoYesForPrompts,
      REPO = require('./common.js').REPO,
      VERSION = require('../shared/constants.js').version

const templatesPackageJsons = [
    './AndroidIDPTemplate/package.json',
    './SmartSyncExplorerReactNative/package.json',
    './AndroidNativeKotlinTemplate/package.json',
    './SmartSyncExplorerSwift/package.json',
    './AndroidNativeTemplate/package.json',
    './iOSIDPTemplate/package.json',
    './HybridLocalTemplate/package.json',
    './iOSNativeSwiftTemplate/package.json',
    './HybridRemoteTemplate/package.json',
    './iOSNativeTemplate/package.json',
    './ReactNativeTemplate/package.json'
]

// Questions
const QUESTIONS = [
    {
        type: 'text',
        name: 'testOrg',
        message: 'Organization ?',
        initial: 'wmathurin'
    },
    {
        type: 'text',
        name: 'testMasterBranch',
        message: 'Name of test master branch ?',
        initial: 'master2'
    },
    {
        type: 'text',
        name: 'testDevBranch',
        message: 'Name of test dev branch ?',
        initial: 'dev2'
    },
    {
        type: 'text',
        name: 'testDocBranch',
        message: 'Name of test doc branch ?',
        initial: 'gh-pages2'
    },
    {
        type: 'text',
        name: 'testVersion',
        message: `Name of test version ?`,
        initial: VERSION
    },
    {
        type:'confirm',
        name: 'autoYesForPrompts',
        message: `Automatically answer yes to all prompts?`,
        initial: true
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
        ``,
        ` SETTING UP TEST BRANCHES FOR RELEASE TESTING `,
        ``,
        `Will drop and recreate ${config.testMasterBranch} off of master on all repos in ${config.testOrg}`,
        `Will drop and recreate ${config.testDevBranch} off of dev on all applicable repos`,
        `Will drop tag ${config.testVersion}`
    ], COLOR.magenta)

    if (!await proceedPrompt()) {
        process.exit(0)
    }

    config.tmpDir = utils.mkTmpDir()
//    await prepareRepo(REPO.shared)
//    await prepareRepo(REPO.android, {hasDoc:true, filesWithOrg: ['.gitmodules', './libs/SalesforceReact/package.json'], submodulePaths:['./external/shared']})
//    await prepareRepo(REPO.ios, {hasDoc:true})
    await prepareRepo(REPO.ioshybrid, {filesWithOrg: ['.gitmodules'], submodulePaths:['./external/shared']})
    await prepareRepo(REPO.iospecs, {noTag: true, noDev: true, filesWithOrg:['update.sh']})
    await prepareRepo(REPO.cordovaplugin, {filesWithOrg:['./tools/update.sh']})
    await prepareRepo(REPO.reactnative)
    await prepareRepo(REPO.templates, {filesWithOrg:templatesPackageJsons})
    await prepareRepo(REPO.pkg, {filesWithOrg:['./shared/constants.js']})
}

async function prepareRepo(repo, params) {
    params = params || {}
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            {cmd:`git clone ${urlForRepo(config.testOrg, repo)}`, dir:config.tmpDir},
            deleteBranch(config.testMasterBranch),
            params.noDev ? null : deleteBranch(config.testDevBranch),
            !params.hasDoc ? null : deleteBranch(config.testDocBranch),
            params.noTag ? null : deleteTag(config.testVersion),
            createBranch(config.testMasterBranch, 'master'),
            !params.filesWithOrg ? null : pointToFork(config.testMasterBranch, params),
            !params.submodulePaths ? null : updateSubmodules(config.testMasterBranch, params),
            params.noDev ? null : createBranch(config.testDevBranch, 'dev'),
            params.noDev || !params.filesWithOrg ? null : pointToFork(config.testDevBranch, params),            
            !params.submodulePaths ? null : updateSubmodules(config.testDevBranch, params),
            !params.hasDoc ? null : createBranch(config.testDocBranch, 'gh-pages')
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
            `git push origin :${branch}`
        ]
    }
}

function deleteTag(tag) {
    return {
        msg: `Deleting ${tag} tag`,
        cmds: [
            `git tag -d ${tag}`,
            `git push --delete origin ${tag}`
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

function pointToFork(branch, params) {
    return {
        msg: `Pointing to fork ${config.testOrg} in ${branch} branch`,
        cmds: [
            `git checkout ${branch}`,
            {
                msg: `Editing files`,
                cmds: params.filesWithOrg.map(path => `gsed -i "s/forcedotcom/${config.testOrg}/g" ${path}`)
            },
            {
                msg: `Git adding files`,
                cmds: params.filesWithOrg.map(path => `git add ${path}` )
            },
            `git commit -m "Pointing to fork"`,
            `git push origin ${branch}`,
        ]
    }
}

function updateSubmodules(branch, params) {
    return {
        msg: `Pointing submodules to ${branch} branch`,
        cmds: [
            `git checkout ${branch}`,
            {
                msg: `Pulling ${branch}`,
                cmds: params.submodulePaths.map(path => { return { cmd:`git pull origin ${branch}`, reldir:path } })
            },
            {
                msg: `Git adding modified submodules`,
                cmds: params.submodulePaths.map(path => `git add ${path}` )
            },
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
