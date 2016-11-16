#!/usr/bin/env node

// Dependencies
var path = require('path'),
    shelljs = require('shelljs'),
    utils = require('./utils.js'),
    commandLineUtils = require('./commandLineUtils'),
    COLOR = require('./outputColors'),
    SDK = require('./constants')
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
    var chosenOperatingSystems = cleanSplit(parsedArgs.os, ',');
    var buildingiOS = chosenOperatingSystems.indexOf('ios') >= 0;
    var buildingAndroid = chosenOperatingSystems.indexOf('android') >= 0;

    // Usage
    if (usageRequested || (!buildingiOS && !buildingAndroid)) {
        usage();
        process.exit(1);
    }

    // Pack
    if (buildingiOS) {
        pack('ios');
    }

    if (buildingAndroid) {
        pack('android');
    }


}

//
// Create forceios/droid-xxx.tgz package for given os
// 
function pack(os) {
    var packageName = 'force' + (os === 'ios' ? os : 'droid') + '-' + SDK.version + '.tgz';

    utils.logInfo('Creating ' + packageName, COLOR.green);
    
    // Packing
    var packageRepoDir = path.join(__dirname, '..');
    var osDir = path.join(packageRepoDir, os);
    var osSharedDir = path.join(osDir, 'shared');

    // npm pack doesn't following links
    utils.removeFile(osSharedDir);
    shelljs.cp('-R', path.join(packageRepoDir, 'shared'), osDir);
    utils.runProcessThrowError('npm pack', osDir);
    utils.removeFile(osSharedDir);
    shelljs.ln('-s', path.join('..', 'shared'), osSharedDir);

    // Moving package to current directory
    utils.moveFile(path.join(osDir, packageName), packageName);
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
    utils.logInfo('    --os=os1,os2', COLOR.magenta);
    utils.logInfo('      where osN are : ios, android', COLOR.magenta);
}
