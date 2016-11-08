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

var shelljs = require('shelljs'),
    execSync = require('child_process').execSync,
    fs = require('fs'),
    path = require('path'),
    COLOR = require('./outputColors');

/**
 * Creates a comparable version number from a version string in the format x[.y[.ignored]].
 * Currently only looks for major and minor version numbers.
 *
 * Examples:
 * getVersionNumberFromString('5') will return 5000.
 * getVersionNumberFromString('5.8') will return 5008
 * getVersionNumberFromString('5.11.26-43.3.7') will return 5011
 * getVersionNumberFromString('sandwich') will log an error and return 0
 *
 * @param {String} versionString The string representation of the version.
 * @return {Number} The numeric version number, or 0 if the version string isn't a valid format.
 */
function getVersionNumberFromString(versionString) {
	// Only supporting major/minor version checking at this point.
	var versionRegex = /^(\d+)(\.(\d+))?.*$/;
	var matchArray = versionString.match(versionRegex);
	if (matchArray === null) {
		console.log('Invalid version string "' + versionString + '". Should be in the format x[.y[.ignored]]');
		return 0;
	} else {
		var majorVersion = parseInt(matchArray[1]);
		var minorVersion = (matchArray[3] === undefined ? 0 : parseInt(matchArray[3]));
		var combinedVersion = (1000 * majorVersion) + minorVersion;
		return combinedVersion;
	}
};

/** 
 * Replaces text in a file
 *
 * @param {String} fileName The file in which the text needs to be replaced
 * @param {String} textInFile Text in the file to be replaced
 * @param {String} replacementText Text used to replace the text in file
 */
function replaceTextInFile(fileName, textInFile, replacementText) {
    var contents = fs.readFileSync(fileName, 'utf8');
    var lines = contents.split(/\r*\n/);
    var result = lines.map(function (line) {
      return line.replace(textInFile, replacementText);
    }).join('\n');

    fs.writeFileSync(fileName, result, 'utf8'); 
}


/**
 * Run shell command
 *
 * @param {String} cmd The command to execute
 * @param {String} dir Optional. The directory the command should be executed in
 * @param {Boolean} returnOutput. If true, returns output as string. If false, pipes output through.
 */
function runProcessThrowError(cmd, dir, returnOutput) {
    log('Running: ' + cmd);
    if (dir) shelljs.pushd(dir);
    try {
        if (returnOutput) {
            return execSync(cmd).toString();
        }
        else {
            execSync(cmd, {stdio:[0,1,2]});
        }
    }
    finally {
        if (dir) shelljs.popd();
    }
}

/**
 * Makes temp directory.
 *
 * @return {String} Path of temp directory
 */

function mkTmpDir() {
    var tmpDir = path.join('tmp' + random(1000));
    log('Making temp dir:' + tmpDir);
    shelljs.mkdir('-p', tmpDir);
    return tmpDir;
}

/**
 * Generates random number.
 *
 * @param {Number} n
 * @return {Number} a random number between n/10 and n.
 */
function random(n) {
    return (n/10)+Math.floor(Math.random()*(9*n/10));
}

/**
 * Replace string in files.
 * 
 * @param {String or RegExp} from String to match
 * @param {String} to Replacement string
 * @param {Array} files List of files to do the replacements in
 */
function replaceInFiles(from, to, files) {
    var fromRegexp = typeof(from) === 'string' ? new RegExp(from, 'g') : from;
    for (var i=0; i<files.length; i++) {
        log('Replacing ' + from + ' with ' + to + ' in: ' + files[i]);
        replaceTextInFile(files[i], fromRegexp, to);
    }
}

/**
 * Move file or directory.
 * 
 * @param {String} from Path of file or directory to move.
 * @param {String} to New path for file or directory.
 */
function moveFile(from, to) {
    log('Moving: ' + from + ' to ' + to);
    var targetDir = path.parse(to).dir;
    if (targetDir && shelljs.test('-e', targetDir)) {
        shelljs.mkdir('-p', targetDir);
    }
    shelljs.mv(from, to);
}

/**
 * Remove file or directory.
 * 
 * @param {String} path Path of file or directory to remove.
 */
function removeFile(path) {
    log('Removing: ' + path);
    shelljs.rm('-rf', path);
}

/**
 * Throw error if file/directory exists.
 * 
 * @param {String} path Path of file or directory to check.
 */
function failIfExists(path) {
    if (shelljs.test('-e', path)) {
        throw new Error(path + ' already exists.');
    }
}

/**
 * Copy from template.
 * 
 * @param {String} path Path of file or directory to remove.
 */
function copyFromTemplate(templateRepoUrl, templateBranch, templatePath, destinationDir) {
    // Log
    log('Copying template into ' + destinationDir);

    shelljs.cp('-R', '/Users/wmathurin/Development/github/wmathurin/SalesforceMobileSDK-Templates/HybridLocal', destinationDir);
    return;

    // Create tmp dir
    var tmpDir = mkTmpDir();

    // Clone template repo
    runProcessThrowError('git clone --branch ' + templateBranch + ' --single-branch --depth 1 ' + templateRepoUrl + ' ' + tmpDir);

    // Copy template to project dir
    shelljs.cp('-R', path.join(tmpDir, templatePath), destinationDir);

    // Remove tmp dir
    removeFile(tmpDir);
}    

/**
 * Run prepare function of template.js
 *
 * @param {String} projectDir
 * @param {Object} config
 *
 * @return the value returned by template.js prepare function
 */
function runTemplatePrepare(projectDir, config) {
    // Run prepare function of template
    log('Preparing template into ' + projectDir);

    var templatePrepare = require(path.join(projectDir, 'template.js')).prepare;
    shelljs.pushd(projectDir);
    try {
        return templatePrepare(config, replaceInFiles, moveFile, removeFile);
    }
    finally {
        shelljs.popd();
    }
}    

/**
 * Log multiline header
 *
 * @param {String} lines
 */
function logHeader(lines) {
    log("");
    log("********************************************************************************", COLOR.green);
    log("*", COLOR.green);
    for (var i=0; i<lines.length; i++) {
        log("*   " + lines[i], COLOR.green);
    }
    log("*", COLOR.green);
    log("********************************************************************************", COLOR.green);
    log("");
}

/**
 * Log in color.
 * 
 * @param {String} msg Message to log.
 * @param {String} color Color to use.
 */
function log(msg, color) {
    if (color) {
        console.log(color + msg + COLOR.reset);
    }
    else {
        console.log(msg);
    }
}

module.exports = {
    getVersionNumberFromString,
    runProcessThrowError,
    replaceInFiles,
    moveFile,
    removeFile,
    failIfExists,
    copyFromTemplate,
    runTemplatePrepare,
    logHeader,
    log
};
