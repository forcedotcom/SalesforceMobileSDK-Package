#!/usr/bin/env node

// Defaults
var defaultSdkBranch = 'dev';

// Dependencies
var spawnSync = require('child_process').spawnSync,
    path = require('path'),
    shelljs = require('shelljs'),
    commandLineUtils = require('../shared/commandLineUtils'),
    utils = require('../shared/utils'),
    templateHelper = require('../shared/templateHelper.js'),
    SDK = require('../shared/constants'),
    COLOR = require('../shared/outputColors')
;

// Enums
var OS = {
    ios: 'ios',
    android: 'android'
};

var APP_TYPE = {
    native: 'native',
    native_swift: 'native_swift',
    native_kotlin: 'native_kotlin',
    react_native: 'react_native',
    hybrid_local: 'hybrid_local',
    hybrid_remote: 'hybrid_remote'
};

var defaultStartPage = '/apex/testPage';

// Calling main
main(process.argv);

//
// Main function
//
function main(args) {
    var commandLineArgs = process.argv.slice(2, args.length);
    var parsedArgs = commandLineUtils.parseArgs(commandLineArgs);

    // Args extraction
    var usageRequested = parsedArgs.hasOwnProperty('usage');
    var testProduction = parsedArgs.hasOwnProperty('test-production');
    var useSfdxRequested = parsedArgs.hasOwnProperty('use-sfdx');
    var exitOnFailure = parsedArgs.hasOwnProperty('exit-on-failure');
    var chosenOperatingSystems = cleanSplit(parsedArgs.os, ',').map(function(s) { return s.toLowerCase(); });
    var templateRepoUri = parsedArgs.templaterepouri || '';
    var pluginRepoUri = !testProduction ? (parsedArgs.pluginrepouri || SDK.tools.cordova.pluginRepoUri) : '';
    var sdkBranch = parsedArgs.sdkbranch || defaultSdkBranch;
    var chosenAppTypes = cleanSplit(parsedArgs.apptype, ',');
    var chosenClis = cleanSplit(parsedArgs.cli, ',');

    var testingWithOS = chosenOperatingSystems.length > 0;
    var testingWithClis = chosenClis.length > 0;
    var testingWithAppType = chosenAppTypes.length > 0;
    var testingWithTemplate = templateRepoUri != '';

    var testingHybrid = chosenAppTypes.some(t=>t.indexOf("hybrid") >= 0) || chosenClis.indexOf("forcehybrid") >= 0;
    var testingIOS = chosenOperatingSystems.indexOf(OS.ios) >= 0;
    var testingAndroid = chosenOperatingSystems.indexOf(OS.android) >= 0;

    // Usage
    if (usageRequested) {
        usage(0);
    }

    // Validation
    validateOperatingSystemsClis(chosenOperatingSystems, chosenClis);
    if (chosenClis.length == 0) validateAppTypesTemplateRepoUri(testingWithOS, chosenAppTypes, templateRepoUri);

    // Actual testing
    var tmpDir = utils.mkTmpDir();

    // Install sfdx plugin or force clis
    if (useSfdxRequested) {
        if (testProduction) {
            // Install publised sfdx plugin
            installPublishedSfdxPlugin(tmpDir);
        }
        else {
            // Create sfdx plugin
            createDeploySfdxPluginPackage(tmpDir);
        }
    }
    else {
        var forceClis= [];

        if (testingWithClis) {
            for (var i=0; i<chosenClis.length; i++) {
                var cliName = chosenClis[i];
                forceClis.push(SDK.forceclis[cliName]);
            }
        }
        else {
            // Getting appType if template specified
            if (testingWithTemplate) {
                chosenAppTypes = [templateHelper.getAppTypeFromTemplate(templateRepoUri)];
            }

            for (var cliName in SDK.forceclis) {
                var cli = SDK.forceclis[cliName];
                if (cli.platforms.some(p=>chosenOperatingSystems.indexOf(p)>=0)
                    && cli.appTypes.some(a=>chosenAppTypes.indexOf(a)>=0)) {

                    forceClis.push(cli);
                }
            }
        }


        for (var i=0; i<forceClis.length; i++) {
            var cli = forceClis[i];

            if (testProduction) {
                // Install forcexxx package
                installPublishedForceCli(tmpDir, cli);
            }
            else {
                // Create forcexxx packages needed
                createDeployForcePackage(tmpDir, cli);
            }
        }
    }

    // Get cordova plugin repo if any hybrid testing requested
    if (testingHybrid) {
        if (!testProduction && pluginRepoUri.indexOf('//') >= 0) {
            // Actual uri - clone repo - run tools/update.sh
            var pluginRepoDir = utils.cloneRepo(tmpDir, pluginRepoUri);
            if (testingIOS && testingAndroid) updatePluginRepo(tmpDir, 'all', pluginRepoDir, sdkBranch);
            if (testingIOS && !testingAndroid) updatePluginRepo(tmpDir, OS.ios, pluginRepoDir, sdkBranch);
            if (testingAndroid && !testingIOS) updatePluginRepo(tmpDir, OS.android, pluginRepoDir, sdkBranch);
            // Use local updated clone of plugin
            pluginRepoUri = pluginRepoDir;
        }
    }

    // Set exit on failure to true
    if (exitOnFailure) {
        utils.setExitOnFailure(true);
    }

    // Test all the platforms / app types requested
    if (testingWithClis) {
        for (var i=0; i<chosenClis.length; i++) {
            var cliName = chosenClis[i];
            var templates = templateHelper.getTemplates(SDK.forceclis[cliName]);
            for (var j=0; j<templates.length; j++) {
                var template = templates[j];
                for (var k=0; k<template.platforms.length; k++) {
                    var os = template.platforms[k];
                    if (chosenOperatingSystems.length == 0 || chosenOperatingSystems.indexOf(os) >= 0) {
                        createCompileApp(tmpDir, os, template.appType, template.url, pluginRepoUri, useSfdxRequested);
                    }
                }
            }
        }
    }
    else {
        for (var i=0; i<chosenOperatingSystems.length; i++) {
            var os = chosenOperatingSystems[i];
            if (testingWithAppType) {
                for (var j=0; j<chosenAppTypes.length; j++) {
                    var appType = chosenAppTypes[j];
                    createCompileApp(tmpDir, os, appType, null, pluginRepoUri, useSfdxRequested);
                }
            }

            if (testingWithTemplate) {
                // NB: chosenAppTypes[0] is appType from template
                createCompileApp(tmpDir, os, chosenAppTypes[0], templateRepoUri, pluginRepoUri, useSfdxRequested);
            }
        }
    }
}

