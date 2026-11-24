/*
 * Copyright (c) 2026-present, salesforce.com, inc.
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
const SDK = require('../shared/constants');
const commandLineUtils = require('../shared/commandLineUtils');
const source = fs.readFileSync(path.join(__dirname, '../test/test_force.js'), 'utf8');

function runMatrix(args, failVerification) {
    const error = new Error('Stale packaged JavaScript');
    const verify = jest.fn(() => ({}));
    if (failVerification) verify.mockImplementationOnce(() => { throw error; });
    const utils = {
        mkTmpDir: () => '/matrix',
        runProcessThrowError: jest.fn(),
        runProcessCatchError: jest.fn(() => true),
        setExitOnFailure: jest.fn(),
        logInfo: jest.fn(),
        logError: jest.fn(),
        separateRepoUrlPathBranch: require('../shared/utils').separateRepoUrlPathBranch
    };
    const processState = {argv: ['node', 'test_force.js', '--no-plugin-update', ...args],
        platform: process.platform, exitCode: 0};
    const dependencies = {
        child_process: {spawnSync: jest.fn()},
        fs: {existsSync: () => false},
        path,
        shelljs: {},
        '../shared/commandLineUtils': commandLineUtils,
        '../shared/utils': utils,
        '../shared/templateHelper.js': {getTemplates: () => [
            {appType: 'hybrid_local', path: 'HybridLocalTemplate', platforms: ['android']},
            {appType: 'hybrid_remote', path: 'HybridRemoteTemplate', platforms: ['android']}
        ]},
        '../shared/constants': SDK,
        '../shared/outputColors': {},
        './hybridAndroidVerification': {verifyHybridAndroidApp: verify}
    };
    vm.runInNewContext(source, {process: processState, console,
        __dirname: path.join(__dirname, '../test'),
        require: name => {
            if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name);
            return dependencies[name];
        }});
    return {verify, utils, processState, error};
}

const selections = [
    ['app types', ['--os=android', '--apptype=hybrid_local,hybrid_remote']],
    ['CLI templates', ['--os=android', '--cli=forcehybrid']]
];

describe('Android hybrid integration matrix', () => {
    it.each(selections)('continues after verification failure for %s', (name, args) => {
        const {verify, utils, processState, error} = runMatrix(args, true);

        expect(verify).toHaveBeenCalledTimes(2);
        expect(verify.mock.calls[1][0].projectDir).toContain('hybridremote');
        expect(utils.logError).toHaveBeenCalledWith(
            expect.stringContaining('VERIFYING hybrid_local'), error);
        expect(processState.exitCode).toBe(1);
    });

    it.each(selections)('stops on verification failure with fail-fast for %s', (name, args) => {
        const {verify, utils, processState} = runMatrix([...args, '--exit-on-failure'], true);

        expect(verify).toHaveBeenCalledTimes(1);
        expect(utils.setExitOnFailure).toHaveBeenCalledWith(true);
        expect(processState.exitCode).toBe(1);
    });

    it('retains successful exit status when every verification succeeds', () => {
        const {verify, utils, processState} = runMatrix(selections[0][1], false);

        expect(verify).toHaveBeenCalledTimes(2);
        expect(utils.logError).not.toHaveBeenCalled();
        expect(processState.exitCode).toBe(0);
    });
});
