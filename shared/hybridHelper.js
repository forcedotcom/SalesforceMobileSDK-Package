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
    shelljs = require('shelljs'),
    utils = require('./utils');

/**
 * Checks the the version of the currently installed cordova CLI tool.
 * 
 * @param {String} minimumCordovaCliVersion Minimum cordova cli version required
 *
 * @throws {Error} if cordova cli not found or version too low
 */
function checkCordovaCliVersion(minimumCordovaCliVersion) {
	var cordovaVersionResult = shelljs.exec('cordova -v', { 'silent' : true });
    if (cordovaVersionResult.code !== 0) {
        throw new Error('cordova command line tool could not be found.  Make sure you install the cordova CLI from https://www.npmjs.org/package/cordova.');
    }
    var cordovaCliVersion = cordovaVersionResult.stdout.replace(/\r?\n|\r/, '');

    var minimumCordovaCliVersionNum = utils.getVersionNumberFromString(minimumCordovaCliVersion);
    var cordovaCliVersionNum = utils.getVersionNumberFromString(cordovaCliVersion);

    if (cordovaCliVersionNum < minimumCordovaCliVersionNum) {
        throw new Error('Installed cordova command line tool version (' + cordovaCliVersion + ') is less than the minimum required version (' + minimumCordovaCliVersion + ').  Please update your version of Cordova.');
    }
};

/**
 * Create hybrid application
 *
 * @param config
 *   platform
 *   apptype
 *   appname
 *   packagename  
 *   organization
 *   templaterepourl
 *   templatebranch
 *   templatepath
 *   startpage
 *   cordovaPlatformVersion
 *   minimumCordovaCliVersion
 *   cordovaPluginRepoUrl
 *
 * @return result map with
 *   projectPath     relative path to new project
 *   workspacePath   relative path to workspace 
 *   bootconfigFile  relative path to file that contains the oauth app id and callback uri
 */
function createHybridApp(config) {

    // Computing projectDir
    var projectDir = config.outputdir ? path.resolve(config.outputdir) : path.join(process.cwd(),config.appname)
    var projectPath = path.relative(process.cwd(), projectDir);

    // Check if directory exists
    utils.failIfExists(projectDir);

    // Printing out details
    utils.logHeader(['Creating ' + config.platform + ' ' + config.apptype + ' application using Salesforce Mobile SDK',
                     '  with app name:        ' + config.appname,
                     '       package name:    ' + config.packagename,
                     '       organization:    ' + config.organization,
                     '',
                     '  in:                   ' + projectPath,
                     '',
                     '  from template repo:   ' + config.templaterepourl,
                     '       template branch: ' + config.templatebranch,
                     '       template path:   ' + config.templatepath,
                     '',
                     '       cordova version  ' + config.cordovaPlatformVersion,
                     '       plugin repo:     ' + config.cordovaPluginRepoUrl
                    ]);
    
    // Check cordova cli
    checkCordovaCliVersion(config.minimumCordovaCliVersion);

    // Create app with cordova
    utils.runProcessThrowError('cordova create "' + projectDir + '" ' + config.packagename + ' ' + config.appname);
    shelljs.pushd(projectDir);
    utils.runProcessThrowError('cordova platform add ' + config.platform + '@' + config.cordovaPlatformVersion);
    utils.runProcessThrowError('cordova plugin add ' + config.pluginRepoUrl);

    // Remove the default Cordova app.
    utils.removeFile('www');

    // Copying template to www
    utils.copyFromTemplate(config.templaterepourl, config.templatebranch, config.templatepath, 'www');
    shelljs.popd();

    // Done
    var result = {
        projectPath: projectPath,
        workspacePath: path.join(projectPath, 'platform', config.platform),
        bootconfigFile: path.join(projectPath, 'www', 'bootconfig.json')
    }

    return result;

}

module.exports.createHybridApp = createHybridApp;
