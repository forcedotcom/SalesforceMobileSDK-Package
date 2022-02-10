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
    3: '-',
    4: '-'
}

const DEPTH_COLOR = {
    1: COLOR.blue,
    2: COLOR.yellow,
    3: COLOR.cyan
}

var autoYesForPrompts = false
 
// Run a bunch of commands
async function runCmds(dir, cmds, depth) {
    if (!depth) {
        utils.logInfo(`\n=== ${cmds.msg} ===`, COLOR.magenta)
        if (!await proceedPrompt('Answer y(es) to proceed and n(o) to skip:')) {
            return
        }
    }

    depth = depth || 1
    cmds.cmds = cmds.cmds.filter(x => !!x)
    const count = cmds.cmds.length
    for (var i=0; i<count; i++) {
        const cmd = cmds.cmds[i]
        if (typeof(cmd) === 'string') {
            await runCmd(dir, cmd, i+1, count, depth)
        } else if (cmd.cmd) {
            // use cmd.dir if defined
            // otherwise use cmd.reldir (appended to dir) if defined
            // otherwise use dir
            const cmdDir = cmd.dir
                  ? cmd.dir
                  : (cmd.reldir
                     ? path.join(dir, cmd.reldir)
                     : dir)
            await runCmd(cmdDir, cmd.cmd, i+1, count, depth, cmd.ignoreError, cmd.cmdIfError)
        } else if (cmd.cmds) {
            print(cmd.msg, i+1, count, depth)
            await runCmds(dir, cmd, depth + 1)
        }
    }
}

// Proceed prompt
async function proceedPrompt(msg) {
    if (autoYesForPrompts) {
        return true
    }
    
    const confirmation = await prompts([{type:'confirm',
                                         name:'value',
                                         initial:false,
                                         message:msg || 'Are you sure you want to proceed?'}])                                         

    return confirmation.value
}


async function runCmd(dir, cmd, index, count, depth, ignoreError, cmdIfError) {
    print(`${dir} > ${cmd}`, index, count, depth)
    try {
        utils.runProcessThrowError(cmd, dir)
    } catch (e) {
        if (cmdIfError) {
            await runCmds(dir, cmdIfError, depth+1)
        } else if (!ignoreError && !await proceedPrompt('An error occurred. Continue?')) {
            process.exit(1);
        }
    }
}

function print(msg, index, count, depth) {
    const prefix = new Array(2*(depth+1)).join(DEPTH_PREFIX[depth] || ' ')
    utils.logInfo(`\n${prefix} ${index}/${count} ${msg}`, DEPTH_COLOR[depth] || COLOR.green)
}

function urlForRepo(org, repo) {
    return `git@github.com:${org}/${repo}`;
}

function setAutoYesForPrompts(b) {
    autoYesForPrompts = b;
}

function cloneOrClean(org, repo, dir) {
    return {
        msg: `Preparing ${repo}`,
        cmds: [
            {cmd: `git clone ${urlForRepo(org, repo)}`, dir: dir, ignoreError: true},
            {cmd: `git checkout -- .`, dir: path.join(dir, repo)}
        ]
    }
}


module.exports = {
    REPO,
    runCmds,
    proceedPrompt,
    urlForRepo,
    setAutoYesForPrompts,
    cloneOrClean
}
