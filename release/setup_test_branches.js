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
      REPO = require('./common.js').REPO

// Questions
const QUESTIONS = [
    {
        type: 'text',
        name: 'testOrg',
        message: 'Organization (e.g. wmathurin) ?'
    },
    {
        type: 'text',
        name: 'testMasterBranch',
        message: 'Name of test master branch (e.g. master2) ?'
    },
    {
        type: 'text',
        name: 'testDevBranch',
        message: 'Name of test dev branch (e.g. dev2) ?'
    },
    {
        type: 'text',
        name: 'testVersion',
        message: 'Name of test version (e.g. 9.5.1) ?'
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
    await prepareRepo(REPO.shared)
    await prepareRepo(REPO.android, true /* hasSubmodules */)
    await prepareRepo(REPO.ios)
    await prepareRepo(REPO.ioshybrid, true /* hasSubmodules */)
    await prepareRepo(REPO.iospecs, false /* hasSubmodules */, true /* noTag */, true /* noDev */)
    await prepareRepo(REPO.cordovaplugin)
    await prepareRepo(REPO.reactnative)
    await prepareRepo(REPO.templates)
    await prepareRepo(REPO.pkg)
}

async function prepareRepo(repo, hasSubmodules, noTag, noDev) {
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            {cmd:`git clone ${urlForRepo(config.testOrg, repo)}`, dir:config.tmpDir},
            {
                msg: `Dropping ${config.testMasterBranch} branch`,
                cmds : [
                    `git branch -D ${config.testMasterBranch}`,
                    `git push origin :${config.testMasterBranch}`
                ]
            },
            noDev ? null : {
                msg: `Dropping ${config.testDevBranch} branch`,
                cmds: [
                    `git branch -D ${config.testDevBranch}`,
                    `git push origin :${config.testDevBranch}`
                ]
            },
            noTag ? null : {
                msg: `Dropping ${config.testVersion} tag`,
                cmds: [
                    `git tag -d ${config.testVersion}`,
                    `git push --delete origin ${config.testVersion}`
                ]
            },
            {
                msg: `Creating ${config.testMasterBranch} branch`,
                cmds: [
                    `git checkout master`,
                    `git checkout -b ${config.testMasterBranch}`,
                    `git push origin ${config.testMasterBranch}`
                ]
            },
            !hasSubmodules ? null : {
                msg: `Pointing submodules to ${config.testOrg} in ${config.testMasterBranch} branch`,
                cmds: [
                    `git checkout ${config.testMasterBranch}`,
                    `gsed -i "s/forcedotcom/${config.testOrg}/g" .gitmodules`,
                    `git add .gitmodules`,
                    `git commit -m "Pointing to fork"`,
                    `git push origin ${config.testMasterBranch}`,
                ]
            },
            noDev ? null : {
                msg: `Creating ${config.testDevBranch} branch`,
                cmds: [
                    `git checkout dev`,
                    `git checkout -b ${config.testDevBranch}`,
                    `git push origin ${config.testDevBranch}`
                ]
            },
            noDev || !hasSubmodules ? null : {
                msg: `Pointing submodules to ${config.testOrg} in ${config.testDevBranch} branch`,
                cmds: [
                    `gsed -i "s/forcedotcom/${config.testOrg}/g" .gitmodules`,
                    `git add .gitmodules`,
                    `git commit -m "Pointing to fork"`,
                    `git push origin ${config.testDevBranch}`,
                ]
            }
        ]
    }

    await runCmds(path.join(config.tmpDir, repo), cmds)
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

    if (config.testVersion <= '7.1.0') {
        utils.logError(`You can't use ${config.testVersion} for testing`)
        process.exit(1)
    }

}    