//
// Usage
//
function shortUsage(exitCode) {
    utils.logInfo('Usage:\n',  COLOR.cyan);
    utils.logInfo('  test_force.js --usage', COLOR.magenta);
    utils.logInfo('\n OR \n', COLOR.cyan);
    utils.logInfo('  test_force.js', COLOR.magenta);
    utils.logInfo('    --os=os1,os2,etc  OR --cli=cli1,cli2,etc', COLOR.magenta);
    utils.logInfo('    (when using --os) --apptype=appType1,appType2,etc OR --templaterepouri=TEMPLATE_REPO_URI', COLOR.magenta);
    utils.logInfo('    [--use-sfdx]', COLOR.magenta);
    utils.logInfo('    [--test-production]', COLOR.magenta);
    utils.logInfo('    [--exit-on-failure]', COLOR.magenta);
    utils.logInfo('    [--pluginrepouri=PLUGIN_REPO_URI (Defaults to uri in shared/constants.js)]', COLOR.magenta);
    utils.logInfo('    [--sdkbranch=SDK_BRANCH (Defaults to dev)]', COLOR.magenta);
    utils.logInfo('', COLOR.cyan);
    utils.logInfo('  Where:', COLOR.cyan);
    utils.logInfo('  - osX is : ios or android', COLOR.cyan);
    utils.logInfo('  - cliX is : forceios or forcedroid or forcehybrid or forcereact', COLOR.cyan);
    utils.logInfo('  - appTypeX is: native, native_swift, native_kotlin, react_native, hybrid_local or hybrid_remote', COLOR.cyan);
    utils.logInfo('  - templaterepouri is a template repo uri e.g. https://github.com/forcedotcom/SalesforceMobileSDK-Templates/SmartSyncExplorerReactNative#dev', COLOR.cyan);
    utils.logInfo('', COLOR.cyan);

    if (typeof(exitCode) !== 'undefined') {
        process.exit(exitCode);
    }
}

