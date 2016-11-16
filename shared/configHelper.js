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
    COLOR = require('./outputColors'),
    commandLineUtils = require('./commandLineUtils'),
    logInfo = require('./utils').logInfo;

function readConfig(args, toolName, toolVersion, appTypes, handler) {
    var commandLineArgs = args.slice(2, args.length);
    var command = commandLineArgs.shift();

    var processorList = null;

    switch (command || '') {
    case 'version':
        logInfo(toolName + ' version ' + toolVersion);
        process.exit(0);
        break;
    case 'create': 
        processorList = createArgsProcessorList(appTypes); 
        break;
    case 'createWithTemplate': 
        processorList = createArgsProcessorList(appTypes, true); 
        break;
    default:
        usage(toolName, toolVersion, appTypes);
        process.exit(1);
    };

    commandLineUtils.processArgsInteractive(commandLineArgs, processorList, handler);
}

function usage(toolName, toolVersion, appTypes) {
    logInfo('Usage:\n', COLOR.cyan);
    logInfo(toolName + ' create', COLOR.magenta);
    logInfo('    --apptype=<Application Type> (' + appTypes.join(', ') + ')', COLOR.magenta);
    logInfo('    --appname=<Application Name>', COLOR.magenta);
    logInfo('    --packagename=<App Package Identifier> (e.g. com.mycompany.myapp)', COLOR.magenta);
    logInfo('    --organization=<Organization Name> (Your company\'s/organization\'s name)', COLOR.magenta);
    logInfo('    --outputdir=<Output directory> (Leave empty for current directory)]', COLOR.magenta);
    logInfo('    --startpage=<App Start Page> (The start page of your remote app. Only required for hybrid_remote)', COLOR.magenta);
    logInfo('\n OR \n', COLOR.cyan);
    logInfo(toolName + ' createWithTemplate', COLOR.magenta);
    logInfo('    --templaterepourl=<Template repo URL> (e.g. https://github.com/forcedotcom/SmartSyncExplorerReactNative)]', COLOR.magenta);
    logInfo('    --appname=<Application Name>', COLOR.magenta);
    logInfo('    --packagename=<App Package Identifier> (e.g. com.mycompany.myapp)', COLOR.magenta);
    logInfo('    --organization=<Organization Name> (Your company\'s/organization\'s name)', COLOR.magenta);
    logInfo('    --outputdir=<Output directory> (Leave empty for current directory)]', COLOR.magenta);
    logInfo('\n OR \n', COLOR.cyan);
    logInfo(toolName + ' version', COLOR.magenta);
}

//
// Processor list for 'create' command
//
function createArgsProcessorList(appTypes, isCreateWithTemplate) {
    var argProcessorList = new commandLineUtils.ArgProcessorList();

    if (isCreateWithTemplate) {
        // Template Repo URL
        addProcessorFor(argProcessorList, 'templaterepourl', 'Enter URL of repo containing template application:',
                     'Invalid value for template repo url: \'$val\'.', /^\S+$/);
    }
    else {
        // App type
        addProcessorFor(argProcessorList, 'apptype', 'Enter your application type (' + appTypes.join(', ') + '):',
                        'App type must be ' + appTypes.join(', ') + '.', 
                        function(val) { return appTypes.indexOf(val) >= 0; });
    }

    // App name
    addProcessorFor(argProcessorList, 'appname', 'Enter your application name:',
                    'Invalid value for application name: \'$val\'.', /^\S+$/);

    // Package name
    addProcessorFor(argProcessorList, 'packagename', 'Enter the package name for your app (com.mycompany.myapp):',
                    '\'$val\' is not a valid package name.', /^[a-z]+[a-z0-9_]*(\.[a-z]+[a-z0-9_]*)*$/);

    // Organization
    addProcessorFor(argProcessorList, 'organization', 'Enter your organization name (Acme, Inc.):',
                    'Invalid value for organization: \'$val\'.',  /\S+/);

    // Start page
    addProcessorFor(argProcessorList, 'startpage', 'Enter the start page for your app:',
                    'Invalid value for start page: \'$val\'.', /\S+/, 
                    function(argsMap) { return (argsMap['apptype'] === 'hybrid_remote'); });

    // Output dir
    addProcessorFor(argProcessorList, 'outputdir', 'Enter output directory for your app (leave empty for the current directory):',
                    'Invalid value for output directory (directory must not already exist): \'$val\'.',
                    function(val) { return val === '' || !shelljs.test('-e', path.resolve(val)); });


    // Template Path - private param (not documented in usage, user is never prompted)
    addProcessorFor(argProcessorList, 'templatepath', null,
                    'Invalid value for template path: \'$val\'.', /.*/);

    // Plugin URL - private param (not documented in usage, user is never prompted)
    addProcessorFor(argProcessorList, 'pluginrepourl', null,
                    'Invalid value for plugin repo url: \'$val\'.', /.*/);

    // Verbose  - private param (not documented in usage, user is never prompted)
    addProcessorFor(argProcessorList, 'verbose', null,
                    'Invalid value for verbose: \'$val\'.', /.*/);
    
    return argProcessorList;
}

//
// Helper function to add arg processor
// * argProcessorList: ArgProcessorList
// * argName: string, name of argument
// * prompt: string for prompt
// * error: string for error (can contain $val to print the value typed by the user in the error message)
// * validation: function or regexp or null (no validation)
// * preprocessor: function or null
// * postprocessor: function or null
// 
function addProcessorFor(argProcessorList, argName, prompt, error, validation, preprocessor, postprocessor) {
    argProcessorList.addArgProcessor(argName, prompt, function(val) {
        val = val.trim();

        // validation is either a function or a regexp 
            if (typeof validation === 'function' && validation(val)
                || typeof validation === 'object' && typeof validation.test === 'function' && validation.test(val))
            {
                return new commandLineUtils.ArgProcessorOutput(true, typeof postprocessor === 'function' ? postprocessor(val) : val);
            }
            else {
                return new commandLineUtils.ArgProcessorOutput(false, error.replace('$val', val));
            }

    }, preprocessor);
}

module.exports.readConfig = readConfig;
