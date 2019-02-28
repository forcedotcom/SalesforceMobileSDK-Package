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
const path = require('path');

const LegacyCommand = require('../../../../shared/oclifAdapter');
const SDK = require('../../../shared/constants');
const configHelper = require('../../../shared/configHelper');

class ReactNativeCreateWithTemplateCommand extends LegacyCommand {

    static get description() {
        return this.command.description
    }

    static get longDescription() {
        return this.command.longDescription
    }

    static get hidden() {
        return !!this.command.hidden;
    }

    static get flagsConfig() {
        return LegacyCommand.toFlagsConfig(this.command.args);
    }

    static get commandName() { return path.parse(__filename).name }

    static get command() {
        if (!this._command) {
            this._command = configHelper.getCommandExpanded(SDK.forceclis.forcereact, this.commandName);
        }
        return this._command;
    }

    async run() {
        this.resolveHerokuContext();
        if (LegacyCommand.validateCommand(SDK.forceclis.forcereact,
            ReactNativeCreateWithTemplateCommand.command.name, this.flags)) {

            return LegacyCommand.runCommand(SDK.forceclis.forcereact,
                ReactNativeCreateWithTemplateCommand.command.name, this.flags);
        }
    }
}

exports.ReactNativeCreateWithTemplateCommand = ReactNativeCreateWithTemplateCommand;
