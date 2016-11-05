#!/usr/bin/env node

// Constants
var version = '5.0.0';
var targetApi = {'versionNumber': 25, 'versionName': 'Nougat'};
var minimumCordovaCliVersion = '5.4.0';
var cordovaPlatformVersion = '5.0.0';
var defaultTemplateRepoUrl = 'https://github.com/wmathurin/SalesforceMobileSDK-Templates';
var defaultTemplateBranch = 'unstable';
var appTypeToDefaultTemplatePath = {
    'native': 'AndroidNativeTemplate',
    'react_native': 'ReactNativeTemplate'
};
var appTypes = ['native', 'react_native', 'hybrid_local', 'hybrid_remote'];

// Dependencies
var readConfig = require('./shared/configHelper').readConfig,
    createNativeApp = require('./shared/nativeHelper').createNativeApp,
    createHybridApp = require('./shared/hybridHelper').createHybridApp,
    log = require('./shared/utils').log,
    COLOR = require('./shared/outputColors');


// Reading parameters from command line
readConfig(process.argv, 'forcedroid', version, appTypes, createApp);

//
// Helper for 'create' command
//
function createApp(config) {
    // Adding platform
    config.platform = 'android';

    // Adding defaults
    config.templaterepourl = config.templaterepourl || defaultTemplateRepoUrl;
    config.templatebranch = config.templatebranch || defaultTemplateBranch;
    config.templatepath = config.templatepath || (config.templaterepourl === defaultTemplateRepoUrl ? appTypeToDefaultTemplatePath[config.apptype] : '');

    var result;
    // Native app creation
    if (config.apptype === 'native' || config.apptype === 'react_native') {
        result = createNativeApp(config);
    }
    // Hybrid app creation
    else {
        config.minimumCordovaCliVersion = minimumCordovaCliVersion;
        config.cordovaPlatformVersion = cordovaPlatformVersion;
        result = createHybridApp(config);
    }

    log('Next steps:', COLOR.cyan);
    log('Your application project is ready in ' + result.projectDir + '.', COLOR.magenta);
    log('To use your new application in Android Studio, do the following:', COLOR.magenta);
    log('   - open ' + result.workspacePath + ' in Android Studio', COLOR.magenta);
    log('   - build and run', COLOR.magenta);
    log('Before you ship, make sure to plug your OAuth Client ID and Callback URI, and OAuth Scopes into ' + result.bootconfigFile, COLOR.cyan);
}


