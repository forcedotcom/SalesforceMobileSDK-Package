#!/usr/bin/env node

/*
 * Copyright (c) 2019-present, salesforce.com, inc.
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
var spawnSync = utils = require('../shared/utils'),
    commandLineUtils = require('../shared/commandLineUtils'),
    fs = require('fs'),
    path = require('path'),
    SDK = require('../shared/constants'),
    COLOR = require('../shared/outputColors'),
    storeSchema = require('./store.schema.json'),
    syncsSchema = require('./syncs.schema.json')
    Ajv = require('ajv')
;

// Config types
var CONFIG_TYPES = {
    store: 'store',
    syncs: 'syncs'
};


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
    var configPath = parsedArgs.path;
    var configType = parsedArgs.type;

    // Show usage if requested
    if (usageRequested) {
        usage(0);
    }

    // Show error and usage if no path or type specified
    if (!configPath || !configType) {
        utils.logError('You need to specify a config path and type\n');
        usage(1);
    }

    // Show error if invalid path specified
    if (!fs.existsSync(configPath)) {
        utils.logError(`You specified a config file [${configPath}] that does not exist\n`);
        process.exit(1);
    }

    // Show error if invalid
    if (!CONFIG_TYPES.hasOwnProperty(configType)) {
        utils.logError(`You specified a config type [${configType}] that does not exist\n`);
        process.exit(1);
    }

    // Check specified config file
    checkConfig(configPath, configType);
}

//
// Usage function
//
function usage(exitCode) {
    utils.logInfo('Usage:\n',  COLOR.cyan);
    utils.logInfo('  forcecheckconfig --usage', COLOR.magenta);
    utils.logInfo('\n OR \n', COLOR.cyan);
    utils.logInfo('  forcecheckconfig --path=configPath --type=configType', COLOR.magenta);
    utils.logInfo('  Where:', COLOR.cyan);
    utils.logInfo('  - configPath is the path to a store config or a syncs config', COLOR.cyan);
    utils.logInfo('  - configType is: store or syncs', COLOR.cyan);
    utils.logInfo('', COLOR.cyan);

    if (typeof(exitCode) !== 'undefined') {
        process.exit(exitCode);
    }
}


//
// Config validation
//
function checkConfig(configPath, configType) {
    var config = require(path.resolve(configPath));
    var schema = configType == CONFIG_TYPES.store ? storeSchema : syncsSchema;
    var ajv = new Ajv({allErrors: true});
    var valid = ajv.validate(schema, config);
    if (!valid) {
        utils.logError(JSON.stringify(ajv.errors, null, "  "))
    } else {
        utils.logInfo(`${configPath} conforms to ${configType} schema\n`, COLOR.green)
    }
}