function usage(exitCode) {
    shortUsage();

    utils.logInfo('  If a cli is targeted:', COLOR.cyan);
    utils.logInfo('  - generates cli package and deploys it to a temporary directory', COLOR.cyan);
    utils.logInfo('  - fetches list of applicable templates for that cli', COLOR.cyan);
    utils.logInfo('  - creates and compiles applications for specified operating systems and applicable templates', COLOR.cyan);
    utils.logInfo('', COLOR.cyan);
    utils.logInfo('  If hybrid is targeted:', COLOR.cyan);
    utils.logInfo('  - clones PLUGIN_REPO_URI ', COLOR.cyan);
    utils.logInfo('  - runs ./tools/update.sh -b SDK_BRANCH to update clone of plugin repo', COLOR.cyan);
    utils.logInfo('  - generates forcehybrid package and deploys it to a temporary directory', COLOR.cyan);
    utils.logInfo('  - creates and compiles applications for specified operating systems, template and plugin', COLOR.cyan);
    utils.logInfo('', COLOR.cyan);
    utils.logInfo('  If apptype is react_native:', COLOR.cyan);
    utils.logInfo('  - generates forcereact package and deploys it to a temporary directory', COLOR.cyan);
    utils.logInfo('  - creates and compiles applications for specified operating systems and template', COLOR.cyan);
    utils.logInfo('', COLOR.cyan);
    utils.logInfo('  If ios is targeted (and apptype is a native type):', COLOR.cyan);
    utils.logInfo('  - generates forceios package and deploys it to a temporary directory', COLOR.cyan);
    utils.logInfo('  - creates and compiles applications for specified operating systems and template', COLOR.cyan);
    utils.logInfo('', COLOR.cyan);
    utils.logInfo('  If android is targeted (and apptype is a native type):', COLOR.cyan);
    utils.logInfo('  - generates forcedroid package and deploys it to a temporary directory', COLOR.cyan);
    utils.logInfo('  - creates and compiles applications for specified operating systems and template', COLOR.cyan);
    utils.logInfo('', COLOR.cyan);
    utils.logInfo('  If use-sfdx is specified, then the sfdx-mobilesdk-plugin package is generated and used through sfdx for creating the applications', COLOR.cyan);
    utils.logInfo('', COLOR.cyan);
    utils.logInfo('  If test-production is specified, then the published forceios/forcedroid/forcehybrid/forcereact/sfdx-mobilesdk-plugin are used', COLOR.cyan);

    process.exit(exitCode);
}

//
// Create and deploy forceios/forcedroid/forcehybrid/forcereact
//
function createDeployForcePackage(tmpDir, forcecli) {
    var packJs = path.join(__dirname, '..', 'pack', 'pack.js');
    utils.runProcessThrowError('node ' + packJs + ' --cli=' + forcecli.name);
    utils.logInfo('Npm installing ' + forcecli.name + '-' + SDK.version + '.tgz', COLOR.green);
    utils.runProcessThrowError('npm install --prefix ' + tmpDir + ' ' + forcecli.name + '-' + SDK.version + '.tgz');
}

//
// Install published forceios/forcedroid/forcehybrid/forcereact
//
function installPublishedForceCli(tmpDir, forcecli) {
    utils.logInfo('Npm installing ' + forcecli.name, COLOR.green);
    utils.runProcessThrowError('npm install --prefix ' + tmpDir + ' ' + forcecli.name);
}

//
// Create and deploy sfdx plugin
//
function createDeploySfdxPluginPackage(tmpDir) {
    var packJs = path.join(__dirname, '..', 'pack', 'pack.js');
    utils.runProcessThrowError('node ' + packJs + ' --sfdx-plugin');
    utils.logInfo('Npm installing sfdx-mobilesdk-plugin-' + SDK.version + '.tgz', COLOR.green);
    utils.runProcessThrowError('npm install --prefix ' + tmpDir + ' ' + 'sfdx-mobilesdk-plugin-' + SDK.version + '.tgz');
    utils.runProcessCatchError('sfdx plugins:uninstall sfdx-mobilesdk-plugin');
    utils.logInfo('Sfdx linking sfdx-mobilesdk-plugin', COLOR.green);

    var oclifManifestPath = path.join(__dirname, '..', 'sfdx', 'oclif.manifest.json');
    var mobileSdkTmpPath = path.join(tmpDir, 'node_modules', 'sfdx-mobilesdk-plugin');

    utils.runProcessThrowError(`ls ${oclifManifestPath}`);

    console.log(`Copying file: ${oclifManifestPath} to ${mobileSdkTmpPath}`);

    // Gotta copy the oclif manifest to the target link folder.
    utils.runProcessThrowError(`cp ${oclifManifestPath} ${mobileSdkTmpPath}`);
    utils.runProcessThrowError('sfdx plugins:link ' + tmpDir + '/node_modules/sfdx-mobilesdk-plugin');
    console.log('-- Finished plugins link --');
}

