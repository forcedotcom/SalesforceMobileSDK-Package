/*
 * Copyright (c) 2018-present, salesforce.com, inc.
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
var path = require('path'),
    SDK = require('./constants'),
    utils = require('./utils');

//
// Helper to prepare template
// 
function prepareTemplate(config, templateDir) {
    var template = require(path.join(templateDir, 'template.js'));
    return utils.runFunctionThrowError(
        function() {
            return template.prepare(config, utils.replaceInFiles, utils.moveFile, utils.removeFile);
        },
        templateDir);
}

//
// Get templates for the given cli
//
function getTemplates(cli) {
    try {

        // Creating tmp dir for template clone
        var tmpDir = utils.mkTmpDir();

        // Cloning template repo
        var repoDir = utils.cloneRepo(tmpDir, SDK.templatesRepoUri);

        // Getting list of templates
        var templates = require(path.join(repoDir, 'templates.json'));

        // Keeping only applicable templates, adding full template url
        var applicableTemplates = templates
            .filter(template => cli.appTypes.includes(template.appType) && cli.platforms.filter(platform => template.platforms.includes(platform)).length > 0);

        // Cleanup
        utils.removeFile(tmpDir);

        return applicableTemplates;
    }
    catch (error) {
        utils.logError(cli.name + ' failed\n', error);
        process.exit(1);
    }
}

//
// Get appType for the given template given by its uri
//
function getAppTypeFromTemplate(templateRepoUriWithPossiblePath) {
    var templateUriParsed = utils.separateRepoUrlPathBranch(templateRepoUriWithPossiblePath);
    var templateRepoUri = templateUriParsed.repo + '#' + templateUriParsed.branch;
    var templatePath = templateUriParsed.path;

    // Creating tmp dir for template clone
    var tmpDir = utils.mkTmpDir();

    // Cloning template repo
    var repoDir = utils.cloneRepo(tmpDir, templateRepoUri);

    // Getting template
    var appType = require(path.join(repoDir, templatePath, 'template.js')).appType;

    // Cleanup
    utils.removeFile(tmpDir);

    // Done
    return appType;
}


module.exports = {
    prepareTemplate,
    getTemplates,
    getAppTypeFromTemplate
};
