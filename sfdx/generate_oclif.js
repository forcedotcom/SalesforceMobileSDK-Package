#!/usr/bin/env node

// Dependencies
var fs = require('fs'),
    path = require('path'),
    SDK = require('../shared/constants'),
    configHelper = require('../shared/configHelper');

function generateCommandClasses() {

    for (var cliName in SDK.forceclis) {
        var cli = SDK.forceclis[cliName];
        var dirPath = path.resolve(__dirname, 'oclif', 'mobilesdk', cli.topic);
        fs.mkdirSync(dirPath, {recursive: true});
        cli.commands.map(commandName => {
            generateCommmandClass(cli, commandName);
        })
    }
}

function generateCommmandClass(cli, commandName) {
    var className = capitalize(cli.topic) + capitalize(commandName) + 'Command';
    var classPath = path.resolve(__dirname, 'oclif', 'mobilesdk', cli.topic, commandName + '.js');
    var classContent = [
        `/*`,
        ` * Copyright (c) 2019-present, salesforce.com, inc.`,
        ` * All rights reserved.`,
        ` * Redistribution and use of this software in source and binary forms, with or`,
        ` * without modification, are permitted provided that the following conditions`,
        ` * are met:`,
        ` * - Redistributions of source code must retain the above copyright notice, this`,
        ` * list of conditions and the following disclaimer.`,
        ` * - Redistributions in binary form must reproduce the above copyright notice,`,
        ` * this list of conditions and the following disclaimer in the documentation`,
        ` * and/or other materials provided with the distribution.`,
        ` * - Neither the name of salesforce.com, inc. nor the names of its contributors`,
        ` * may be used to endorse or promote products derived from this software without`,
        ` * specific prior written permission of salesforce.com, inc.`,
        ` * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"`,
        ` * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE`,
        ` * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE`,
        ` * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE`,
        ` * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR`,
        ` * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF`,
        ` * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS`,
        ` * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN`,
        ` * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)`,
        ` * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE`,
        ` * POSSIBILITY OF SUCH DAMAGE.`,
        ` */`,
        `const path = require('path');`,
        ``,
        `const OclifAdapter = require('../../../shared/oclifAdapter');`,
        `const SDK = require('../../../shared/constants');`,
        ,
        `class ${className} extends OclifAdapter {`,
        `    static get command() {`,
        `        return OclifAdapter.getCommand.call(this, SDK.forceclis.${cli.name}, path.parse(__filename).name);`,
        `    }`,
        ``,
        `    async run() {`,
        `        this.execute(SDK.forceclis.${cli.name}, ${className});`,
        `    }`,
        `}`,
        ``,
        `${className}.description = OclifAdapter.formatDescription(${className}.command.description,`,
        `    ${className}.command.help);`,
        ``,
        `${className}.longDescription = ${className}.command.longDescription;`,
        `${className}.hidden = ${className}.command.hidden;`,
        `${className}.flags = OclifAdapter.toFlags(${className}.command.args);`,
        ``,
        `exports.${className} = ${className};`
    ].join('\n');
    fs.writeFileSync(classPath, classContent);
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Main
function main() {
    generateCommandClasses();
}

main()


