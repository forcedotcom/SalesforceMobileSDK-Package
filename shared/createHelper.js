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

// Dependencies
var path = require('path'),
    SDK = require('./constants'),
    utils = require('./utils'),
    COLOR = require('./outputColors');

//
// Helper to prepare template
// 
function prepareTemplate(config, templateDir) {
    var template = require(path.join(templateDir, 'template.js'));
    return utils.runFunctionThrowError(
        function() {
            return template.prepare(config, utils.replaceInFiles, utils.moveFile, utils.removeFile);
        },
        templateDir);
}

//
// Helper for native application creation
//
function createNativeApp(config) {

    // Copying template to projectDir
    utils.copyFile(config.templateLocalPath, config.projectDir);

    // Run prepare function of template
    var prepareResult = prepareTemplate(config, config.projectDir);

    // Cleanup
    utils.removeFile(path.join(config.projectDir, 'template.js'));

    // Done
    return prepareResult;
}

//
// Helper for hybrid application creation
//
function createHybridApp(config) {

    // Create app with cordova
    utils.runProcessThrowError('cordova create "' + config.projectDir + '" ' + config.packagename + ' ' + config.appname);
    utils.runProcessThrowError('npm install shelljs@0.7.0', config.projectDir);
    utils.runProcessThrowError('cordova platform add ' + config.platform + '@' + SDK.cordova.platformVersion[config.platform], config.projectDir);
    utils.runProcessThrowError('cordova plugin add ' + config.cordovaPluginRepoUrl, config.projectDir);

    // Web directory - the home for the template
    var webDir = path.join(config.projectDir, 'www')    
    
    // Remove the default Cordova app.
    utils.removeFile(webDir);

    // Copying template to www
    utils.copyFile(config.templateLocalPath, webDir);

    // Run prepare function of template
    var prepareResult = prepareTemplate(config, webDir);

    // Cleanup
    utils.removeFile(path.join(webDir, 'template.js'));

    // Run cordova prepare
    utils.runProcessThrowError('cordova prepare ' + config.platform, config.projectDir);

    // Done
    return prepareResult;

}

//
// Print details
//
function printDetails(config) {
    // Printing out details
    var details = ['Creating ' + config.platform + ' ' + config.apptype + ' application using Salesforce Mobile SDK',
                        '  with app name:        ' + config.appname,
                        '       package name:    ' + config.packagename,
                        '       organization:    ' + config.organization,
                        '',
                        '  in:                   ' + config.projectPath,
                        '',
                        '  from template repo:   ' + config.templaterepourl
                  ];

    if (config.templatepath) {
        details = details.concat(['       template path:   ' + config.templatepath]);
    }
            

    // Hybrid extra details
    if (config.apptype.indexOf('hybrid') >= 0) {
        if (config.apptype === 'hybrid_remote') {
            details = details.concat(['       start page:      ' + config.startpage]);
        }

        details = details.concat([
            '       cordova version: ' + config.cordovaPlatformVersion,
            '       plugin repo:     ' + config.cordovaPluginRepoUrl
        ]);
    }
            
    utils.logParagraph(details);
}

//
// Print next steps
//
function printNextSteps(devToolName, projectPath, result) {
    var workspacePath = path.join(projectPath, result.workspacePath);
    var bootconfigFile =  path.join(projectPath, result.bootconfigFile);
    
    // Printing out next steps
    utils.logParagraph(['Next steps:',
                        '',
                        'Your application project is ready in ' + projectPath + '.',
                        'To use your new application in ' + devToolName + ', do the following:', 
                        '   - open ' + workspacePath + ' in ' + devToolName, 
                        '   - build and run', 
                        'Before you ship, make sure to plug your OAuth Client ID and Callback URI, and OAuth Scopes into ' + bootconfigFile
                       ]);
};    

//
// Helper for 'create' command
//
function createApp(config, platform, devToolName) {
    // Setting log level
    if (config.verbose) {
        utils.setLogLevel(utils.LOG_LEVELS.DEBUG);
    }
    else {
        utils.setLogLevel(utils.LOG_LEVELS.INFO);
    }

    // Computing projectDir
    config.projectDir = config.outputdir ? path.resolve(config.outputdir) : path.join(process.cwd(),config.appname)
    config.projectPath = path.relative(process.cwd(), config.projectDir);

    // Checking if directory exists
    utils.failIfExists(config.projectDir);

    // Adding platform
    config.platform = platform;
    
    // Adding template repo url and path if none provided
    config.templaterepourl = config.templaterepourl || SDK.templates.repoUrl;
    config.templatepath = config.templatepath || (config.templaterepourl.indexOf('SalesforceMobileSDK-Templates') >= 0 ? SDK.templates.appTypesToPath[platform][config.apptype] : '');

    // Creating tmp dir for template clone
    var tmpDir = utils.mkTmpDir();

    // Cloning template repo
    var repoDir = utils.cloneRepo(tmpDir, config.templaterepourl);
    config.templateLocalPath = path.join(repoDir, config.templatepath);

    // Getting apptype from template
    config.apptype = require(path.join(config.templateLocalPath, 'template.js')).appType;

    var isNative = config.apptype.indexOf('native') >= 0;

    // Adding hybrid only config
    if (!isNative) {
        config.cordovaPluginRepoUrl = config.pluginrepourl || SDK.cordova.pluginRepoUrl;
    }


    // Check npm version
    utils.checkToolVersion('npm -v', SDK.tools.npmMinVersion);

    // Check pod version
    if (config.platform === 'ios') {
        utils.checkToolVersion('pod --version', SDK.tools.podMinVersion);
    }

    // Check cordova cli
    if (!isNative) {
        utils.checkToolVersion('cordova -v', SDK.cordova.minimumCliVersion);
    }

    // Print details
    printDetails(config);

    // Creating application
    var result = isNative ? createNativeApp(config) : createHybridApp(config);

    // Cleanup
    utils.removeFile(tmpDir);
    
    // Printing next steps
    printNextSteps(devToolName, config.projectPath, result);
}


module.exports = {
    createApp
};
