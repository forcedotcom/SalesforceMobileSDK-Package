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
      VERSION = require('../shared/constants.js').version,
      os = require("os")

// Default values for prompt
const tmpDirDefault = "generate-new-dir"
const orgDefault = os.userInfo().username
const masterBranchDefault = "master2"
const devBranchDefault = "dev2"
const docBranchDefault = "gh-pages2"
const versionReleasedDefault = VERSION
const nextVersionDefault = "10.0.0"
const versionCodeReleasedDefault = 74

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
        name: 'org',
        message: 'Organization ?',
        initial: orgDefault
    },
    {
        type: 'text',
        name: 'masterBranch',
        message: 'Release branch ?',
        initial: masterBranchDefault
    },
    {
        type: 'text',
        name: 'devBranch',
        message: 'Development branch ?',
        initial: devBranchDefault
    },
    {
        type: 'text',
        name: 'docBranch',
        message: 'Doc branch (e.g. gh-pages) ?',
        initial: docBranchDefault
    },
    {
        type: 'text',
        name: 'versionReleased',
        message: `Version being released ?`,
        initial: versionReleasedDefault
    },
    {
        type: 'number',
        name: 'versionCodeReleased',
        message: 'Version code for Android being released ?',
        initial: versionCodeReleasedDefault
    },
    {
        type: 'text',
        name: 'nextVersion',
        message: 'Next version ?',
        initial: nextVersionDefault
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

    config.nextVersionCode = config.versionCodeReleased + 1

    // Final confirmation
    utils.logParagraph([
        ` RELEASING version ${config.versionReleased} (code ${config.versionCodeReleased} on Android) `,
        ``,
        `Will merge ${config.devBranch} to ${config.masterBranch} on ${config.org}`,
        `Will apply tag v${config.versionReleased}`,
        `New doc will be published to ${config.docBranch}`,
        `Afterwards ${config.devBranch} will be for version ${config.nextVersion} (code ${config.nextVersionCode} on Android)`
    ], COLOR.magenta)
    if (!await proceedPrompt()) {
        process.exit(0)
    }
    
    // Release!!
    if (config.tmpDir == tmpDirDefault) {
        config.tmpDir = utils.mkTmpDir()
    } else {
        utils.mkDirIfNeeded(config.tmpDir)
    }

        
    await releaseShared()
    await releaseAndroid()
    await releaseIOS()
    await releaseIOSHybrid()
    await releaseIOSSpecs()
    await releaseCordovaPlugin()
    await releaseReactNative()
    await releaseTemplates()
    await releasePackage()

    utils.logParagraph([
        ` NEXT STEPS: TEST then PUBLISH`,
        ``,
        `To test the NPM packages, do the following:`,
        `  cd ${config.tmpDir}/${REPO.pkg}`,
        `  ./test/test_force.js --cli=forceios,forcedroid,forcereact,forcehybrid`,
        `  ./test/test_force.js --cli=forceios,forcedroid,forcereact,forcehybrid --use-sfdx`,
        `You should also open and run the generated apps in XCode / Android Studio.`,
        ``,
        `To publish to NPM, do the following:`,
        `  cd ${config.tmpDir}`,
        `  npm publish forceios-${config.versionReleased}.tgz`,
        `  npm publish forcedroid-${config.versionReleased}.tgz`,
        `  npm publish forcehybrid-${config.versionReleased}.tgz`,
        `  npm publish forcereact-${config.versionReleased}.tgz`,
        `  npm publish sfdx-mobilesdk-plugin-${config.versionReleased}.tgz`,
        ``,
        `To publish to Maven Central, do the following:`,
        `  cd ${config.tmpDir}/${REPO.android}`,
        `  ./publish/publish.sh`,
        ``
    ], COLOR.magenta)

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
        submodulePaths: ['external/shared'],
        postReleaseGenerateCmd: generateDocAndroid()
    })
}

//
// Release function for iOS repo (missing: apple doc generation)
//
async function releaseIOS() {
    await releaseRepo(REPO.ios, {
        postReleaseGenerateCmd: generateDocIOS()        
    })
}

//
// Release function for iOS-Hybrid repo
//
async function releaseIOSHybrid() {
    await releaseRepo(REPO.ioshybrid, {
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
            cloneOrClean(config.org, repo, config.tmpDir),
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
    await releaseRepo(REPO.pkg, {
        postReleaseGenerateCmd: generateNpmPackages()
    })        
}

//
// Helper functions
//
async function releaseRepo(repo, params) {
    params = params || {}
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            cloneOrClean(config.org, repo, config.tmpDir),
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
                    params.postReleaseGenerateCmd
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
            },
            // In master branch
            `git checkout ${config.masterBranch}`
        ]
    }
    await runCmds(path.join(config.tmpDir, repo), cmds)
}

function checkoutMasterAndMergeDev() {
    return {
        msg: `Merging ${config.devBranch} to ${config.masterBranch}`,
        cmds: [
            `git checkout ${config.masterBranch}`,
            `git clean -fdxf`, // NB: need double -f to remove deleted submodule directory - see https://stackoverflow.com/a/10761699
            `git submodule sync`,
            `git submodule update --init`,
            `git merge --no-ff -m "Merging ${config.devBranch} into ${config.masterBranch}" ${config.devBranch}`,
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
    const cmds = !submodulePaths ? null : {
        msg: `Updating submodules to ${branch}`,
        cmds: [
            `git submodule sync`,
            `git submodule update --init`,
            ... submodulePaths.map(path => { return {cmd:`git pull origin ${branch}`, reldir:path} })
        ]
    }
    return cmds
}

function commitAndPushMaster() {
    return {
        msg: `Pushing to ${config.masterBranch}`,
        cmds: [
            `git add *`,
            {cmd: `git commit -m "Mobile SDK ${config.versionReleased}"`, ignoreError: true},
            `git push origin ${config.masterBranch}`,
        ]
    }
}

function tagMaster() {
    return {
        msg: `Tagging ${config.masterBranch} with v${config.versionReleased}`,
        cmds: [
            `git tag v${config.versionReleased}`,
            `git push origin ${config.masterBranch} --tag`,
        ]
    }
}

function commitAndPushDev() {
    return {
        msg: `Pushing to ${config.devBranch}`,
        cmds: [
            `git add *`,
            `git commit -m "Updating version numbers to ${config.nextVersion}"`,
            `git push origin ${config.devBranch}`
        ]
    }
}

function checkoutDevAndMergeMaster() {
    return {
        msg: `Merging ${config.masterBranch} back to ${config.devBranch}`,
        cmds: [
            `git checkout ${config.devBranch}`,
            `git clean -fdxf`, // NB: need double -f to remove deleted submodule directory - see https://stackoverflow.com/a/10761699
            `git submodule sync`,
            `git submodule update`,
            `git merge --no-ff -m "Merging ${config.masterBranch} into ${config.devBranch}" ${config.masterBranch}`,
        ]
    }
}

function generateDocIOS() {
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

function generateDocAndroid() {
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

function generateNpmPackages() {
    return {
        msg: `Generating npm packages`,
        cmds: [
            `git checkout ${config.masterBranch}`,
            `node ./install.js`,
            `node ./pack/pack.js --cli=forceios,forcedroid,forcehybrid,forcereact`,
            `node ./pack/pack.js --sfdx-plugin`,
            `mv ./force*.tgz ../`,
            `mv ./sfdx-*.tgz ../`,
            `git checkout -- .`
        ]
    }
} 
