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
const os = require('os');
const path = require('path');
const {verifyHybridAndroidApp} = require('../test/hybridAndroidVerification');

describe('hybrid Android consumer verification', () => {
    let projectDir;
    let frameworkVersion;
    let packagedJs;
    let packagedPlugin;
    let missingPackagedAsset;
    let run;
    const version = '15.1.0';
    const cordovaJs = `var PLATFORM_VERSION_BUILD_LABEL = '${version}';\n`;

    function write(relativePath, contents) {
        const file = path.join(projectDir, relativePath);
        fs.mkdirSync(path.dirname(file), {recursive: true});
        fs.writeFileSync(file, contents);
    }

    beforeEach(() => {
        projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hybrid-consumer-'));
        frameworkVersion = version;
        packagedJs = cordovaJs;
        packagedPlugin = 'module.exports = {};\n';
        missingPackagedAsset = null;
        write('platforms/android/cordova/version', '');
        write('platforms/android/app/src/main/AndroidManifest.xml', '<manifest/>');
        write('plugins/com.salesforce/plugin.xml', '<plugin id="com.salesforce"/>');
        write('platforms/android/platform_www/cordova.js', cordovaJs);
        write('platforms/android/platform_www/cordova_plugins.js', 'module.exports = [];\n');
        write('platforms/android/platform_www/plugins/com.salesforce/sdkinfo.js', packagedPlugin);
        write('platforms/android/cdv-gradle-config.json', JSON.stringify({
            MIN_SDK_VERSION: 31,
            SDK_VERSION: 36,
            GRADLE_VERSION: '9.4.1',
            AGP_VERSION: '9.1.1'
        }));
        write('platforms/android/app/build/outputs/apk/debug/output-metadata.json',
            JSON.stringify({elements: [{outputFile: 'app-debug.apk'}]}));
        write('platforms/android/app/build/outputs/apk/debug/app-debug.apk', '');
        run = jest.fn((command, args, options) => {
            if (command === process.execPath) return version + '\n';
            if (args.includes(':app:dependencyInsight')) {
                return `org.apache.cordova:framework:${frameworkVersion}\n`;
            }
            if (args[0] === 'xf') {
                for (const relative of args.slice(2)) {
                    const asset = path.join(options.cwd, relative);
                    const name = relative.replace('assets/www/', '');
                    if (name === missingPackagedAsset) continue;
                    const contents = name === 'cordova.js' ? packagedJs
                        : name.startsWith('plugins/') ? packagedPlugin
                        : fs.readFileSync(path.join(projectDir, 'platforms/android/platform_www', name));
                    fs.mkdirSync(path.dirname(asset), {recursive: true});
                    fs.writeFileSync(asset, contents);
                }
                return '';
            }
            throw new Error('Unexpected process call');
        });
    });

    afterEach(() => {
        fs.rmSync(projectDir, {recursive: true, force: true});
    });

    it('verifies the installed platform, resolved framework and APK asset', () => {
        const report = verifyHybridAndroidApp({projectDir, expectedVersion: version, run});

        expect(report.platformVersion).toBe(version);
        expect(report.frameworkVersion).toBe(version);
        expect(report.platformJsSha256).toBe(report.packagedJsSha256);
        expect(report.androidConfiguration.MIN_SDK_VERSION).toBe(31);
        expect(report).not.toHaveProperty('bootconfig');
    });

    it('rejects an older native framework despite the upgraded platform', () => {
        frameworkVersion = '15.0.0';

        expect(() => verifyHybridAndroidApp({projectDir, expectedVersion: version, run}))
            .toThrow('Resolved Cordova framework');
    });

    it.each(['__INSERT_CALLBACK_URL_SCHEME_HERE__',
        '__INSERT_CALLBACK_URL_HOST_HERE__', '__INSERT_CALLBACK_URL_PATH_HERE__'])(
        'identifies an unresolved OAuth redirect placeholder: %s', token => {
            write('platforms/android/app/src/main/AndroidManifest.xml',
                '<manifest><data scheme="' + token + '"/></manifest>');

            expect(() => verifyHybridAndroidApp({projectDir, expectedVersion: version, run}))
                .toThrow('Unresolved template placeholders in AndroidManifest.xml ('
                    + token + '); restore app configuration');
        });

    it('rejects an APK that still contains the old Cordova JavaScript', () => {
        packagedJs = "var PLATFORM_VERSION_BUILD_LABEL = '15.0.0';\n";

        expect(() => verifyHybridAndroidApp({projectDir, expectedVersion: version, run}))
            .toThrow('Packaged Cordova JavaScript');
    });

    it.each(['cordova.js', 'plugins/com.salesforce/sdkinfo.js'])(
        'identifies an asset absent from the APK: %s', file => {
            missingPackagedAsset = file;

            expect(() => verifyHybridAndroidApp({projectDir, expectedVersion: version, run}))
                .toThrow('Asset missing from APK: ' + file);
        });

    it('explains how to repair an incomplete remote resource directory', () => {
        write('server/force-app/main/default/staticresources/cordovaandroid/cordova.js',
            cordovaJs);

        expect(() => verifyHybridAndroidApp({projectDir, expectedVersion: version, run}))
            .toThrow('Remote Cordova JavaScript is missing: cordova_plugins.js; '
                + 'refresh it from platforms/android/platform_www');
    });

    it('rejects matching APK and platform assets with the wrong version', () => {
        packagedJs = "var PLATFORM_VERSION_BUILD_LABEL = '15.0.0';\n";
        write('platforms/android/platform_www/cordova.js', packagedJs);

        expect(() => verifyHybridAndroidApp({projectDir, expectedVersion: version, run}))
            .toThrow('Platform Cordova JavaScript');
    });

    it('propagates dependency resolution failures', () => {
        run.mockImplementation(() => {throw new Error('Gradle resolution failed');});

        expect(() => verifyHybridAndroidApp({projectDir, expectedVersion: version, run}))
            .toThrow('Gradle resolution failed');
    });

    it('rejects stale remote static resources even when the APK is correct', () => {
        write('server/force-app/main/default/staticresources/cordovaandroid/cordova.js',
            "var PLATFORM_VERSION_BUILD_LABEL = '15.0.0';\n");

        expect(() => verifyHybridAndroidApp({projectDir, expectedVersion: version,
            remoteResourcesRequired: true, run})).toThrow('Remote Cordova JavaScript');
    });

    it('requires remote resources when verifying a remote app', () => {
        expect(() => verifyHybridAndroidApp({projectDir, expectedVersion: version,
            remoteResourcesRequired: true, run})).toThrow('static resource is missing');
    });

    it('requires Android static resources when a generated Salesforce server project exists', () => {
        write('server/sfdx-project.json', '{}');

        expect(() => verifyHybridAndroidApp({projectDir, expectedVersion: version, run}))
            .toThrow('Remote Cordova JavaScript static resource is missing');
    });

    it('verifies every generated server asset against the platform and APK', () => {
        write('server/sfdx-project.json', '{}');
        const platform = path.join(projectDir, 'platforms/android/platform_www');
        const remote = path.join(projectDir,
            'server/force-app/main/default/staticresources/cordovaandroid');
        fs.cpSync(platform, remote, {recursive: true});

        const report = verifyHybridAndroidApp({projectDir, expectedVersion: version,
            remoteResourcesRequired: true, run});

        expect(report.remoteJsSha256).toBe(report.packagedJsSha256);
        expect(report.assets['plugins/com.salesforce/sdkinfo.js'].remoteSha256)
            .toBe(report.assets['plugins/com.salesforce/sdkinfo.js'].packagedSha256);
    });

    it('rejects stale plugin JavaScript even when core Cordova matches', () => {
        packagedPlugin = 'module.exports = {old: true};\n';

        expect(() => verifyHybridAndroidApp({projectDir, expectedVersion: version, run}))
            .toThrow('plugins/com.salesforce/sdkinfo.js');
    });
});
