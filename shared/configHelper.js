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


function getArgs(cli, commandName) {
    var argNames = SDK.commands[commandName].args;
    argNames = typeof argNames === 'function' ? argNames(cli) : argNames;
    return argNames.map(argName => SDK.args[argName]);
}

function readConfig(args, cli, handler) {
    var commandLineArgs = args.slice(2, args.length);
    var commandName = commandLineArgs.shift();

    var processorList = null;

    switch (commandName || '') {
    case SDK.commands.version.name:
        printVersion(cli);
        process.exit(0);
        break;
    case SDK.commands.create.name: 
    case SDK.commands.createWithTemplate.name: 
        processorList = createArgsProcessorList(cli, commandName);
        break;
    default:
        usage(cli);
        process.exit(1);
    };

    commandLineUtils.processArgsInteractive(commandLineArgs, processorList, handler);
}

function printVersion(cli) {
    logInfo(cli.name + ' version ' + SDK.version);
}

function printArgs(cli, commandName) {
    for(var arg of getArgs(cli, commandName)) {
        var required = arg.required === undefined ? true : arg.required;
        var description = typeof arg.description === 'function' ? arg.description(cli) : arg.description;
        if (description != null) {
            logInfo('    ' + (!required  ? '[' : '') + '--' + arg.name + '=' + description + (!required ? ']' : ''), COLOR.magenta);
        }
    }
}    

function usage(cli) {
    var cliName = cli.name;
    var cliVersion = SDK.version;
    var appTypes = cli.appTypes;
    var platforms = cli.platforms;
    
    logInfo('\n' + cliName + ': ' + cli.description, COLOR.cyan);
    logInfo('\nUsage:\n', COLOR.cyan);
    for (var i=0; i<cli.commands.length; i++) {
        if (i>0) {
            logInfo('\n OR \n', COLOR.cyan);
        }
        var commandName = cli.commands[i];
        var command = SDK.commands[commandName];
        var description = typeof command.description === 'function' ? command.description(cli) : command.description;
        logInfo('# ' + description, COLOR.magenta);
        logInfo(cliName + ' ' + commandName, COLOR.magenta);
        printArgs(cli, commandName);
    }
    logInfo('\n OR \n', COLOR.cyan);
    logInfo(cliName, COLOR.magenta);
    logInfo('\nWe also offer:', COLOR.cyan);
    for (var otherCli of Object.values(SDK.forceclis)) {
        if (otherCli.name != cli.name) {
            logInfo('- ' + otherCli.name + ': ' + otherCli.description, COLOR.cyan);
        }
    }
    logInfo('\n');
}

//
// Processor list
//
function createArgsProcessorList(cli, commandName) {
    var appTypes = cli.appTypes;
    var platforms = cli.platforms;
    var argProcessorList = new commandLineUtils.ArgProcessorList();

    for (var arg of getArgs(cli, commandName)) {
        var prompt = typeof arg.prompt === 'function' ? arg.prompt(cli) : arg.prompt;
        var validation = typeof arg.validate === 'function' ? ((arg, cli) => (val => arg.validate(val, cli)))(arg, cli) : null; // curried closure !!
        var error = typeof arg.error === 'function' ? ((arg, cli) => (val => arg.error(val, cli)))(arg, cli) : null; // curried closure !!
        var preProcessor = arg.name == 'startpage' ? (argsMap => argsMap['apptype'] === 'hybrid_remote') : undefined; // XXX handle in constants.js
        addProcessorFor(argProcessorList, arg.name, prompt, error, validation, preProcessor);
    }

    return argProcessorList;
}

//
// Helper function to add arg processor
// * argProcessorList: ArgProcessorList
// * argName: string, name of argument
// * prompt: string for prompt
// * error: function 
// * validation: function or null (no validation)
// * preprocessor: function or null
// * postprocessor: function or null
// 
function addProcessorFor(argProcessorList, argName, prompt, error, validation, preprocessor, postprocessor) {
    argProcessorList.addArgProcessor(argName, prompt, function(val) {
        val = val.trim();

        // validation is either a function or a regexp 
        if (validation == null || (typeof validation === 'function' && validation(val))) {
            return new commandLineUtils.ArgProcessorOutput(true, typeof postprocessor === 'function' ? postprocessor(val) : val);
        }
        else {
            return new commandLineUtils.ArgProcessorOutput(false, error(val));
        }

    }, preprocessor);
}

module.exports = {
    readConfig: readConfig,
    printVersion: printVersion,
    getArgs: getArgs
};
