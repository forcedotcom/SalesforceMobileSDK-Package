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
    SDK = require('./constants'),
    COLOR = require('./outputColors'),
    commandLineUtils = require('./commandLineUtils'),
    logInfo = require('./utils').logInfo;


function getCommandArgs(forcecli, command) {
    var appTypes = forcecli.appTypes;
    var platforms = forcecli.platforms;

    var args = [];

    var addCommonArgs = function() {
        if (platforms.length > 1) {
            args.push({name:'platform', 'char':'p', description:'Comma separated platforms (' + platforms.join(', ') + ')'});
        }
        args.push({name:'appname', 'char':'n', description:'Application Name'});
        args.push({name:'packagename', 'char':'p', description: 'App Package Identifier (e.g. com.mycompany.myapp)'})
        args.push({name:'organization', 'char':'o', description: 'Organization Name (Your company\'s/organization\'s name)'});
        args.push({name:'outputdir', 'char':'d', description:'Output Directory (Leave empty for current directory)', optional:true});
        args.push({name:'verbose', 'char':'v', hiddren:true, hasValue:false, optional:true});
    };

    switch (command) {
    case SDK.commands.version:
        break;
    case SDK.commands.create:
        if (appTypes.length > 1) {
            args.push({name:'apptype', 'char':'t',  description:'Application Type (' + appTypes.join(', ') + ')'});
        }
        addCommonArgs();
        if (appTypes.indexOf('hybrid_remote') >= 0) {
            args.push({name:'startpage', 'char':'s', description:'App Start Page (The start page of your remote app. Only required for hybrid_remote)'});
        }
        break;
        
    case SDK.commands.createWithTemplate:
        args.push({name:'templaterepouri', 'char': 'r', description:'Template repo URI'});
        addCommonArgs();
        break;
    }

    return args;
}

function getCommandDescription(forcecli, command) {
    switch (command) {
    case SDK.commands.version:
        return 'print version of Mobile SDK';
    case SDK.commands.create:
        return 'create ' + forcecli.platforms.join('/') + ' ' + forcecli.appTypes.join(' or ') + ' mobile application';
    case SDK.commands.createWithTemplate:
        return 'create ' + forcecli.platforms.join('/') + ' mobile application from a template';
    }
}

function readConfig(args, forcecli, handler) {
    var commandLineArgs = args.slice(2, args.length);
    var command = commandLineArgs.shift();

    var processorList = null;

    switch (command || '') {
    case SDK.commands.version:
        printVersion(forcecli);
        process.exit(0);
        break;
    case SDK.commands.create: 
        processorList = createArgsProcessorList(forcecli, command); 
        break;
    case SDK.commands.createWithTemplate: 
        processorList = createArgsProcessorList(forcecli, command); 
        break;
    default:
        usage(forcecli);
        process.exit(1);
    };

    commandLineUtils.processArgsInteractive(commandLineArgs, processorList, handler);
}

function printVersion(forcecli) {
    logInfo(forcecli.name + ' version ' + SDK.version);
}

function printArgs(forcecli, command) {
    for (var arg of getCommandArgs(forcecli, command)) {
        logInfo('    ' + (arg.optional  ? '[' : '') + '--' + arg.name + '=' + arg.description + (arg.optional ? ']' : ''), COLOR.magenta);
    }
}    

function usage(forcecli) {
    var forcecliName = forcecli.name;
    var forcecliVersion = SDK.version;
    var appTypes = forcecli.appTypes;
    var platforms = forcecli.platforms;
    
    logInfo('\n' + forcecliName + ': ' + forcecli.description, COLOR.cyan);
    logInfo('\nUsage:\n', COLOR.cyan);
    for (var i=0; i<forcecli.commands.length; i++) {
        if (i>0) {
            logInfo('\n OR \n', COLOR.cyan);
        }
        var command = forcecli.commands[i];
        logInfo('# ' + getCommandDescription(forcecli, command), COLOR.magenta);
        logInfo(forcecliName + ' ' + command, COLOR.magenta);
        printArgs(forcecli, command);
    }
    logInfo('\n OR \n', COLOR.cyan);
    logInfo(forcecliName, COLOR.magenta);
    logInfo('\nWe also offer:', COLOR.cyan);
    for (var cli of Object.values(SDK.forceclis)) {
        if (cli.name != forcecli.name) {
            logInfo('- ' + cli.name + ': ' + cli.description, COLOR.cyan);
        }
    }
    logInfo('\n');
}

//
// Processor list
//
function createArgsProcessorList(forcecli, command) {
    var appTypes = forcecli.appTypes;
    var platforms = forcecli.platforms;
    var argProcessorList = new commandLineUtils.ArgProcessorList();

    
    if (platforms.length > 1) {
        // Platforms
        addProcessorFor(argProcessorList, 'platform', 'Enter the target platform(s) separated by commas (' + platforms.join(', ') + '):',
                        'Platform(s) must be in ' + platforms.join(', ') + '.', 
                        function(val) { return !val.split(",").some(p=>platforms.indexOf(p) == -1); });
    }

    if (command == SDK.commands.createWithTemplate) {
        // Template Repo URI
        addProcessorFor(argProcessorList, 'templaterepouri', 'Enter URI of repo containing template application:',
                     'Invalid value for template repo uri: \'$val\'.', /^\S+$/);
    }
    else {
        if (appTypes.length > 1) {
            // App type
            addProcessorFor(argProcessorList, 'apptype', 'Enter your application type (' + appTypes.join(', ') + '):',
                            'App type must be ' + appTypes.join(', ') + '.', 
                            function(val) { return appTypes.indexOf(val) >= 0; });
        }
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

    // Plugin URI - private param (not documented in usage, user is never prompted)
    addProcessorFor(argProcessorList, 'pluginrepouri', null,
                    'Invalid value for plugin repo uri: \'$val\'.', /.*/);

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

module.exports = {
    readConfig: readConfig,
    printVersion: printVersion,
    getCommandArgs: getCommandArgs,
    getCommandDescription: getCommandDescription,
};
