#!/usr/bin/env node

// Defaults
var defaultSdkBranch = 'dev';

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
    var chosenOperatingSystems = cleanSplit(parsedArgs.os, ',').map(function(s) { return s.toLowerCase(); });
    var appTypes = parsedArgs.apptype || '';
    var templateRepoUri = parsedArgs.templaterepouri || '';
    var pluginRepoUri = parsedArgs.pluginrepouri || SDK.tools.cordova.pluginRepoUri;
    var sdkBranch = parsedArgs.sdkbranch || defaultSdkBranch;
    var chosenAppTypes = cleanSplit(parsedArgs.apptype, ',');

    var testingWithAppType = chosenAppTypes.length > 0 && templateRepoUri == '';
    var testingWithTemplate = templateRepoUri != '';
    var testingIOS = chosenOperatingSystems.indexOf(OS.ios) >= 0;
    var testingAndroid = chosenOperatingSystems.indexOf(OS.android) >= 0;
    var testingHybrid = chosenAppTypes.some(t=>t.indexOf("hybrid") >= 0);

    // Validation
    validateOperatingSystems(chosenOperatingSystems);
    validateAppTypesTemplateRepoUri(chosenAppTypes, templateRepoUri);

    // Usage
    if (usageRequested) {
        usage(0);
    }

    // Actual testing
    var tmpDir = utils.mkTmpDir();

    // Getting appType if template specified
    if (testingWithTemplate) {
        chosenAppTypes = [getAppTypeFromTemplate(templateRepoUri)];
    }

    // Create forcexxx packages needed
    for (var cli of Object.values(SDK.forceclis)) {
        if (cli.platforms.some(p=>chosenOperatingSystems.indexOf(p)>=0)
            && cli.appTypes.some(a=>chosenAppTypes.indexOf(a)>=0)) {

            createDeployForcePackage(tmpDir, cli);

        }
    }

    // Get cordova plugin repo if any hybrid testing requested
    if (testingHybrid) {
        if (pluginRepoUri.indexOf('//') >= 0) {
            // Actual uri - clone repo - run tools/update.sh
            var pluginRepoDir = utils.cloneRepo(tmpDir, pluginRepoUri);
            if (testingIOS && testingAndroid) updatePluginRepo(tmpDir, 'all', pluginRepoDir, sdkBranch);
            if (testingIOS && !testingAndroid) updatePluginRepo(tmpDir, OS.ios, pluginRepoDir, sdkBranch);
            if (testingAndroid && !testingIOS) updatePluginRepo(tmpDir, OS.android, pluginRepoDir, sdkBranch);
            // Use local updated clone of plugin
            pluginRepoUri = pluginRepoDir;
        }
    }

    // Test all the platforms / app types requested
    for (var i=0; i<chosenOperatingSystems.length; i++) {
        var os = chosenOperatingSystems[i];
        if (testingWithAppType) {
            for (var j=0; j<chosenAppTypes.length; j++) {
                var appType = chosenAppTypes[j];
                createCompileApp(tmpDir, os, appType, null, pluginRepoUri);
            }
        }
        if (testingWithTemplate) {
            // NB: chosenAppTypes[0] is getAppTypeFromTemplate(templateRepoUri)
            createCompileApp(tmpDir, os, chosenAppTypes[0], templateRepoUri, null);
        }
    }
}

//
// Usage
//
function usage(exitCode) {
    utils.logInfo('Usage:\n',  COLOR.cyan);
    utils.logInfo('  test_force.js --usage', COLOR.magenta);
    utils.logInfo('\n OR \n', COLOR.cyan);
    utils.logInfo('  test_force.js', COLOR.magenta);
    utils.logInfo('    --os=os1,os2,etc', COLOR.magenta);
    utils.logInfo('    --apptype=appType1,appType2,etc OR --templaterepouri=TEMPLATE_REPO_URI', COLOR.magenta);
    utils.logInfo('    [--pluginrepouri=PLUGIN_REPO_URI (Defaults to uri in shared/constants.js)]', COLOR.magenta);
    utils.logInfo('    [--sdkbranch=SDK_BRANCH (Defaults to dev)]', COLOR.magenta);
    utils.logInfo('', COLOR.cyan);
    utils.logInfo('  Where:', COLOR.cyan);
    utils.logInfo('  - osX is : ios or android', COLOR.cyan);
    utils.logInfo('  - appTypeX is: native, native_swift, native_kotlin, react_native, hybrid_local or hybrid_remote', COLOR.cyan);
    utils.logInfo('  - templaterepouri is a template repo uri e.g. https://github.com/forcedotcom/SmartSyncExplorerReactNative', COLOR.cyan);
    utils.logInfo('', COLOR.cyan);
    utils.logInfo('  If hybrid is targeted:', COLOR.cyan);
    utils.logInfo('  - clones PLUGIN_REPO_URI ', COLOR.cyan);
    utils.logInfo('  - runs ./tools/update.sh -b SDK_BRANCH to update clone of plugin repo', COLOR.cyan);
    utils.logInfo('', COLOR.cyan);
    utils.logInfo('  If ios is targeted:', COLOR.cyan);
    utils.logInfo('  - generates forceios package and deploys it to a temporary directory', COLOR.cyan);
    utils.logInfo('  - creates and compiles applications for the specified os and template', COLOR.cyan);
    utils.logInfo('', COLOR.cyan);
    utils.logInfo('  If android is targeted:', COLOR.cyan);
    utils.logInfo('  - generates forcedroid package and deploys it to a temporary directory', COLOR.cyan);
    utils.logInfo('  - creates and compiles applications for the specified os and template', COLOR.cyan);

    process.exit(exitCode);
}

