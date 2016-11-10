#!/usr/bin/env node

// Dependencies
var execSync = require('child_process').execSync,
    path = require('path'),
    commandLineUtils = require('./commandLineUtils'),
    utils = require('./utils'),
    shelljs = require('shelljs'),
    SDK = require('./constants'),
    COLOR = require('./outputColors'),
    SDK = require('./constants')
;

// Enums
var OS = {
    ios,
    android
};

var APP_TYPE = {
    'native',
    native_swift,
    react_native,
    hybrid_local,
    hybrid_remote
};

// Defaults
var defaultTemplateRepoUrl = 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#unstable';
var defaultPluginRepoUrl = 'https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#unstable';
var defaultSdkBranch = 'unstable';

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
    var templatePath = parsedArgs.templatepath || '';
    var pluginRepoUrl = parsedArgs.pluginrepourl || defaultPluginRepoUrl;
    var sdkBranch = parsedArgs.sdkbranch || defaultSdkBranch;
    
    var chosenAppTypes = cleanSplit(parsedArgs.test, ',');
    var testingIOS = chosenOperatingSystems.indexOf(OS.ios) >= 0;
    var testingAndroid = chosenOperatingSystems.indexOf(OS.android) >= 0;
    var testingHybrid = chosenAppTypes.indexOf(APP_TYPE.hybrid_local) >= 0 || chosenAppTypes.indexOf(APP_TYPE.hybrid_remote) >= 0;

    // Validation
    validateVersion(version);
    validateOperatingSystems(chosenOperatingSystems);
    validateAppTypes(chosenAppTypes);

    // Usage
    if (usageRequested || (!testingIOS && !testingAndroid) || chosenAppTypes.length === 0) {
        usage();
        process.exit(1);
    }

    // Actual testing
    cleanup();
    var tmpDir = utils.mkTmpDir();

    // Get ios repo if requested
    if (testingIOS) {
        createDeployForcePackage(tmpDir, OS.ios);
    }

    // Get android repo if requested
    if (testingAndroid) {
        createDeployForcePackage(tmpDir, OS.android);
    }

    // Get cordova plugin repo if any hybrid testing requested
    if (testingHybrid) {
        var pluginRepoDir = utils.cloneRepo(tmpDir, pluginRepoUrl);
        if (testingIOS) updatePluginRepo(tmpDir, pluginRepoDir, sdkBranch, OS.ios);
        if (testingAndroid) updatePluginRepo(tmpDir, pluginRepoDir, sdkBranch, OS.android);
    }
    
    // Test all the platforms / app types requested
    for (var i=0; i<chosenOperatingSystems.length; i++) {
        var os = chosenOperatingSystems[i];
        for (var j=0; j<chosenAppTypes.length; j++) {
            var appType = chosenAppTypes[j];
            createCompileApp(tmpDir, appType, os);
        }
    }
}

//
// Usage
//
function usage() {
    log('Usage:',  COLOR.cyan);
    log('  test_force.js --usage\n'
        + 'OR \n'
        + '  test_force.js\n'
        + '    --os=os1,os2,etc\n'
        + '      where osN are : ios, android\n'
        + '    --test=appType1,appType2,etc\n'
        + '      where appTypeN are in: native, native_swift, react_native, hybrid_local, hybrid_remote\n'
        + '    [--templaterepourl=TEMPLATE_REPO_URL (Defaults to https://github.com/forcedotcom/SalesforceMobileSDK-Templates#unstable)]\n'
        + '    [--templatepath=TEMPLATE_PATH (Optional.)]\n'
        + '    [--pluginrepourl=PLUGIN_REPO_URL (Defaults to https://github.com/forcedotcom/SalesforceMobileSDK-Templates#unstable)]\n'
        + '    [--sdkbranch=SDK_BRANCH (Defaults to unstable)]\n'
        + '\n'
        + '  If ios is targeted:\n'
        + '  - generates forceios package and deploys it to a temporary directory\n'
        + '  - creates and compile the application types using specified template and plugin\n'
        + '\n'
        + '  If android is targeted:\n'
        + '  - generates forcedroid package and deploys it to a temporary directory\n'
        + '  - creates and compile the application types using specified template and plugin\n'
        + '\n'
        + '  If hybrid is targeted:\n'
        + '  - clones PLUGIN_REPO_URL \n'
        + '  - runs ./tools/update.sh -b SDK_BRANCH to update clone of plugin repo\n'
        , COLOR.magenta);
}

