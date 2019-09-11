#!/usr/bin/env node

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
    var useSfdxRequested = parsedArgs.hasOwnProperty('use-sfdx');
    var noPluginUpdate = parsedArgs.hasOwnProperty('no-plugin-update');
    var exitOnFailure = parsedArgs.hasOwnProperty('exit-on-failure');
    var chosenOperatingSystems = cleanSplit(parsedArgs.os, ',').map(function(s) { return s.toLowerCase(); });
    var templateRepoUri = parsedArgs.templaterepouri || '';
    var pluginRepoUri = parsedArgs.pluginrepouri || SDK.tools.cordova.pluginRepoUri;
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
        // Create sfdx plugin
        createDeploySfdxPluginPackage(tmpDir);
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

            // Create forcexxx packages needed
            createDeployForcePackage(tmpDir, cli);
        }
    }

    // Get cordova plugin repo if any hybrid testing requested
    if (testingHybrid) {
        var sdkBranch = utils.separateRepoUrlPathBranch(pluginRepoUri).branch;

        // Using updated local clone of plugin repo if pluginRepoUri does not point to tag and noPluginUpdate is false
        if (!pluginRepoUri.indexOf('//') >= 0 && !sdkBranch.match(/v[0-9.]+/) && !noPluginUpdate) {
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
    utils.logInfo('    [--exit-on-failure]', COLOR.magenta);
    utils.logInfo('    [--pluginrepouri=PLUGIN_REPO_URI (Defaults to uri in shared/constants.js)]', COLOR.magenta);
    utils.logInfo('    [--no-plugin-update]', COLOR.magenta);
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
    utils.logInfo('  - if plugin_repo_uri points to a branch, use local clone of plugin repo (where we first run ./tools/update.sh)', COLOR.cyan);
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

    utils.logInfo(`Copying file: ${oclifManifestPath} to ${mobileSdkTmpPath}`, COLOR.green);

    // Gotta copy the oclif manifest to the target link folder.
    utils.runProcessThrowError(`cp ${oclifManifestPath} ${mobileSdkTmpPath}`);
    utils.runProcessThrowError('sfdx plugins:link ' + tmpDir + '/node_modules/sfdx-mobilesdk-plugin');
    utils.logInfo('-- Finished plugins link --', COLOR.green);
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
//
// Create and compile app
//
function createCompileApp(tmpDir, os, actualAppType, templateRepoUri, pluginRepoUri, useSfdxRequested) {
    var execArgs = '';
    var isNative = actualAppType.indexOf('native') == 0;
    var isReactNative = actualAppType === APP_TYPE.react_native;
    var isHybrid = actualAppType.indexOf('hybrid') == 0;
    var isHybridRemote = actualAppType === APP_TYPE.hybrid_remote;
    if (isHybridRemote) {
        // XXX createwithtemplate doesn't work for hybrid remote template
        //     because the arg validation only accept startpage if apptype is available as an arg
        //
        // As a work around, we make sure create with --apptype=xxx is called instead of createwithtemplate
        templateRepoUri = null;
    }
    var target = computeTargetDescription(os, actualAppType, templateRepoUri);
    var appName = computeAppName(os, actualAppType, templateRepoUri);
    var packageName = computePackageName(os, actualAppType, appName);

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
    var workspaceDir;
    // Compilation
    if (isNative) {
        workspaceDir = outputDir;
    } else if (isHybrid) {
        workspaceDir = path.join(outputDir, 'platforms', os);
        if (isHybridRemote) {
            utils.runProcessCatchError("grep '\"startPage\": \"" + defaultStartPage + "\"' "  + path.join(outputDir, 'www', 'bootconfig.json'),  "bootconfig.json should be updated to reflect user input remote url.");
        }

    } else if (isReactNative) {
        workspaceDir = path.join(outputDir, os);
    }
    
    if (os == OS.ios) {
        buildForiOS(target, workspaceDir, appName);
    }
    else {
        buildForAndroid(target, workspaceDir);
    }
}

function buildForiOS(target, workspaceDir, appName) {
    utils.runProcessCatchError('xcodebuild -workspace ' + path.join(workspaceDir, appName + '.xcworkspace')
                               + ' -scheme ' + appName
                               + ' clean build CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO CODE_SIGNING_ALLOWED=NO',
                               'COMPILING ' + target);
}

function buildForAndroid(target, workspaceDir) {
    var gradle = isWindows() ? '.\\gradlew.bat' : './gradlew';
    utils.runProcessCatchError(gradle + ' assembleDebug', 'COMPILING ' + target, workspaceDir);
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
// e.g. https://github.com/forcedotcom/SalesforceMobileSDK-Templates/iOSNativeTemplate#dev --> iOSNativeTemplate
//
function getTemplateNameFromUri(templateRepoUri) {
    var parts = cleanSplit(cleanSplit(templateRepoUri, '#')[0], '/');
    return parts[parts.length-1];
}


//
// Get template version from uri
// e.g. https://github.com/forcedotcom/SalesforceMobileSDK-Templates/iOSNativeTemplate#dev --> dev
//
function getTemplateVersionFromUri(templateRepoUri) {
    var parts = cleanSplit(templateRepoUri, '#');
    return parts.length == 2 ? parts[1] : 'master';
}

//
// Compute app name
// Try to keep name short (drop the word template if present) but unique (prepend os if not present)
//
function computeAppName(os, actualAppType, templateRepoUri) {
    var appName;
    if (templateRepoUri) {
        appName = getTemplateNameFromUri(templateRepoUri).toLowerCase();
    } else {
        appName = actualAppType.replace(/_/g, '');
    }

    // Prepending os if not already in name
    if (appName.indexOf(os) == -1) {
        appName = os + appName;
    }

    // Removing template if in name
    appName = appName.replace(/template/g, '');

    return appName;
}

//
// Compute target description
// 
function computeTargetDescription(os, actualAppType, templateRepoUri) {
    return actualAppType + ' app for ' + os
        + (templateRepoUri
           ? ' based on template ' + getTemplateNameFromUri(templateRepoUri) + ' (' + getTemplateVersionFromUri(templateRepoUri) + ')'
           : '');    
}

//
// Compute app package
//
function computePackageName(os, actualAppType, appName) {
    var isHybrid = actualAppType === APP_TYPE.hybrid_local || actualAppType === APP_TYPE.hybrid_remote;
    return 'com.salesforce' + (os === OS.ios && !isHybrid ? '' : '.' + appName);
}
    