//
// Create and deploy forceios/forcedroid
//
function createDeployForcePackage(tmpDir, forcecli) {
    var packJs = path.join(__dirname, '..', 'pack', 'pack.js');
    utils.runProcessThrowError('node ' + packJs + ' --cli=' + forcecli.name);
    utils.runProcessThrowError('npm install --prefix ' + tmpDir + ' ' + forcecli.name + '-' + SDK.version + '.tgz');
}

//
// Update cordova plugin repo
//
function updatePluginRepo(tmpDir, os, pluginRepoDir, sdkBranch) {
    utils.logInfo('Updating cordova plugin at ' + sdkBranch);
    utils.runProcessThrowError(path.join('tools', 'update.sh') + ' -b ' + sdkBranch + ' -o ' + os, pluginRepoDir);
}

//
// Create and compile app
//
function createCompileApp(tmpDir, os, actualAppType, templateRepoUri, pluginRepoUri) {
    var forceArgs = '';
    var isNative = actualAppType.indexOf('native') == 0;
    var isReactNative = actualAppType === APP_TYPE.react_native;
    var isHybrid = actualAppType.indexOf('hybrid') == 0;
    var isHybridRemote = actualAppType === APP_TYPE.hybrid_remote;
    var target = actualAppType + ' app for ' + os + (templateRepoUri ? ' based on template ' + getTemplateNameFromUri(templateRepoUri) : '');
    var appName = actualAppType + os + 'App';
    var outputDir = path.join(tmpDir, appName);
    var forcecli = (os == OS.ios
                    ? SDK.forceclis.forceios
                    : SDK.forceclis.forcedroid
                   );

    var forcePath = path.join(tmpDir, 'node_modules', '.bin', forcecli.name);

    if (!templateRepoUri) {
        if (actualAppType === APP_TYPE.native_swift && os === OS.android) return; // that app type doesn't exist for android
        if (actualAppType === APP_TYPE.native_kotlin && os === OS.ios) return; // that app type doesn't exist for ios

        forceArgs = 'create '
            + ' --apptype=' + actualAppType;
    }
    else {
        forceArgs = 'createWithTemplate '
            + ' --templaterepouri=' + templateRepoUri;
    }

    if (forcecli.platforms.length > 0) {
        forceArgs += ' --platform=' + os;
    }

    forceArgs += ''
        + ' --appname=' + appName
        + ' --packagename=com.mycompany'
        + ' --organization=MyCompany'
        + ' --outputdir=' + outputDir
        + ' --verbose'
        + (isHybridRemote ? ' --startpage=' + defaultStartPage : '')
        + (isHybrid ? ' --pluginrepouri=' + pluginRepoUri : '');

    // Generation
    var generationSucceeded = utils.runProcessCatchError(forcePath + ' ' + forceArgs, 'GENERATING ' + target);

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
                                       + ' clean build CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO',
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
function validateOperatingSystems(chosenOperatingSystems) {
    if (chosenOperatingSystems.length == 0) {
        utils.logError('You need to specify at least one os\n');
        usage(1);
    }
    for (var i=0; i<chosenOperatingSystems.length; i++) {
        var os = chosenOperatingSystems[i];
        if (!OS.hasOwnProperty(os) || (isWindows() && os === OS.ios)) {
            utils.logError('Invalid os: ' + os + '\n');
            usage(1);
        }
    }
}

//
// Helper to validate app types / template repo uri
//
function validateAppTypesTemplateRepoUri(chosenAppTypes, templateRepoUri) {
    if (!(chosenAppTypes.length == 0 ^ templateRepoUri === '')) {
        utils.logError('You need to specify apptype or templaterepouri (but not both)\n');
        usage(1);
    }

    for (var i=0; i<chosenAppTypes.length; i++) {
        var appType = chosenAppTypes[i];
        if (!APP_TYPE.hasOwnProperty(appType)) {
            utils.logError('Invalid appType: ' + appType + '\n');
            usage(1);
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
    var parts = templateRepoUri.split('/');
    return parts[parts.length-1];
}


//
// Get template apptype
//
function getAppTypeFromTemplate(templateRepoUri) {
    // Creating tmp dir for template clone
    var tmpDir = utils.mkTmpDir();

    // Cloning template repo
    var repoDir = utils.cloneRepo(tmpDir, templateRepoUri);

    // Getting template
    var appType = require(path.join(repoDir, 'template.js')).appType;

    // Cleanup
    utils.removeFile(tmpDir);

    // Done
    return appType;
}
