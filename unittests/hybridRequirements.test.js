/*
 * Copyright (c) 2016-present, salesforce.com, inc.
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

jest.mock('child_process', () => ({execSync: jest.fn()}));

const {execSync} = require('child_process');
const checkHybridRequirements = require('../shared/hybridRequirements');

function installed(node, pod) {
    execSync.mockImplementation(command => {
        if (command === 'node --version') return Buffer.from('v' + node + '\n');
        if (command === 'pod --version' && pod) return Buffer.from(pod + '\n');
        throw new Error('Tool unavailable');
    });
}

beforeEach(() => execSync.mockReset());

test.each(['22.0.0', '22.8.0', '22.8.99', '20.17.0'])(
    'rejects Node %s before checking CocoaPods', version => {
        installed(version, '1.16.0');
        expect(() => checkHybridRequirements({platform: 'ios'})).toThrow('22.9.0');
        expect(execSync).toHaveBeenCalledTimes(1);
    });

test.each(['22.9.0', '22.22.2', '24.0.0'])(
    'accepts Node %s with supported CocoaPods', version => {
        installed(version, '1.16.0');
        expect(() => checkHybridRequirements({platform: 'ios'})).not.toThrow();
        expect(execSync).toHaveBeenCalledTimes(2);
    });

test.each(['1.8.0', '1.15.99'])(
    'rejects CocoaPods %s', version => {
        installed('22.9.0', version);
        expect(() => checkHybridRequirements({platform: 'ios'})).toThrow('1.16.0');
    });

test('reports unavailable CocoaPods before creation', () => {
    installed('22.9.0');
    expect(() => checkHybridRequirements({platform: 'ios'})).toThrow('pod is required');
});

test('checks iOS in a combined platform selection', () => {
    installed('22.9.0', '1.16.2');
    checkHybridRequirements({platform: 'android,ios'});
    expect(execSync).toHaveBeenCalledTimes(2);
});

test('does not check iOS requirements for Android-only hybrid apps', () => {
    checkHybridRequirements({platform: 'android'});
    expect(execSync).not.toHaveBeenCalled();
});
