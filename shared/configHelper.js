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
    logInfo = require('./utils').logInfo,
    getTemplates = require('./templateHelper').getTemplates,
    validateJson = require('./jsonChecker').validateJson;

function applyCli(f, cli) {
    return typeof f === 'function' ? f(cli): f;
}

function getArgsExpanded(cli, commandName) {
    var argNames = applyCli(SDK.commands[commandName].args, cli);
    return argNames
        .map(argName => SDK.args[argName])
        .map(arg =>
             ({
                 name: arg.name,
                 'char': arg.char,
                 description: applyCli(arg.description, cli),
                 longDescription: applyCli(arg.longDescription, cli),
                 prompt: applyCli(arg.prompt, cli),
                 error: applyCli(arg.error, cli),
                 validate: applyCli(arg.validate, cli),
                 promptIf: arg.promptIf,
                 required: arg.required === undefined ? true : arg.required,
                 hasValue: arg.hasValue === undefined ? true : arg.hasValue,
                 hidden: applyCli(arg.hidden, cli),
                 type: arg.type
             })
            );

}

function getCommandExpanded(cli, commandName) {
    var command = SDK.commands[commandName];
    return {
        name: command.name,
        args: getArgsExpanded(cli, commandName),
        description: applyCli(command.description, cli),
        longDescription: applyCli(command.longDescription, cli),
        help: applyCli(command.help, cli)
    };
}

function readConfig(args, cli, handler) {
    var commandLineArgs = args.slice(2, args.length);
    var commandName = commandLineArgs.shift();
    commandName = commandName ? commandName.toLowerCase() : commandName;

    var processorList = null;

    switch (commandName || '') {
    case SDK.commands.version.name:
        printVersion(cli);
        process.exit(0);
        break;
    case SDK.commands.create.name:
    case SDK.commands.createwithtemplate.name:
        processorList = buildArgsProcessorList(cli, commandName);
        commandLineUtils.processArgsInteractive(commandLineArgs, processorList, handler);
        break;
    case SDK.commands.checkconfig.name:
        processorList = buildArgsProcessorList(cli, commandName);
        commandLineUtils.processArgsInteractive(commandLineArgs, processorList, function (config) {
            validateJson(config.configpath, config.configtype);
        });
        break;
    case SDK.commands.listtemplates.name:
        listTemplates(cli);
        process.exit(0);
        break;
    default:
        usage(cli);
        process.exit(1);
    };


}

function printVersion(cli) {
    logInfo(cli.name + ' version ' + SDK.version);
}

function printArgs(cli, commandName) {
    getArgsExpanded(cli, commandName)
        .filter(arg => !arg.hidden)
        .forEach(arg => logInfo('    ' + (!arg.required  ? '[' : '') + '--' + arg.name + '=' + arg.description + (!arg.required ? ']' : ''), COLOR.magenta));
}

function listTemplates(cli) {
    var cliName = cli.name;
    var applicableTemplates = getTemplates(cli);

    logInfo('\nAvailable templates:\n', COLOR.cyan);
    for (var i=0; i<applicableTemplates.length; i++) {
        var template = applicableTemplates[i];
        logInfo((i+1) + ') ' + template.description, COLOR.cyan);
        logInfo(cliName + ' ' + SDK.commands.createwithtemplate.name + ' --' + SDK.args.templateRepoUri.name + '=' + template.path, COLOR.magenta);
    }
    logInfo('');
}

function usage(cli) {
    var cliName = cli.name;
    var cliVersion = SDK.version;
    var appTypes = cli.appTypes;
    var platforms = cli.platforms;

    logInfo('\n' + cliName + ': Tool for building ' + cli.purpose + ' using Salesforce Mobile SDK', COLOR.cyan);
    logInfo('\nUsage:\n', COLOR.cyan);
    for (var i=0; i<cli.commands.length; i++) {
        if (i>0) {
            logInfo('\n OR \n', COLOR.cyan);
        }
        var commandName = cli.commands[i];
        var command = getCommandExpanded(cli, commandName);
        logInfo('# ' + command.description, COLOR.magenta);
        logInfo(cliName + ' ' + commandName, COLOR.magenta);
        printArgs(cli, commandName);
    }
    logInfo('\n OR \n', COLOR.cyan);
    logInfo(cliName, COLOR.magenta);
    logInfo('\nWe also offer:', COLOR.cyan);
    for (var otherCliName in SDK.forceclis) {
        var otherCli = SDK.forceclis[otherCliName];
        if (otherCli.name != cli.name) {
            logInfo('- ' + otherCli.name + ': Tool for building ' + otherCli.purpose + ' using Salesforce Mobile SDK', COLOR.cyan);
        }
    }
    logInfo('\n');
}

//
// Processor list
//
function buildArgsProcessorList(cli, commandName) {
    var argProcessorList = new commandLineUtils.ArgProcessorList();

    for (var arg of getArgsExpanded(cli, commandName)) {
        addProcessorFor(argProcessorList, arg.name, arg.prompt, arg.error, arg.validate, arg.promptIf);
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
//
function addProcessorFor(argProcessorList, argName, prompt, error, validation, preprocessor) {
    argProcessorList.addArgProcessor(argName, prompt, function(val) {
        val = val.trim();

        // validation is either a function or null
        if (validation == null || validation(val)) {
            return new commandLineUtils.ArgProcessorOutput(true, val);
        }
        else {
            return new commandLineUtils.ArgProcessorOutput(false, error(val));
        }

    }, preprocessor);
}

module.exports = {
    readConfig: readConfig,
    printVersion: printVersion,
    getArgsExpanded: getArgsExpanded,
    getCommandExpanded: getCommandExpanded
};
