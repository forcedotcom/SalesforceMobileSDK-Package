#!/usr/bin/env node

// Dependencies
var path = require('path'),
    shelljs = require('shelljs'),
    utils = require('../shared/utils.js'),
    commandLineUtils = require('../shared/commandLineUtils'),
    COLOR = require('../shared/outputColors'),
    SDK = require('../shared/constants')
;

// Calling main
main(process.argv);

//
// Main function
//
function main(args) {
    var commandLineArgs = process.argv.slice(2, args.length);
    var parsedArgs = commandLineUtils.parseArgs(commandLineArgs);

    // Args extraction
    var usageRequested = parsedArgs.hasOwnProperty('usage');
    var sfdxPluginRequested = parsedArgs.hasOwnProperty('sfdx-plugin');
    var chosenClis = cleanSplit(parsedArgs.cli, ',');
    var cliPackingRequested = chosenClis.some(cli=>Object.keys(SDK.forceclis).indexOf(cli) >= 0);

    // Usage
    if (usageRequested || (!sfdxPluginRequested && !cliPackingRequested)) {
        usage();
        process.exit(1);
    }
    // Sfdx plugin packing
    else if (sfdxPluginRequested) {
        pack('sfdx-mobilesdk-plugin', 'sfdx', function(dir) {
            utils.runProcessThrowError('npm install @oclif/dev-cli', dir);
            utils.runProcessThrowError('node generate_oclif.js', dir); 
        });
    }
    // CLI packing
    else {
        for (var cliName in SDK.forceclis) {
            var cli = SDK.forceclis[cliName];
            if (chosenClis.indexOf(cli.name) >= 0) {
                pack(cli.name, cli.dir);
            }
        }
    }
}

//
// Create package with name from dir
//
function pack(name, relativeDir, prePack) {
    var packageName = name + '-' + SDK.version + '.tgz';

    utils.logInfo('Creating ' + packageName, COLOR.green);

    // Packing
    var packageRepoDir = path.join(__dirname, '..');
    var dir = path.join(packageRepoDir, relativeDir);
    var sharedDir = path.join(dir, 'shared');

    // npm pack doesn't following links
    utils.removeFile(sharedDir);
    shelljs.cp('-R', path.join(packageRepoDir, 'shared'), dir);
    if (typeof prePack === 'function') prePack(dir);
    utils.runProcessThrowError('npm pack', dir);
    utils.removeFile(sharedDir);
    shelljs.ln('-s', path.join('..', 'shared'), sharedDir);

    // Moving package to current directory
    utils.moveFile(path.join(dir, packageName), packageName);
}

//
// Like split, but splitting null returns [] instead of throwing an error
//                 splitting '' returns [] instead of ['']
//
function cleanSplit(str, delimiter) {
    if (str == null || str === '') {
        return [];
    }
    else {
        return str.split(delimiter);
    }
}

//
// Usage
//
function usage() {
    utils.logInfo('Usage:',  COLOR.cyan);
    utils.logInfo('  pack.js --usage', COLOR.magenta);
    utils.logInfo('OR', COLOR.magenta);
    utils.logInfo('  pack.js', COLOR.magenta);
    utils.logInfo('    --cli=cli1,cli2', COLOR.magenta);
    utils.logInfo('      where cliN is one of: ' + Object.keys(SDK.forceclis).join(', '), COLOR.magenta);
    utils.logInfo('    OR', COLOR.magenta);
    utils.logInfo('    --sfdx-plugin', COLOR.magenta);
}
