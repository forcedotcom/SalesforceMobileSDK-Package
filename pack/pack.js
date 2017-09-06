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
    var chosenClis = cleanSplit(parsedArgs.cli, ',');

    // Usage
    if (usageRequested || !chosenClis.some(cli=>Object.keys(SDK.forceclis).indexOf(cli) >= 0)) {
        usage();
        process.exit(1);
    }
    // Pack
    for (var cli of Object.values(SDK.forceclis)) {
        if (chosenClis.indexOf(cli.name) >= 0) {
            pack(cli);
        }
    }
}

//
// Create forceios/droid-xxx.tgz package for given os
// 
function pack(cli) {
    var packageName = cli.name + '-' + SDK.version + '.tgz';

    utils.logInfo('Creating ' + packageName, COLOR.green);
    
    // Packing
    var packageRepoDir = path.join(__dirname, '..');
    var cliDir = path.join(packageRepoDir, cli.dir);
    var cliSharedDir = path.join(cliDir, 'shared');

    // npm pack doesn't following links
    utils.removeFile(cliSharedDir);
    shelljs.cp('-R', path.join(packageRepoDir, 'shared'), cliDir);
    utils.runProcessThrowError('npm pack', cliDir);
    utils.removeFile(cliSharedDir);
    shelljs.ln('-s', path.join('..', 'shared'), cliSharedDir);

    // Moving package to current directory
    utils.moveFile(path.join(cliDir, packageName), packageName);
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
    utils.logInfo('      where cliN is among: ' + Object.keys(SDK.forceclis).join(', '), COLOR.magenta);
}
