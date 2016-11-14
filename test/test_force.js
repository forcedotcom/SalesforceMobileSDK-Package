#!/usr/bin/env node

// Defaults
var defaultTemplateRepoUrl = ''; // let constants.js drive
var defaultPluginRepoUrl = '';   // let constants.js drive
var defaultSdkBranch = 'unstable';

// Dependencies
var execSync = require('child_process').execSync,
    path = require('path'),
    shelljs = require('shelljs'),
    commandLineUtils = require('../shared/commandLineUtils'),
    utils = require('../shared/utils'),
    SDK = require('../shared/constants'),
    COLOR = require('../shared/outputColors'),
    SDK = require('../shared/constants')
;

// Enums
var OS = {
    ios: 'ios',
    android: 'android'
};

var APP_TYPE = {
    native: 'native',
    native_swift: 'native_swift',
    react_native: 'react_native',
    hybrid_local: 'hybrid_local',
    hybrid_remote: 'hybrid_remote'
};

var FORCE_CLI = {
    ios: 'forceios',
    android: 'forcedroid'
};


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
    var chosenOperatingSystems = cleanSplit(parsedArgs.os, ',');
    var templateRepoUrl = parsedArgs.templaterepourl || defaultTemplateRepoUrl;
    var pluginRepoUrl = parsedArgs.pluginrepourl || defaultPluginRepoUrl;
    var sdkBranch = parsedArgs.sdkbranch || defaultSdkBranch;
    
    var chosenAppTypes = cleanSplit(parsedArgs.apptype, ',');
    var testingIOS = chosenOperatingSystems.indexOf(OS.ios) >= 0;
    var testingAndroid = chosenOperatingSystems.indexOf(OS.android) >= 0;
    var testingHybrid = chosenAppTypes.indexOf(APP_TYPE.hybrid_local) >= 0 || chosenAppTypes.indexOf(APP_TYPE.hybrid_remote) >= 0;

    // Validation
    validateOperatingSystems(chosenOperatingSystems);
    validateAppTypes(chosenAppTypes);

    // Usage
    if (usageRequested || (!testingIOS && !testingAndroid) || chosenAppTypes.length === 0) {
        usage();
        process.exit(1);
    }

    // Actual testing
    var tmpDir = utils.mkTmpDir();

    // forceios
    if (testingIOS) {
        createDeployForcePackage(tmpDir, OS.ios);
    }

    // forcedroid
    if (testingAndroid) {
        createDeployForcePackage(tmpDir, OS.android);
    }

    // Get cordova plugin repo if any hybrid testing requested
    if (testingHybrid) {
        var pluginRepoDir = utils.cloneRepo(tmpDir, pluginRepoUrl);
        if (testingIOS) updatePluginRepo(tmpDir, OS.ios, pluginRepoDir, sdkBranch);
        if (testingAndroid) updatePluginRepo(tmpDir, OS.android, pluginRepoDir, sdkBranch);
    }
    
    // Test all the platforms / app types requested
    for (var i=0; i<chosenOperatingSystems.length; i++) {
        var os = chosenOperatingSystems[i];
        for (var j=0; j<chosenAppTypes.length; j++) {
            var appType = chosenAppTypes[j];
            createCompileApp(tmpDir, os, appType, templateRepoUrl, pluginRepoUrl);
        }
    }
}

//
// Usage
//
function usage() {
    utils.log('Usage:',  COLOR.cyan);
    utils.log('  test_force.js --usage', COLOR.magenta);
    utils.log('OR ', COLOR.cyan);
    utils.log('  test_force.js', COLOR.magenta);
    utils.log('    --os=os1,os2,etc', COLOR.magenta);
    utils.log('    --apptype=appType1,appType2,etc', COLOR.magenta);
    utils.log('    [--templaterepourl=TEMPLATE_REPO_URL (Defaults to https://github.com/forcedotcom/SalesforceMobileSDK-Templates#unstable)]', COLOR.magenta);
    utils.log('    [--pluginrepourl=PLUGIN_REPO_URL (Defaults to https://github.com/forcedotcom/SalesforceMobileSDK-Templates#unstable)]', COLOR.magenta);
    utils.log('    [--sdkbranch=SDK_BRANCH (Defaults to unstable)]', COLOR.magenta);
    utils.log('  Where:', COLOR.cyan);
    utils.log('  - osX is : ios or android', COLOR.cyan);
    utils.log('  - appTypeX is: native, native_swift, react_native, hybrid_local or hybrid_remote', COLOR.cyan);
    utils.log('', COLOR.cyan);
    utils.log('  If hybrid is targeted, the following are first done:', COLOR.cyan);
    utils.log('  - clones PLUGIN_REPO_URL ', COLOR.cyan);
    utils.log('  - runs ./tools/update.sh -b SDK_BRANCH to update clone of plugin repo', COLOR.cyan);
    utils.log('', COLOR.cyan);
    utils.log('  If ios is targeted:', COLOR.cyan);
    utils.log('  - generates forceios package and deploys it to a temporary directory', COLOR.cyan);
    utils.log('  - creates and compile the application types using specified template and plugin', COLOR.cyan);
    utils.log('', COLOR.cyan);
    utils.log('  If android is targeted:', COLOR.cyan);
    utils.log('  - generates forcedroid package and deploys it to a temporary directory', COLOR.cyan);
    utils.log('  - creates and compile the application types using specified template and plugin', COLOR.cyan);
}

