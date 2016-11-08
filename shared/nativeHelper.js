/*
 * Copyright (c) 2016-present, salesforce.com, inc.
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
    utils = require('./utils');

/**
 * Create native app
 * @param config
 *   platform
 *   apptype
 *   appname
 *   packagename  
 *   organization
 *   templaterepourl
 *   templatebranch
 *   templatepath
 *
 * @return result map with
 *   projectPath     relative path to new project
 *   workspacePath   relative path to workspace 
 *   bootconfigFile  relative path to file that contains the oauth app id and callback uri
 */
function createNativeApp(config) {

    // Computing projectDir
    var projectDir = config.outputdir ? path.resolve(config.outputdir) : path.join(process.cwd(),config.appname)
    var projectPath = path.relative(process.cwd(), projectDir);

    // Check if directory exists
    utils.failIfExists(projectDir);

    // Printing out details
    utils.logHeader(['Creating ' + config.platform + ' ' + config.apptype + ' application using Salesforce Mobile SDK',
                     '  with app name:        ' + config.appname,
                     '       package name:    ' + config.packagename,
                     '       organization:    ' + config.organization,
                     '',
                     '  in:                   ' + projectPath,
                     '',
                     '  from template repo:   ' + config.templaterepourl,
                     '       template branch: ' + config.templatebranch,
                     '       template path:   ' + config.templatepath
                    ]);
    
    // Copying template to projectDir
    utils.copyFromTemplate(config.templaterepourl, config.templatebranch, config.templatepath, projectDir);

    // Run prepare function of template
    var prepareResult = utils.runTemplatePrepare(projectDir, config);

    // Cleanup
    utils.removeFile(path.join(projectDir, 'template.js'));

    // Done
    var result = {
        projectPath: projectPath,
        workspacePath: path.join(projectPath, prepareResult.workspacePath),
        bootconfigFile: path.join(projectPath, prepareResult.bootconfigFile)
    }

    return result;
}

module.exports.createNativeApp = createNativeApp;
