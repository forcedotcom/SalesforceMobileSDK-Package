#!/usr/bin/env node

// Constants
var version = '5.0.0';
var minimumCordovaCliVersion = '5.4.0';
var cordovaPlatformVersion = '4.2.0';
var defaultTemplateRepoUrl = 'https://github.com/wmathurin/SalesforceMobileSDK-Templates';
var defaultTemplateBranch = 'templates-android';
var appTypeToDefaultTemplatePath = {
    'native': 'iOSNativeTemplate',
    'native_swift': 'iOSNativeSwiftTemplate',
    'react_native': 'ReactNativeTemplate'
};
var appTypes = ['native', 'native_swift', 'react_native', 'hybrid_local', 'hybrid_remote'];

// Dependencies
var readConfig = require('./shared/configHelper').readConfig,
    createNativeApp = require('./shared/nativeHelper').createNativeApp,
    createHybridApp = require('./shared/hybridHelper').createHybridApp,
    log = require('./shared/utils').log,
    COLOR = require('./shared/outputColors');


// Reading parameters from command line
readConfig(process.argv, 'forceios', version, appTypes, createApp);

//
// Helper for 'create' command
//
function createApp(config) {
    try {

        // Adding platform
        config.platform = 'ios';

        // Adding defaults
        config.templaterepourl = config.templaterepourl || defaultTemplateRepoUrl;
        config.templatebranch = config.templatebranch || defaultTemplateBranch;
        config.templatepath = config.templatepath || (config.templaterepourl === defaultTemplateRepoUrl ? appTypeToDefaultTemplatePath[config.apptype] : '');

        var result;
        // Native app creation
        if (config.apptype === 'native' || config.apptype === 'native_swift' || config.apptype === 'react_native') {
            result = createNativeApp(config);
        }
        // Hybrid app creation
        else {
            config.minimumCordovaCliVersion = minimumCordovaCliVersion;
            config.cordovaPlatformVersion = cordovaPlatformVersion;
            result = createHybridApp(config);
        }

        log('Next steps:', COLOR.cyan);
        log('Your application project is ready in ' + result.projectPath + '.', COLOR.magenta);
        log('To use your new application in XCode, do the following:', COLOR.magenta);
        log('   - open ' + result.workspacePath + ' in XCode', COLOR.magenta);
        log('   - build and run', COLOR.magenta);
        log('Before you ship, make sure to plug your OAuth Client ID and Callback URI, and OAuth Scopes into ' + result.bootconfigFile, COLOR.cyan);
    }
    catch (error) {
        log('forceios create failed: ' + error.message, COLOR.red);
        console.log(error.stack);
    }
}


