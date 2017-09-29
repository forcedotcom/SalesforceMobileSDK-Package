/*
 * Copyright (c) 2017-present, salesforce.com, inc.
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

var SDK = require('./shared/constants'),
    createHelper = require('./shared/createHelper'),
    configHelper = require('./shared/configHelper'),
    logError = require('./shared/utils').logError;    

// Flags
function getFlags(cli, commandName) {
    return configHelper.getArgs(cli, commandName).map(arg => ({
        name: arg.name,
        'char': arg.char,
        description: typeof arg.description === 'function' ? arg.description(cli) : arg.description,
        required: arg.required === undefined ? true : arg.required,
        hasValue: arg.hasValue === undefined ? true : arg.hasValue,
        hidden: arg.description == null,
    }));
}

// Validation
function validateCommand(cli, commandName, vals) {
    var success = true;
    var args = configHelper.getArgs(cli, commandName);
    for (var arg of args) {
        var val = vals[arg.name];
        if (typeof arg.validate === 'function' && !arg.validate(val, cli)) {
            success = false;
            logError(arg.error(val, cli));
        }
    }
    return success;
}

// Run command
function runCommand(cli, commandName, vals) {
    switch(commandName) {
    case SDK.commands.create:
    case SDK.commands.createWithTemplate:
        createHelper.createApp(cli, vals);
        break;
    case SDK.commands.version:
        configHelper.printVersion(cli);
        break;
    }
}

// Topics
function getTopics() {
    var topics = [];
    for (var cliName in SDK.forceclis) {
        var cli = SDK.forceclis[cliName];
        topics.push({
            name: cli.sfx_topic,
            description:cli.sfdx_description
        });
    }
    return topics;
}

// Commands
function getCommands() {
    var commands = [];
    for (var cliName in SDK.forceclis) {
        var cli = SDK.forceclis[cliName];
        for (var commandName of cli.commands) {
            var command = SDK.commands[commandName];
            commands.push({
                cli: cli,
                topic: cli.sfdx_topic,
                command: commandName,
                description: typeof command.description === 'function' ? command.description(cli) : command.description,
                flags: getFlags(cli, commandName),
                run(context) {
                    if (validateCommand(this.cli, this.command, context.flags)) {
                        runCommand(this.cli, this.command, context.flags);
                    }
                }
            });
        }
    }
    return commands;
}

module.exports = {
    namespace: {
        name:'mobilesdk',
        description: 'create mobile apps based on the Salesforce Mobile SDK',
        
    },
    topics: getTopics(),
    commands: getCommands()
};
