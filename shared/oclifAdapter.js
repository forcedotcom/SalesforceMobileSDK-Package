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
const COLOR = require('./outputColors');

const SDK = require('./constants');
const configHelper = require('./configHelper');
const createHelper = require('./createHelper');
const templateHelper = require('./templateHelper');
const jsonChecker = require('./jsonChecker');
const logInfo = require('./utils').logInfo;
const logError = require('./utils').logError;
const os = require('os');

const { SfdxError } = require('@salesforce/core');
const { Command, flags } = require('@oclif/command');

const namespace = 'mobilesdk';

class OclifAdapter extends Command {

    static formatDescription(description, help) {
        return `${description}${os.EOL}${os.EOL}${help}`;
    }

    static listTemplates(cli) {
        const applicableTemplates = templateHelper.getTemplates(cli);

        logInfo('\nAvailable templates:\n', COLOR.cyan);
        for (let i=0; i<applicableTemplates.length; i++) {
            const template = applicableTemplates[i];
            logInfo((i+1) + ') ' + template.description, COLOR.cyan);
            logInfo('sfdx ' +  [namespace, cli.topic, SDK.commands.createwithtemplate.name].join(':') + ' --' +
                SDK.args.templateRepoUri.name + '=' + template.path, COLOR.magenta);
        }
        logInfo('');
    }

    static runCommand(cli, commandName, vals) {
        switch(commandName) {
            case SDK.commands.create.name:
            case SDK.commands.createwithtemplate.name:
                createHelper.createApp(cli, vals);
                break;
            case SDK.commands.version.name:
                configHelper.printVersion(cli);
                break;
            case SDK.commands.listtemplates.name:
                OclifAdapter.listTemplates(cli);
                process.exit(0);
                break;
            case SDK.commands.checkconfig.name:
                jsonChecker.validateJson(vals.configpath, vals.configtype);
                break;
        }
    }

    // Validation
    static validateCommand(cli, commandName, vals) {
        let success = true;
        const args = configHelper.getArgsExpanded(cli, commandName);
        for (const arg of args) {
            const val = vals[arg.name];

            if (typeof arg.validate === 'function' && !arg.validate(val, cli)) {
                success = false;
                logError(arg.error(val, cli));
            }
        }
        return success;
    }

    /**
     * Convert legacy-style flag declarations to SfdxCommand's updated format.
     *
     * @param {Array} flags The legacy flags to convert.
     */
    static toFlags(flagContent) {
        const flagsConfig = {};
        if (flagContent) {
            flagContent.forEach(flag => {
                const { name, char, hidden, required, longDescription, type, values, array } = flag;
                const description = flag.description || '';
                const config = {
                    description,
                    longDescription,
                    hidden,
                    required,
                    default: flag.default
                };
                if (char) {
                    // oclif types char as a single alpha char, but Flag specifies it as `string`,
                    // so we use `any` here to get tsc to accept the assignment
                    config.char = char;
                }
                if (values) {
                    config.options = values;
                }
                delete flagContent.hasValue;
                if (type === 'boolean') {
                    flagsConfig[name] = flags.boolean(config);
                }
                else if (array) {
                    flagsConfig[name] = flags.array(config);
                }
                else if (type === 'string') {
                    flagsConfig[name] = flags.string(config);
                }
                else {
                    // TODO
                    throw new Error('oh noes! ' + JSON.stringify(flag));
                }
            });
        }
        return flagsConfig;
    }

    execute(cli, klass) {
        const { flags } = this.parse(klass);
        if (OclifAdapter.validateCommand(cli, klass.command.name, flags)) {
            return OclifAdapter.runCommand(cli, klass.command.name, flags);
        }
    }

    resolveHerokuContext() {
        this.stringifyFlags();
        return {
            flags: this.flags
        }
    }

    /**
     * Call to stringify parsed flags for backward compatibility.
     */
    stringifyFlags() {
        Object.keys(this.flags).forEach(name => {
            const flag = this.flags[name];
            if (flag == null) {
                return;
            }
            const typeOfFlag = typeof this.flags[name];
            switch (typeOfFlag) {
                case 'string':
                case 'number':
                    this.flags[name] = flag + '';
                    break;
                case 'boolean':
                    break;
                case 'object':
                    if (Array.isArray(flag)) {
                        this.flags[name] = flag.join(',');
                        break;
                    } else if (flag instanceof Date) {
                        this.flags[name] = flag.toISOString();
                        break;
                    } else if (flag instanceof Duration) {
                        this.flags[name] = flag.quantity + '';
                        break;
                    } else {
                        throw new SfdxError(`Unexpected value type for flag ${name}`, 'UnexpectedFlagValueType');
                    }
                default:
                    throw new SfdxError(`Unexpected value type for flag ${name}`, 'UnexpectedFlagValueType');
            }
        });
    }
}

OclifAdapter.getCommand = function(cli, commandName) {
    if (!this._command) {
        this._command = configHelper.getCommandExpanded(cli, commandName);
    }
    return this._command;
};

module.exports = OclifAdapter;
