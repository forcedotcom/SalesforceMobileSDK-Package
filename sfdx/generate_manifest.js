#!/usr/bin/env node

// Dependencies
var fs = require('fs'),
    path = require('path'),
    SDK = require('../shared/constants'),
    configHelper = require('../shared/configHelper');

function generateOclifManifest() {
    var manifest = {
    };

    manifest.version = SDK.version;
    manifest.commands = {};

    for (var cliName in SDK.forceclis) {
        var cli = SDK.forceclis[cliName];
        cli.commands.map(commandName => {
            var command = configHelper.getCommandExpanded(cli, commandName);

            // Computing flags
            var flags = {}
            command.args.map(arg => {
                flag = {
                    name: arg.name,
                    type: arg.type,
                    'char': arg['char'],
                    description: arg.description,
                    required: !!arg.required,
                    hidden: !!arg.hidden
                };

                if (arg.hidden) flag.hidden = true;
                flags.flag = flag
            })


            // Computing manifest command
            var key = `mobilesdk:${cli.topic}:${command.name}`;
            var manifestCommand = {
                id: key,
                description: command.description + '\n\n' + command.help,
                pluginName: 'sfdx-mobilesdk-plugin',
                pluginType: 'core',
                aliases: [],
                flags: flags,
                args: []
            }

            manifest.commands[key] = manifestCommand;
        })
    }

    fs.writeFileSync(path.resolve('oclif.manifest.json'), JSON.stringify(manifest, null, 2))
}

// Main
generateOclifManifest();