//
// Installed published sfdx plugin
//
function installPublishedSfdxPlugin(tmpDir) {
    utils.runProcessCatchError('sfdx plugins:uninstall sfdx-mobilesdk-plugin');
    utils.logInfo('Sfdx installing sfdx-mobilesdk-plugin', COLOR.green);
    // Plugin is not signed, user interaction is required to install it, so we have to pipe a 'y' in
    spawnSync('sfdx', ['plugins:install', 'sfdx-mobilesdk-plugin'], {input: spawnSync('echo', ['y']).stdout});
}

//
// Update cordova plugin repo
//
function updatePluginRepo(tmpDir, os, pluginRepoDir, sdkBranch) {
    utils.logInfo('Updating cordova plugin at ' + sdkBranch, COLOR.green);
    utils.runProcessThrowError(path.join('tools', 'update.sh') + ' -b ' + sdkBranch + ' -o ' + os, pluginRepoDir);
}

function cleanName(name) {
    return name.replace(/[#-\.]/g, '_')
}

//
// Create and compile app
//
function createCompileApp(tmpDir, os, actualAppType, templateRepoUri, pluginRepoUri, useSfdxRequested) {
    var execArgs = '';
    var isNative = actualAppType.indexOf('native') == 0;
    var isReactNative = actualAppType === APP_TYPE.react_native;
    var isHybrid = actualAppType.indexOf('hybrid') == 0;
    var isHybridRemote = actualAppType === APP_TYPE.hybrid_remote;
    var templateName = getTemplateNameFromUri(templateRepoUri);
    if (templateName && templateName.indexOf('HybridRemoteTemplate') == 0) {
        // XXX createwithtemplate doesn't work for hybrid remote template
        //     because the arg validation only accept startpage if apptype is available as an arg
        //
        // As a work around, we make sure create with --apptype=xxx is called instead of createwithtemplate
        templateRepoUri = null;
    }
    var target = actualAppType + ' app for ' + os + (templateRepoUri ? ' based on template ' + templateName : '');
    var appName = 'App_' + (templateRepoUri ? cleanName(templateName) : actualAppType) + '_' + os;
    // Add app type unless the app is native or react native iOS
    var packageSuffix = (os === OS.ios && !isHybrid) ? '' : '.' + actualAppType;
    // "native" is an illegal word for android package
    if (actualAppType === APP_TYPE.native) {
        packageSuffix = packageSuffix.replace('native', 'native_java');
    }
    var packageName = 'com.salesforce' + packageSuffix;
    var outputDir = path.join(tmpDir, appName);
    var forcecli = (isReactNative
                    ? SDK.forceclis.forcereact
                    : (isHybrid
                       ? SDK.forceclis.forcehybrid
                       : (os == OS.ios
                          ? SDK.forceclis.forceios
                          : SDK.forceclis.forcedroid
                         )
                      )
                   );

    var execPath = useSfdxRequested
        ? 'sfdx mobilesdk:' + forcecli.topic + ':'
        : path.join(tmpDir, 'node_modules', '.bin', forcecli.name) + ' ';

    if (!templateRepoUri) {
        if (actualAppType === APP_TYPE.native_swift && os === OS.android) return; // that app type doesn't exist for android
        if (actualAppType === APP_TYPE.native_kotlin && os === OS.ios) return; // that app type doesn't exist for ios

        execArgs = 'create ';
        if (forcecli.appTypes.length > 1) {
            execArgs += ' --apptype=' + actualAppType;
        }
    }
    else {
        execArgs = 'createwithtemplate '
            + ' --templaterepouri=' + templateRepoUri;
    }

    if (forcecli.platforms.length > 1) {
        execArgs += ' --platform=' + os;
    }

    execArgs += ''
        + ' --appname=' + appName
        + ' --packagename=' + packageName
        + ' --organization=Salesforce'
        + ' --outputdir=' + outputDir
        + ' --verbose'
        + (isHybridRemote ? ' --startpage=' + defaultStartPage : '')
        + (isHybrid && pluginRepoUri ? ' --pluginrepouri=' + pluginRepoUri : '');

    // Generation
    var generationSucceeded = utils.runProcessCatchError(execPath + execArgs, 'GENERATING ' + target);

    if (!generationSucceeded) {
        return; // no point continuing
    }

    // App dir
    var appDir = actualAppType === APP_TYPE.react_native ? path.join(outputDir, os) : outputDir;

    // Compilation
    if (isNative || isReactNative) {
        if (os == OS.ios) {
            // IOS - Native
            var workspacePath = path.join(appDir, appName + '.xcworkspace');
            utils.runProcessCatchError('xcodebuild -workspace ' + workspacePath
                                       + ' -scheme ' + appName
                                       + ' clean build CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO',
                                       'COMPILING ' + target);
        }
        else {
            // Android - Native
            var appDir = actualAppType === APP_TYPE.react_native ? path.join(outputDir, os) : outputDir;
            var gradle = isWindows() ? '.\\gradlew.bat' : './gradlew';
            utils.runProcessCatchError(gradle + ' assembleDebug', 'COMPILING ' + target, appDir);
        }
    }
    else {
        if (isHybridRemote) {
            utils.runProcessCatchError("grep '\"startPage\": \"" + defaultStartPage + "\"' "  + appDir + '/www/bootconfig.json',  "bootconfig.json should be updated to reflect user input remote url.");
        }
        if (os == OS.ios) {
            // IOS - Hybrid
            utils.runProcessCatchError('cordova build', 'COMPILING ' + target, appDir);
        }
        else {
            // Android - Hybrid
            var gradle = isWindows() ? '.\\gradlew.bat' : './gradlew';
            utils.runProcessCatchError(gradle + ' assembleDebug', 'COMPILING ' + target, path.join(appDir, 'platforms', 'android'));
        }
    }
}

//
// Helper to validate operating systems
//
function validateOperatingSystemsClis(chosenOperatingSystems, chosenClis) {
    if (chosenOperatingSystems.length == 0 && chosenClis.length == 0) {
        utils.logError('You need to specify at least one os or one cli\n');
        shortUsage(1);
    }
    for (var i=0; i<chosenOperatingSystems.length; i++) {
        var os = chosenOperatingSystems[i];
        if (!OS.hasOwnProperty(os) || (isWindows() && os === OS.ios)) {
            utils.logError('Invalid os: ' + os + '\n');
            shortUsage(1);
        }
    }

    for (var i=0; i<chosenClis.length; i++) {
        var cliName = chosenClis[i];
        if (!SDK.forceclis.hasOwnProperty(cliName)) {
            utils.logError('Invalid cli: ' + cliName + '\n');
            shortUsage(1);
        }
    }

}

//
// Helper to validate app types / template repo uri
//
function validateAppTypesTemplateRepoUri(testingWithOS, chosenAppTypes, templateRepoUri) {
    if (testingWithOS) {
        if (!(chosenAppTypes.length == 0 ^ templateRepoUri === '')) {
            utils.logError('You need to specify apptype or templaterepouri (but not both)\n');
            shortUsage(1);
        }

        for (var i=0; i<chosenAppTypes.length; i++) {
            var appType = chosenAppTypes[i];
            if (!APP_TYPE.hasOwnProperty(appType)) {
                utils.logError('Invalid appType: ' + appType + '\n');
                shortUsage(1);
            }
        }
    }
    else {
        if (chosenAppTypes.length != 0 || templateRepoUri !== '') {
            utils.logError('You only need to specify apptype or templaterepouri with --os\n');
            shortUsage(1);
        }
    }
}


//
// Like split, but splitting null returns [] instead of throwing an error
//                 splitting '' returns [] instead of ['']
//
//
function cleanSplit(str, delimiter) {
    if (str == null || str === '') {
        return [];
    }
    else {
        return str.split(delimiter);
    }
}

//
// Return true if running on Windows
//
function isWindows() {
    return /^win/.test(process.platform);
}

//
// Get template name from uri
//
function getTemplateNameFromUri(templateRepoUri) {
    var parts = cleanSplit(templateRepoUri, '/');
    return parts[parts.length-1];
}
