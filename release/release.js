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
        name: 'docBranch',
        message: 'Doc branch (e.g. gh-pages) ?'
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
        ` RELEASING version ${config.versionReleased} (code ${config.versionCodeReleased} on Android) `,
        ``,
        `Will merge ${config.devBranch} to ${config.masterBranch} on ${config.org}`,
        `New doc will be published to ${config.docBranch}`,
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
        process.exit(1)
    }
}    

//
// Release function for shared repo
//
async function releaseShared() {
    await releaseRepo(REPO.shared)
}

//
// Release function for android repo (missing: javadoc generation)
//
async function releaseAndroid() {
    await releaseRepo(REPO.android, {
        masterPostMergeCmd: './install.sh',
        devPostMergeCmd: './install.sh',
        submodulePaths: ['external/shared'],
        genDocCmd: genDocAndroid()
    })
}

//
// Release function for iOS repo (missing: apple doc generation)
//
async function releaseIOS() {
    await releaseRepo(REPO.ios, {
        masterPostMergeCmd: './install.sh',
        devPostMergeCmd: './install.sh',
        genDocCmd: genDocIOS()        
    })
}

//
// Release function for iOS-Hybrid repo
//
async function releaseIOSHybrid() {
    await releaseRepo(REPO.ioshybrid, {
        masterPostMergeCmd: './install.sh',
        devPostMergeCmd: './install.sh',
        submodulePaths: ['external/shared', 'external/SalesforceMobileSDK-iOS']
    })
}

//
// Release function for iOS-Specs repo
//
async function releaseIOSSpecs() {
    const repo = REPO.iospecs
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            {cmd:`git clone ${urlForRepo(config.org, repo)}`, dir:config.tmpDir},
            `git checkout ${config.masterBranch}`,
            `./update.sh -b ${config.masterBranch} -v ${config.versionReleased}`,
            commitAndPushMaster()
        ]
    }
    await runCmds(path.join(config.tmpDir, repo), cmds)
}

//
// Release function for CordovaPlugin repo
//
async function releaseCordovaPlugin() {
    await releaseRepo(REPO.cordovaplugin, {
        masterPostMergeCmd:`./tools/update.sh -b ${config.masterBranch}`,
        devPostMergeCmd:`./tools/update.sh -b ${config.devBranch}`
    })
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
async function releaseRepo(repo, params) {
    params = params || {}
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            {cmd:`git clone ${urlForRepo(config.org, repo)}`, dir:config.tmpDir},
            // master
            {
                msg: `Working on ${config.masterBranch}`,
                cmds: [
                    checkoutMasterAndMergeDev(),
                    params.masterPostMergeCmd,
                    setVersion(config.versionReleased, false, config.versionCodeReleased),
                    updateSubmodules(config.masterBranch, params.submodulePaths),
                    commitAndPushMaster(),
                    tagMaster(),
                    params.genDocCmd
                ]
            },
            // dev
            {
                msg: `Working on ${config.devBranch}`,
                cmds: [
                    checkoutDevAndMergeMaster(),
                    params.devPostMergeCmd,
                    setVersion(config.nextVersion, true, config.nextVersionCode),
                    updateSubmodules(config.devBranch, params.submodulePaths),
                    commitAndPushDev()
                ]
            }
        ]
    }
    await runCmds(path.join(config.tmpDir, repo), cmds)
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
            `./setVersion.sh -v ${version}`  + (isDev != undefined ? ` -d ${isDev ? "yes" : "no"}`:'') + (code != undefined ? ` -c ${code}`:'')
        ]
    }
}

function updateSubmodules(branch, submodulePaths) {
    return !submodulePaths ? null : {
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

function genDocIOS() {
    return {
        msg: `Generating docs for iOS`,
        cmds: [
            `git checkout ${config.masterBranch}`,
            `./docs/generate_docs.sh`,
            `mv ./build/artifacts/doc ../docIOS`,
            `git checkout ${config.docBranch}`,
            `rm -rf Documentation/*`,
            `mv ../docIOS/* ./Documentation/`,
            `git add Documentation`,
            `git commit -m "Apple doc for Mobile SDK ${config.versionReleased}"`,
            `git push origin ${config.docBranch}`
        ]
    }
}

function genDocAndroid() {
    return {
        msg: `Generating docs for Android`,
        cmds: [
            `git checkout ${config.masterBranch}`,
            `./tools/generate_doc.sh`,
            `mv ./doc ../docAndroid`,
            `git checkout ${config.docBranch}`,            
            `rm -rf *`,
            `mv ../docAndroid/* .`,
            `git add *`,
            `git commit -m "Java doc for Mobile SDK ${config.versionReleased}"`,
            `git push origin ${config.docBranch}`
        ]
    }
}
