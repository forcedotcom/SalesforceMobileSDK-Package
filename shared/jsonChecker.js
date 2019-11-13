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
var fs = require('fs'),
    path = require('path'),
    COLOR = require('./outputColors'),
    utils = require('./utils'),
    Ajv = require('ajv'),
    jsonlint = require('jsonlint')
;

// Config type to schema map
var SCHEMA = {
    store: path.resolve(__dirname, 'store.schema.json'),
    syncs: path.resolve(__dirname, 'syncs.schema.json')
};


//
// Validate config against schema
//
function validateJson(configPath, configType) {
    var config = readJsonFile(configPath)
    var schema = readJsonFile(SCHEMA[configType])
    var ajv = new Ajv({allErrors: true});
    var valid = ajv.validate(schema, config);
    if (!valid) {
        utils.logError(JSON.stringify(ajv.errors, null, "  "))
    } else {
        utils.logInfo(`${configPath} conforms to ${configType} schema\n`, COLOR.green)
    }
}

//
// Read json from file and validates that is valid json
//
function readJsonFile(filePath) {
    try {
        var content = fs.readFileSync(filePath, "UTF-8");
        var json = jsonlint.parse(content);
        return json;
    } catch (error) {
        utils.logError(`Error parsing ${filePath}: ${error}\n`);
        process.exit(1);
    }
}

module.exports = {
    validateJson
};