//
// Create and deploy forceios/forcedroid
//
function createDeployForcePackage(tmpDir, os) {
    var packJs = path.join(__dirname, '..', 'shared', 'pack.js');
    utils.runProcessThrowError('node ' + packJs + ' --os=' + os);
    utils.runProcessThrowError('npm install --prefix ' + tmpDir + ' ' + FORCE_CLI[os] + '-' + SDK.version + '.tgz');
}

//
// Update cordova plugin repo
//
function updatePluginRepo(tmpDir, os, pluginRepoDir, sdkBranch) {
    utils.log('Updating cordova plugin at ' + sdkBranch);
    utils.runProcessThrowError(path.join('tools', 'update.sh') + ' -b ' + sdkBranch + ' -o ' + os, pluginRepoDir);
}

//
// Create and compile app 
//
function createCompileApp(tmpDir, os, appType, templateRepoUrl, pluginRepoUrl) {
    if (appType === APP_TYPE.native_swift && os === OS.android) return; // that app type doesn't exist for android

    var isNative = appType.indexOf('native') >= 0;
    var target = appType + ' app for ' + os;
    var appName = appType + os + 'App';
    var outputDir = path.join(tmpDir, appName);
    var forcePath = path.join(tmpDir, 'node_modules', '.bin', FORCE_CLI[os]);

    var forceArgs = 'createWithTemplate '
        + ' --apptype=' + appType
        + ' --appname=' + appName
        + ' --packagename=com.mycompany'
        + ' --organization=MyCompany'
        + ' --outputdir=' + outputDir
        + (isNative ? '' : ' --startpage=/apex/testPage')
        + ' --templaterepourl=' + templateRepoUrl
        + ' --pluginrepourl=' + pluginRepoUrl

    // Generation
    var generationSucceeded = utils.runProcessCatchError(forcePath + ' ' + forceArgs, 'GENERATING ' + target);

    if (!generationSucceeded) {
        return; // no point continuing
    }

    // App dir
    var appDir = appType === APP_TYPE.react_native ? path.join(outputDir, os) : outputDir;

    // Compilation
    if (isNative) {
        if (os == OS.ios) {
            // IOS - Native
            var workspacePath = path.join(appDir, appName + '.xcworkspace');
            utils.runProcessCatchError('xcodebuild -workspace ' + workspacePath 
                                 + ' -scheme ' + appName
                                 + ' clean build CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO', 
                                 'COMPILING ' + target); 
        }
        else {
            // Android - Native
            var appDir = appType === APP_TYPE.react_native ? path.join(outputDir, os) : outputDir;
            var gradle = isWindows() ? '.\\gradlew.bat' : './gradlew';
            utils.runProcessCatchError(gradle + ' assembleDebug', 'COMPILING ' + target, appDir);
        }
    }
    else {
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
function validateOperatingSystems(chosenOperatingSystems) {
    for (var i=0; i<chosenOperatingSystems.length; i++) {
        var os = chosenOperatingSystems[i];
        if (!OS.hasOwnProperty(os) || (isWindows() && os === OS.ios)) {
            log('Invalid os: ' + os, COLOR.red);
            process.exit(1);
        }
    }
}

// 
// Helper to validate app types
//
function validateAppTypes(chosenAppTypes) {
    for (var i=0; i<chosenAppTypes.length; i++) {
        var appType = chosenAppTypes[i];
        if (!APP_TYPE.hasOwnProperty(appType)) {
            utils.log('Invalid appType: ' + appType, COLOR.red);
            process.exit(1);
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
