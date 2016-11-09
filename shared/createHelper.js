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
// Helper for native application creation
//
function createNativeApp(config) {

    // Copying template to projectDir
    utils.copyFromTemplate(config.templaterepourl, config.templatebranch, config.templatepath, config.projectDir);

    // Run prepare function of template
    var prepareResult = utils.runTemplatePrepare(config.projectDir, config);

    // Cleanup
    utils.removeFile(path.join(config.projectDir, 'template.js'));

    // Done
    return prepareResult;
}

//
// Helper for hybrid application creation
//
function createHybridApp(config) {

    // Check cordova cli
    checkCordovaCliVersion(config.minimumCordovaCliVersion);

    // Create app with cordova
    utils.runProcessThrowError('cordova create "' + config.projectDir + '" ' + config.packagename + ' ' + config.appname);
    utils.runProcessThrowError('cordova platform add ' + config.platform + '@' + config.cordovaPlatformVersion, config.projectDir);
    utils.runProcessThrowError('cordova plugin add ' + config.cordovaPluginRepoUrl, config.projectDir);
    utils.runProcessThrowError('cordova prepare', config.projectDir);


    // Web directory - the home for the template
    var webDir = path.join(config.projectDir, 'www')    
    
    // Remove the default Cordova app.
    utils.removeFile(webDir);

    // Copying template to www
    utils.copyFromTemplate(config.templaterepourl, config.templatebranch, config.templatepath, webDir);

    // Run prepare function of template
    var prepareResult = utils.runTemplatePrepare(webDir, config);

    // Cleanup
    utils.removeFile(path.join(webDir, 'template.js'));

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
                        '  from template repo:   ' + config.templaterepourl,
                        '       template branch: ' + config.templatebranch,
                        '       template path:   ' + config.templatepath
                  ];

    // Hybrid extra details
    if (config.apptype.indexOf('hybrid') >= 0) {
        details.concat([
            '       start page:      ' + config.startpage,
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
                        '   - open ' + workspacePath + ' in XCode', 
                        '   - build and run', 
                        'Before you ship, make sure to plug your OAuth Client ID and Callback URI, and OAuth Scopes into ' + bootconfigFile
                       ]);
};    

//
// Helper for 'create' command
//
function createApp(config, platform, devToolName) {
    var isNative = config.apptype.indexOf('native') >= 0;
    
    // Adding platform
    config.platform = platform;
    
    // Adding defaults
    config.templaterepourl = config.templaterepourl || SDK.templates.repoUrl;
    config.templatebranch = config.templatebranch || SDK.templates.branch;
    config.templatepath = config.templatepath || (config.templaterepourl === SDK.templates.repoUrl ? SDK.templates.appTypesToPath[platform][config.apptype] : '');

    // Computing projectDir
    config.projectDir = config.outputdir ? path.resolve(config.outputdir) : path.join(process.cwd(),config.appname)
    config.projectPath = path.relative(process.cwd(), config.projectDir);

    // Adding hybrid only config
    if (!isNative) {
        config.minimumCordovaCliVersion = SDK.cordova.minimumCliVersion;
        config.cordovaPlatformVersion = SDK.cordova.platformVersion[platform];
        config.cordovaPluginRepoUrl = SDK.cordova.pluginRepoUrl
    }

    // Check if directory exists
    utils.failIfExists(config.projectDir);

    // Print details
    printDetails(config);

    // Create application = 
    var result = isNative ? createNativeApp(config) : createHybridApp(config);

    // Print next steps
    printNextSteps(devToolName, config.projectPath, result);
}

module.exports = {
    createApp
};
