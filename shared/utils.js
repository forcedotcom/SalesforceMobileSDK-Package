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
}

/**
 * Checks the the version of a tool by running the given command
 * 
 * @param {String} cmd Command to run to get the tool version
 * @param {String} minVersionRequired Minimum version required
 *
 * @throws {Error} if tool not found or version too low
 */
function checkToolVersion(cmd, minVersionRequired) {
    var toolName = cmd.split(' ')[0];
    var toolVersion;
    try {
	    var result = runProcessThrowError(cmd, null, true /* return output */);
        toolVersion = result.replace(/\r?\n|\r/, '');
    }
    catch (error) {
        throw new Error(toolName + ' is required but could not be found. Please install ' + toolName + '.');
    }

    var toolVersionNum = getVersionNumberFromString(toolVersion);
    var minVersionRequiredNum = getVersionNumberFromString(minVersionRequired);

    if (toolVersionNum < minVersionRequiredNum) {
        throw new Error('Installed ' + toolName + 'version (' + toolVersion + ') is less than the minimum required version ('
                        + minVersionRequired + ').  Please update your version of ' + toolName + '.');
    }
}


/** 
 * Replaces text in a file
 *
 * @param {String} fileName The file in which the text needs to be replaced.
 * @param {String} textInFile Text in the file to be replaced.
 * @param {String} replacementText Text used to replace the text in file.
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
 * Run shell command - throws error if any
 *
 * @param {String} cmd The command to execute.
 * @param {String} dir Optional. The directory the command should be executed in.
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
 * Run shell command - throws error if any
 *
 * @param {String} cmd The command to execute.
 * @param {String} msg Message to print on success/failure.
 * @param {String} dir Optional. The directory the command should be executed in.
 *
 * @return true if successful, false otherwise
 */
function runProcessCatchError(cmd, msg, dir) {
    var success = false;
    log('Running: ' + cmd);
    try {
        runProcessThrowError(cmd, dir);
        if (msg) log('!SUCCESS! ' + msg, COLOR.green);
        success = true;
    } catch (err) {
        logError(msg ? '!FAILURE! ' + msg : '', err);
    }
    finally {
        return success;
    }
}

/**
 * Run function - throws error if any
 *
 * @param {Function} func The function to execute.
 * @param {String} dir Optional. The directory the function should be executed from.
 */
function runFunctionThrowError(func, dir) {
    if (dir) shelljs.pushd(dir);
    try {
        return func();
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
    var d = new Date();
    var tmpDir = path.resolve('tmp' + d.getTime());
    log('Making temp dir:' + tmpDir);
    shelljs.mkdir('-p', tmpDir);
    return tmpDir;
}

/**
 * Replace string in files.
 * 
 * @param {String or RegExp} from String to match.
 * @param {String} to Replacement string.
 * @param {Array} files List of files to do the replacements in.
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
    if (targetDir && !shelljs.test('-e', targetDir)) {
        shelljs.mkdir('-p', targetDir);
    }
    shelljs.mv(from, to);
}

/**
 * Copy recursively.
 * 
 * @param {String} from Path of file or directory to move.
 * @param {String} to New path for file or directory.
 */
function copyFile(from, to) {
    log('Copying: ' + from + ' to ' + to);
    shelljs.cp('-R', from, to);
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
 * Clone repo.
 *
 * @param {String} tmpDir Parent dir for clone
 * @param {String} repoUrlWithBranch Repo URL e.g. https://github.com/xyz/abc or https://github.com/xyz/abc#branch
 *
 * @return repoDir
 */

function cloneRepo(tmpDir, repoUrlWithBranch) {
    var parts = repoUrlWithBranch.split('#');
    var repoUrl = parts[0];
    var branch = parts.length > 1 ? parts[1] : 'master';
    var subparts = repoUrl.split('/');
    var repoName = subparts[subparts.length - 1];
    var repoDir = path.join(tmpDir, repoName);

    shelljs.mkdir('-p', repoDir);
    runProcessThrowError('git clone --branch ' + branch + ' --single-branch --depth 1 --recurse-submodules ' + repoUrl + ' ' + repoDir);
    return repoDir;
}

/**
 * Log paragraph (header or footer)
 *
 * @param {String} lines
 */
function logParagraph(lines) {
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
 * Log error
 *
 * @param {Error} error
 */
function logError(context, error) {
    log(context, COLOR.red)
    log(error.message, COLOR.red);
    log(error.stack);
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
    checkToolVersion,
    cloneRepo,
    copyFile,
    failIfExists,
    getVersionNumberFromString,
    log,
    logError,
    logParagraph,
    mkTmpDir,
    moveFile,
    removeFile,
    replaceInFiles,
    runFunctionThrowError,
    runProcessCatchError,
    runProcessThrowError
};
