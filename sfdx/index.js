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
    configHelper = require('./shared/configHelper');

// Flags
function getFlags(cli, command) {
    var flags = configHelper.getCommandArgs(cli, command);
    for (var flag of flags) {
        flag.required = !flag.optional;
        flag.hasValue = flag.hasValue === undefined ? true : flag.hasValue;
    }
    return flags;
}

// Run command
function runCommand(cli, command, args) {
    switch(command) {
    case SDK.commands.create:
        createHelper.createApp(cli, args);
        break;
    case SDK.commands.createWithTemplate:
        createHelper.createApp(cli, args);
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
        for (var command of cli.commands) {
            commands.push({
                cli: cli,
                topic: cli.sfdx_topic,
                command: command,
                description: configHelper.getCommandDescription(cli, command),
                flags: getFlags(cli, command),
                run(context) {
                    runCommand(this.cli, this.command, context.flags);
                }
            });
        }
    }
    return commands;
}

module.exports = {
    namespace: {
        name:'mobilesdk',
        description: 'create mobile apps based on the Salesforce Mobile SDK'
    },
    topics: getTopics(),
    commands: getCommands()
};