//
// Cleanup
//
function cleanup() {
    log('Cleaning up temp dirs', COLOR.green);
    shelljs.rm('-rf', 'tmp');
}

//
// Create and deploy forceios/forcedroid
//
function createDeployForcePackage(tmpDir, os) {
    runProcessThrowError('node ./pack.js --os=' + os, __dirname);
    runProcessThrowError('npm install --prefix ' + tmpDir + ' ' + forcePackageNameForOs(os) + '-' + SDK.version + '.tgz'));
}

//
// Create and compile app 
//
function createCompileApp(tmpDir, appType, os) {
    if (appType === APP_TYPE.native_swift && os === OS.android) return; // that app type doesn't exist for android

    var target = appType + ' app for ' + os;
    log('==== ' + target + ' ====', COLOR.green);
    var appName = appType + os + 'App';
    var appId = '3MVG9Iu66FKeHhINkB1l7xt7kR8czFcCTUhgoA8Ol2Ltf1eYHOU4SqQRSEitYFDUpqRWcoQ2.dBv_a1Dyu5xa';
    var callbackUri = 'testsfdc:///mobilesdk/detect/oauth/done';
    var appDir = path.join(tmpDir, appName);
    var forcePath = path.join(tmpDir, 'node_modules', '.bin', forcePackageNameForOs(os));

    var forceArgs = 'create '
        + ' --apptype=' + appType
        + ' --appname=' + appName;

    if (os == OS.ios) {
        // ios only args
        forceArgs += ' --companyid=com.mycompany'
            + ' --organization=MyCompany'
            + ' --outputdir=' + tmpDir
            + ' --appid=' + appId
            + ' --callbackuri=' + callbackUri
            + ' --startPage=/apex/testPage';
    }
    else {
        // android only args
        var targetDir;

        if (appType.indexOf('native')>=0) {
            targetDir = appDir;
            shelljs.mkdir('-p', targetDir);
        }
        else {
            targetDir = tmpDir;
        }

        forceArgs += ' --packagename=com.mycompany'
            + ' --targetdir=' + targetDir
            + ' --usesmartstore=yes'
            +' --startpage=/apex/testPage';
    }

    // Generation
    var generationSucceeded = runProcessCatchError(forcePath + ' ' + forceArgs, 'GENERATING ' + target);

    if (!generationSucceeded) {
        return; // no point continuing
    }

    // Compilation
    if (appType.indexOf('native') >=0) {
        if (os == OS.ios) {
            // IOS - Native
            editPodfileToUseLocalRepo(appDir);
            var workspacePath = path.join(appDir, appName + '.xcworkspace');
            runProcessThrowError('pod update', appDir);    
            runProcessCatchError('xcodebuild -workspace ' + workspacePath 
                                 + ' -scheme ' + appName
                                 + ' clean build CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO', 
                                 'COMPILING ' + target); 
        }
        else {
            // Android - Native
            var gradle = isWindows() ? '.\\gradlew.bat' : './gradlew';
            runProcessCatchError(gradle + ' assembleDebug', 'COMPILING ' + target, appDir);
        }
    }
    else {
        if (os == OS.ios) {
            // IOS - Native
            runProcessCatchError('cordova build', 'COMPILING ' + target, appDir);    
        }
        else {
            // Android - Native
            var gradle = isWindows() ? '.\\gradlew.bat' : './gradlew';
            runProcessCatchError(gradle + ' assembleDebug', 'COMPILING ' + target, path.join(appDir, 'platforms', 'android'));
        }
    }
}

//
// Update cordova plugin repo
//
function updatePluginRepo(tmpDir, pluginRepoDir, sdkBranch, os) {
    log('Updating cordova plugin at ' + branch, COLOR.green);
    runProcessThrowError(path.join('tools', 'update.sh') + ' -b ' + sdkBranch + ' -o ' + os, pluginRepoDir);
}

//
// Helper to validate version
// 
function validateVersion(version) {
    if (version.match(/\d\.\d\.\d/) == null) {
            log('Invalid version: ' + version, COLOR.red);
            process.exit(1);
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
            log('Invalid appType: ' + appType, COLOR.red);
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
// Return forceios for ios and forcedroid for android
//
function forcePackageNameForOs(os) {
    switch(os) {
        case OS.android: return 'forcedroid';
        case OS.ios: return 'forceios';
    }
}

//
// Return true if running on Windows
//
function isWindows() {
    return /^win/.test(process.platform);
}
