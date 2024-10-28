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
      urlForRepo = require('./common.js').urlForRepo,
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
const nextVersionDefault = "13.0.0"
const versionCodeReleasedDefault = 87

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
        type:'confirm',
        name: 'isPatch',
        message: `Is patch release? (no merge from dev, changes already in master)`,
        initial: false
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
        config.isPatch
            ? `Will cut release from ${config.masterBranch} on ${config.org} - will NOT merge ${config.devBranch} into it`
            : `Will merge ${config.devBranch} to ${config.masterBranch} on ${config.org}`,
        `Will apply tag v${config.versionReleased}`,
        `New doc will be published to ${config.docBranch}`,
        `Afterwards ${config.devBranch} will be for version ${config.nextVersion} (code ${config.nextVersionCode} on Android)`,
        ``,
        ` !! MAKE SURE TO USE JDK 8 TO SUCCESSFULLY GENERATE JAVADOC !!`
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
    await releaseIOSSpm()
    await releaseCordovaPlugin()
    await releaseReactNative()
    await releaseTemplates()
    await releasePackage()

    // We are testing before publishing to npmjs.org
    // So we need to use the github plugin repo uri (not the npmjs package name that's in constants.js)
    pluginRepoUri = `${urlForRepo(config.org, REPO.cordovaplugin)}#v${config.versionReleased}`
    
    utils.logParagraph([
        ` NEXT STEPS: TEST then PUBLISH`,
        ``,
        `To test the NPM packages, do the following:`,
        `  cd ${config.tmpDir}/${REPO.pkg}`,
        `  ./test/test_force.js --cli=forceios,forcedroid,forcereact,forcehybrid --pluginrepouri=${pluginRepoUri}`,
        `  ./test/test_force.js --cli=forceios,forcedroid,forcereact,forcehybrid --use-sfdx --pluginrepouri=${pluginRepoUri}`,
        `You should also open and run the generated apps in XCode / Android Studio.`,
        ``,
        `To publish to NPM, do the following:`,
        `  cd ${config.tmpDir}`,
        `  npm publish forceios-${config.versionReleased}.tgz`,
        `  npm publish forcedroid-${config.versionReleased}.tgz`,
        `  npm publish forcehybrid-${config.versionReleased}.tgz`,
        `  npm publish forcereact-${config.versionReleased}.tgz`,
        `  npm publish sfdx-mobilesdk-plugin-${config.versionReleased}.tgz`,
        `  npm publish salesforce-mobilesdk-cordova-plugin-${config.versionReleased}.tgz`,
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
    const repo = REPO.iosspecs
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
// Release function for iOS-Spm repo
//
async function releaseIOSSpm() {
    const repo = REPO.iosspm
    const cmds = {
        msg: `PROCESSING ${repo}`,
        cmds: [
            cloneOrClean(config.org, repo, config.tmpDir),
            `git checkout ${config.masterBranch}`,
	    `./build_xcframeworks.sh -r ${config.org} -b ${config.masterBranch}`,
            commitAndPushMaster(),
	    tagMaster(true) // SPM needs versions of the form X.Y.Z (where X, Y, Z are integers)
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
        postReleaseGenerateCmd: generateNpmPackageForCordovaPlugin(),
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
                    checkoutBranch(config.masterBranch),
                    config.isPatch ? null : mergeBranch(config.devBranch, config.masterBranch, params.submodulePaths),
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
                    checkoutBranch(config.devBranch),
                    mergeBranch(config.masterBranch, config.devBranch, params.submodulePaths),
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

function tagMaster(noTagPrefix) {
    const tagPrefix = noTagPrefix ? '' : 'v'
    return {
        msg: `Tagging ${config.masterBranch} with ${tagPrefix}${config.versionReleased}`,
        cmds: [
            `git tag ${tagPrefix}${config.versionReleased}`,
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

function checkoutBranch(branchToCheckout) {
    return {
        msg: `Checking out ${branchToCheckout}`,
        cmds: [
            `git checkout ${branchToCheckout}`,
            `git clean -fdxf`, // NB: need double -f to remove deleted submodule directory - see https://stackoverflow.com/a/10761699
            `git submodule sync`,
            `git submodule update`,
        ]
    }
}

function mergeBranch(branchToMergeFrom, branchToMergeInto, submodulePaths) {
    const msg = `Merging ${branchToMergeFrom} into ${branchToMergeInto}`
    return {
        msg: msg,
        cmd: `git merge -Xours --no-ff -m "${msg}" origin/${branchToMergeFrom}`,
        cmdIfError: !submodulePaths
            ? null
            : {
                // git does not do any merge operations on submodule version
                // if there is a submodule conflict keep ours
                msg: `Attempting to address merge error`,
                cmds: [
                    ... submodulePaths.map(path => { return `git add ${path}`}),
                    {cmd: `git commit -m "${msg}"`, ignoreError: true}
                ]
            }
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

function generateNpmPackageForCordovaPlugin() {
    return {
        msg: `Generating npm package`,
        cmds: [
            `git checkout ${config.masterBranch}`,
            `npm pack`,
            `mv ./salesforce-mobilesdk-cordova-plugin*.tgz ../`,
            `git checkout -- .`
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
