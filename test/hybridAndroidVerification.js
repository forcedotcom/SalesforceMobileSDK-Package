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
const crypto = require('crypto');
const {execFileSync} = require('child_process');

function sha256(contents) {
    return crypto.createHash('sha256').update(contents).digest('hex');
}

function javascriptVersion(contents) {
    const match = contents.toString().match(
        /\bPLATFORM_VERSION_BUILD_LABEL\s*=\s*['"]([^'"]+)['"]/);
    return match && match[1];
}

function pluginScripts(directory, prefix = 'plugins') {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
        const file = path.join(directory, entry.name);
        const relative = prefix + '/' + entry.name;
        return entry.isDirectory() ? pluginScripts(file, relative)
            : entry.isFile() && entry.name.endsWith('.js') ? [relative] : [];
    }).sort();
}

function verifyHybridAndroidApp({projectDir, expectedVersion,
    remoteResourcesRequired = false, run = execFileSync}) {
    const androidDir = path.join(projectDir, 'platforms', 'android');
    const options = {cwd: androidDir, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024};
    const platformVersion = run(process.execPath,
        [path.join(androidDir, 'cordova', 'version')], options).trim();
    if (platformVersion !== expectedVersion) {
        throw new Error(`Installed Cordova Android is ${platformVersion}; expected ${expectedVersion}`);
    }
    const manifest = fs.readFileSync(path.join(androidDir, 'app', 'src', 'main',
        'AndroidManifest.xml'), 'utf8');
    if (/__INSERT_[A-Z_]+__/.test(manifest)) {
        throw new Error('Unresolved template placeholders in AndroidManifest.xml; restore app configuration');
    }

    const dependencyArgs = ['--console=plain', ':app:dependencyInsight',
        '--dependency', 'org.apache.cordova:framework',
        '--configuration', 'debugRuntimeClasspath'];
    const windows = process.platform === 'win32';
    const dependencyReport = run(windows ? 'cmd.exe' : path.join(androidDir, 'gradlew'),
        windows ? ['/d', '/c', 'gradlew.bat', ...dependencyArgs] : dependencyArgs, options);
    const selected = dependencyReport.match(
        /^org\.apache\.cordova:framework:([^\s]+)(?: -> ([^\s]+))?/m);
    const frameworkVersion = selected && (selected[2] || selected[1]);
    if (frameworkVersion !== expectedVersion) {
        throw new Error(`Resolved Cordova framework is ${frameworkVersion}; expected ${expectedVersion}`);
    }

    const platformWww = path.join(androidDir, 'platform_www');
    const platformJs = fs.readFileSync(path.join(platformWww, 'cordova.js'));
    if (javascriptVersion(platformJs) !== expectedVersion) {
        throw new Error(`Platform Cordova JavaScript does not identify ${expectedVersion}`);
    }

    const apkDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug');
    const metadata = JSON.parse(fs.readFileSync(path.join(apkDir, 'output-metadata.json'), 'utf8'));
    if (metadata.elements.length !== 1) {
        throw new Error('Expected one debug APK; verify architecture-specific outputs separately');
    }
    const apk = path.join(apkDir, metadata.elements[0].outputFile);
    const assetPaths = ['cordova.js', 'cordova_plugins.js',
        ...pluginScripts(path.join(platformWww, 'plugins'))];
    const remoteDir = path.join(projectDir, 'server', 'force-app', 'main',
        'default', 'staticresources', 'cordovaandroid');
    if (remoteResourcesRequired && !fs.existsSync(remoteDir)) {
        throw new Error('Remote Cordova JavaScript static resource is missing');
    }
    const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hybrid-apk-'));
    const assets = {};
    try {
        const jar = process.env.JAVA_HOME
            ? path.join(process.env.JAVA_HOME, 'bin', windows ? 'jar.exe' : 'jar')
            : 'jar';
        run(jar, ['xf', apk, ...assetPaths.map(file => 'assets/www/' + file)],
            {...options, cwd: temporaryDir});
        for (const file of assetPaths) {
            const platformAsset = fs.readFileSync(path.join(platformWww, file));
            const packagedAsset = fs.readFileSync(path.join(temporaryDir, 'assets', 'www', file));
            if (!platformAsset.equals(packagedAsset)) {
                throw new Error('Packaged Cordova JavaScript differs from platform asset: ' + file);
            }
            const remoteAsset = fs.existsSync(remoteDir)
                ? fs.readFileSync(path.join(remoteDir, file)) : null;
            if (remoteAsset && !remoteAsset.equals(platformAsset)) {
                throw new Error('Remote Cordova JavaScript differs from platform asset: ' + file);
            }
            assets[file] = {
                platformSha256: sha256(platformAsset),
                packagedSha256: sha256(packagedAsset),
                remoteSha256: remoteAsset && sha256(remoteAsset)
            };
        }
    } finally {
        fs.rmSync(temporaryDir, {recursive: true, force: true});
    }
    const configuration = JSON.parse(fs.readFileSync(
        path.join(androidDir, 'cdv-gradle-config.json'), 'utf8'));
    const configurationKeys = ['MIN_SDK_VERSION', 'SDK_VERSION', 'COMPILE_SDK_VERSION',
        'GRADLE_VERSION', 'AGP_VERSION', 'KOTLIN_VERSION', 'IS_GRADLE_PLUGIN_KOTLIN_ENABLED'];
    const nativeDir = path.join(androidDir, 'mobile_sdk', 'SalesforceMobileSDK-Android');
    const nativeSourceRevision = fs.existsSync(path.join(nativeDir, '.git'))
        ? run('git', ['-C', nativeDir, 'rev-parse', 'HEAD'], options).trim()
        : null;
    const pluginManifest = path.join(projectDir, 'plugins', 'com.salesforce', 'plugin.xml');
    const report = {
        platformVersion,
        frameworkVersion,
        platformJsSha256: sha256(platformJs),
        packagedJsSha256: assets['cordova.js'].packagedSha256,
        remoteJsSha256: assets['cordova.js'].remoteSha256,
        assets,
        apkSha256: sha256(fs.readFileSync(apk)),
        pluginManifestSha256: sha256(fs.readFileSync(pluginManifest)),
        nativeSourceRevision,
        androidConfiguration: Object.fromEntries(configurationKeys
            .filter(key => configuration[key] !== undefined)
            .map(key => [key, configuration[key]]))
    };
    fs.writeFileSync(path.join(projectDir, 'hybrid-android-verification.json'),
        JSON.stringify(report, null, 2) + '\n');
    return report;
}

module.exports = {verifyHybridAndroidApp};

if (require.main === module) {
    if (!process.argv[2]) {
        console.error('Usage: node test/hybridAndroidVerification.js <app-directory> [cordova-version] [--require-remote-resources]');
        process.exitCode = 1;
    } else {
        try {
            const expectedVersion = process.argv.slice(3).find(arg => !arg.startsWith('--'))
                || require('../shared/constants')
                .tools.cordova.platformVersion.android;
            console.log(JSON.stringify(verifyHybridAndroidApp({
                projectDir: path.resolve(process.argv[2]), expectedVersion,
                remoteResourcesRequired: process.argv.includes('--require-remote-resources')
            }), null, 2));
        } catch (error) {
            console.error(error.message);
            process.exitCode = 1;
        }
    }
}
