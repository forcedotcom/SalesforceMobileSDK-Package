/*
 * Copyright (c) 2016-present, salesforce.com, inc.
 * All rights reserved.
 * Redistribution and use in source and binary forms, with or
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
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT OWNERS AND CONTRIBUTORS "AS IS"
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

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {createRequire} = require('module');
const SDK = require('../shared/constants');
const createHelper = require('../shared/createHelper');
const realUtils = require('../shared/utils');

const scriptPath = path.resolve(__dirname, '../test/test_force.js');
const source = fs.readFileSync(scriptPath, 'utf8');
const scriptRequire = createRequire(scriptPath);

function generate(args) {
    const utils = {
        ...realUtils,
        mkTmpDir: () => '/tmp/sdk-test-harness',
        cloneRepo: jest.fn(() => '/tmp/updated-plugin'),
        runProcessThrowError: jest.fn(),
        runProcessCatchError: jest.fn(() => true),
        setExitOnFailure: jest.fn(),
        logInfo: jest.fn(),
        logError: jest.fn()
    };
    const templateHelper = {
        getTemplates: () => ['hybrid_local', 'hybrid_remote'].map(appType => ({
            appType, path: null, platforms: ['ios', 'android']
        }))
    };
    /*
     * Execute the real harness entry point with process execution intercepted.
     * This checks the generated CLI arguments without creating apps or builds.
     */
    vm.runInNewContext(source, {
        __dirname: path.dirname(scriptPath),
        process: {argv: ['node', scriptPath, ...args], platform: process.platform},
        require: name => name === '../shared/utils' ? utils
            : name === '../shared/templateHelper.js' ? templateHelper
            : scriptRequire(name)
    }, {filename: scriptPath});
    expect(utils.logError).not.toHaveBeenCalled();
    const commands = utils.runProcessCatchError.mock.calls
        .filter(([, description]) => description && description.startsWith('GENERATING '))
        .map(([command]) => command);
    return {utils, commands};
}

test.each([
    ['ios', false], ['ios', true], ['android', false], ['android', true]
])('no-update %s generation delegates default selection to the CLI (SFDX: %s)', (os, sfdx) => {
    const {utils, commands} = generate([
        '--cli=forcehybrid', '--os=' + os, '--no-plugin-update', '--skip-build',
        ...(sfdx ? ['--use-sfdx'] : [])
    ]);
    expect(commands).toHaveLength(2);
    for (const command of commands) {
        expect(command).not.toContain('--pluginrepouri=');
        const platform = command.match(/--platform=(\w+)/)[1];
        expect(createHelper.resolveCordovaPluginRepoUri({platform}))
            .toBe(os === 'ios' ? SDK.tools.cordova.iosDevelopmentPlugin.repoUri
                : SDK.tools.cordova.pluginRepoUri);
    }
    expect(utils.cloneRepo).not.toHaveBeenCalled();
});

test('mixed-platform no-update generation lets each CLI select its own default', () => {
    const {commands} = generate([
        '--cli=forcehybrid', '--os=ios,android', '--no-plugin-update', '--skip-build'
    ]);
    expect(commands).toHaveLength(4);
    expect(commands.every(command => !command.includes('--pluginrepouri='))).toBe(true);
});

test.each([false, true])('preserves an explicit no-update source override (SFDX: %s)', sfdx => {
    const uri = 'https://github.com/example/plugin#reviewed';
    const {utils, commands} = generate([
        '--cli=forcehybrid', '--os=ios', '--no-plugin-update', '--skip-build',
        '--pluginrepouri=' + uri, ...(sfdx ? ['--use-sfdx'] : [])
    ]);
    expect(commands).toHaveLength(2);
    expect(commands.every(command => command.includes('--pluginrepouri=' + uri))).toBe(true);
    expect(utils.cloneRepo).not.toHaveBeenCalled();
});

test('retains the existing local-plugin update path when updates are requested', () => {
    const uri = 'https://github.com/example/plugin#review';
    const {utils, commands} = generate([
        '--cli=forcehybrid', '--os=ios', '--skip-build', '--pluginrepouri=' + uri
    ]);
    expect(utils.cloneRepo).toHaveBeenCalledWith('/tmp/sdk-test-harness', uri);
    expect(utils.runProcessThrowError).toHaveBeenCalledWith(
        'tools/update.sh -b review -o ios', '/tmp/updated-plugin');
    expect(commands).toHaveLength(2);
    expect(commands.every(command => command.includes('--pluginrepouri=/tmp/updated-plugin'))).toBe(true);
});
