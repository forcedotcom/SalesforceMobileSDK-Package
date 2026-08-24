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
    SDK = require('./constants'),
    utils = require('./utils'),
    configHelper = require('./configHelper'),
    prepareTemplate = require('./templateHelper').prepareTemplate,
    getSDKTemplateURI = require('./templateHelper').getSDKTemplateURI,
    fs = require('fs'),
    Ajv = require('ajv'),
    COLOR = require('./outputColors'),
    readJsonFile = require('./jsonChecker').readJsonFile;

// Constant
var SERVER_PROJECT_DIR = 'server';    

//
// Helper for native application creation
//
function createNativeApp(config) {

    // Copying template to projectDir
    utils.copyFile(config.templateLocalPath, config.projectDir);

    // Run prepare function of template
    var prepareResult = prepareTemplate(config, config.projectDir);

    // Cleanup
    utils.removeFile(path.join(config.projectDir, 'template.js'));

    // Done
    return prepareResult;
}

//
// Helper for hybrid application creation
//
function createHybridApp(config) {

    // Create app with cordova
    utils.runProcessThrowError('cordova create "' + config.projectDir + '" ' + config.packagename + ' ' + config.appname);
    utils.runProcessThrowError('npm install shelljs@0.8.5', config.projectDir);

    for (var platform of config.platform.split(',')) {
        utils.runProcessThrowError('cordova platform add ' + platform + '@' + SDK.tools.cordova.platformVersion[platform], config.projectDir);
    }
    utils.runProcessThrowError('cordova plugin add ' + config.cordovaPluginRepoUri + ' --force', config.projectDir);

    // Override sdk dependencies in the generated iOS Podfile if an iOS override was provided.
    // `cordova plugin add` above already ran `pod install` once against the plugin's hardcoded
    // pod sources; the `cordova prepare` call further down always reparses and rewrites the
    // Podfile (the plugin sets a deployment-target preference) and reruns `pod install`, which
    // is what actually picks up this edit.
    if (config.sdkdependencies && config.platform.split(',').includes('ios')) {
        overrideHybridIosPodfile(path.join(config.projectDir, 'platforms', 'ios', 'Podfile'), config.sdkdependencies);
    }

    // Web directory - the home for the template
    var webDir = path.join(config.projectDir, 'www');
    
    // Remove the default Cordova app.
    utils.removeFile(webDir);

    // Copying template to www
    utils.copyFile(config.templateLocalPath, webDir);

    // Run prepare function of template
    var prepareResult = prepareTemplate(config, webDir);

    // Cleanup
    utils.removeFile(path.join(webDir, 'template.js'));

    // If template includes server side files
    // Create a fresh sfdx project
    // Add cordova js and plugins at static resources
    // Merge files from template into it
    if (utils.dirExists(path.join(webDir, SERVER_PROJECT_DIR))) {
        config.serverDir = path.join(config.projectDir, SERVER_PROJECT_DIR)
        utils.runProcessThrowError('sf force project create -n ' + SERVER_PROJECT_DIR, config.projectDir);

        // Copy cordova js to static resources
        for (var platform of config.platform.split(',')) {
            var cordovaStaticResourcesDir = path.join(config.serverDir, 'force-app', 'main', 'default', 'staticresources', 'cordova' + platform);
            utils.mkDirIfNeeded(cordovaStaticResourcesDir);
            utils.copyFile(path.join(config.projectDir, 'platforms', platform, 'platform_www', '*'), cordovaStaticResourcesDir);
        }

        // Merge server files from templates
        utils.mergeFile(path.join(webDir, SERVER_PROJECT_DIR), config.serverDir);

        // Remove server files from www
        utils.removeFile(path.join(webDir, SERVER_PROJECT_DIR));
    }

    // Run cordova prepare
    utils.runProcessThrowError('cordova prepare', config.projectDir);

    // Remove CordovaLib subproject from iOS workspace to fix archiving issue
    if (config.platform.split(',').includes('ios')) {
        removeCordovaLibFromWorkspace(config.projectDir, config.appname);
    }

    // Add theme for Android API 35
    if (config.platform.split(',').includes('android')) {
        createAndroidAPI35Theme(config.projectDir);
    }

    // Done
    return prepareResult;
}

//
// Remove CordovaLib subproject from iOS project
// This fixes the "Generic Xcode Archive" issue when archiving
//
function removeCordovaLibFromWorkspace(projectDir, appname) {
    const projectPath = path.join(projectDir, 'platforms', 'ios', appname + '.xcodeproj');
    const pbxprojPath = path.join(projectPath, 'project.pbxproj');

    if (!fs.existsSync(pbxprojPath)) {
        utils.logDebug('Project file not found, skipping CordovaLib removal: ' + pbxprojPath);
        return;
    }

    try {
        // Read the project file
        let content = fs.readFileSync(pbxprojPath, 'utf8');
        const originalContent = content;

        // Step 1: Find and store the CordovaLib file reference ID
        const fileRefMatch = content.match(/([A-F0-9]+)\s*\/\*\s*CordovaLib\.xcodeproj\s*\*\/\s*=\s*\{isa\s*=\s*PBXFileReference[^}]*CordovaLib\/CordovaLib\.xcodeproj[^}]*\}/);
        if (!fileRefMatch) {
            utils.logDebug('CordovaLib file reference not found in project');
            return;
        }
        const cordovaLibId = fileRefMatch[1];

        // Step 2: Find all PBXContainerItemProxy IDs that reference CordovaLib (need to track for PBXReferenceProxy removal)
        const containerProxyIds = [];
        const proxyRegex = /([A-F0-9]+)\s*\/\*\s*PBXContainerItemProxy\s*\*\/\s*=\s*\{[^}]*containerPortal\s*=\s*[A-F0-9]+[^}]*remoteInfo\s*=\s*CordovaLib[^}]*\}/g;
        let match;
        while ((match = proxyRegex.exec(content)) !== null) {
            containerProxyIds.push(match[1]);
        }

        // Step 3: Find all PBXTargetDependency IDs that reference CordovaLib (we need to track these)
        const targetDepIds = [];
        const targetDepRegex = /([A-F0-9]+)\s*\/\*\s*PBXTargetDependency\s*\*\/\s*=\s*\{[^}]*name\s*=\s*CordovaLib;[^}]*\}/g;
        while ((match = targetDepRegex.exec(content)) !== null) {
            targetDepIds.push(match[1]);
        }

        // Step 4: Find the Products group ID from projectReferences
        const productsGroupMatch = content.match(/ProductGroup\s*=\s*([A-F0-9]+)\s*\/\*\s*Products\s*\*\/\s*;\s*ProjectRef\s*=\s*[A-F0-9]+\s*\/\*\s*CordovaLib\.xcodeproj/);
        const productsGroupId = productsGroupMatch ? productsGroupMatch[1] : null;

        // Step 5: Remove all PBXContainerItemProxy entries that reference CordovaLib
        content = content.replace(new RegExp(`\\s*[A-F0-9]+\\s*\\/\\*\\s*PBXContainerItemProxy\\s*\\*\\/\\s*=\\s*\\{[^}]*containerPortal\\s*=\\s*${cordovaLibId}[^}]*\\};?`, 'g'), '');

        // Step 6: Remove PBXReferenceProxy entries that reference the deleted PBXContainerItemProxy
        containerProxyIds.forEach(id => {
            content = content.replace(new RegExp(`\\s*[A-F0-9]+\\s*\\/\\*\\s*[^*]+\\*\\/\\s*=\\s*\\{[^}]*remoteRef\\s*=\\s*${id}[^}]*\\};?`, 'g'), '');
        });

        // Step 7: Remove the Products group if it exists and references deleted proxies
        if (productsGroupId) {
            content = content.replace(new RegExp(`\\s*${productsGroupId}\\s*\\/\\*\\s*Products\\s*\\*\\/\\s*=\\s*\\{[^}]*\\};?`, 'g'), '');
        }

        // Step 8: Remove PBXTargetDependency entries that reference CordovaLib
        content = content.replace(/\s*[A-F0-9]+\s*\/\*\s*PBXTargetDependency\s*\*\/\s*=\s*\{[^}]*name\s*=\s*CordovaLib;[^}]*\};?/g, '');

        // Step 9: Remove references to PBXTargetDependency IDs from dependencies arrays
        targetDepIds.forEach(id => {
            content = content.replace(new RegExp(`\\s*${id}\\s*\\/\\*\\s*PBXTargetDependency\\s*\\*\\/\\s*,?`, 'g'), '');
        });

        // Step 10: Remove the PBXFileReference entry for CordovaLib.xcodeproj
        content = content.replace(new RegExp(`\\s*${cordovaLibId}\\s*\\/\\*\\s*CordovaLib\\.xcodeproj\\s*\\*\\/\\s*=\\s*\\{[^}]*\\};?`, 'g'), '');

        // Step 11: Remove references to CordovaLib ID from arrays (children, projectReferences, etc.)
        content = content.replace(new RegExp(`\\s*${cordovaLibId}\\s*\\/\\*\\s*CordovaLib\\.xcodeproj\\s*\\*\\/\\s*,?`, 'g'), '');

        // Step 12: Remove entire projectReferences array entries that contain CordovaLib (including ones with empty ProjectRef)
        content = content.replace(/\s*\{\s*ProductGroup\s*=\s*[A-F0-9]+\s*\/\*\s*Products\s*\*\/\s*;\s*ProjectRef\s*=\s*([A-F0-9]*)\s*(\/\*\s*CordovaLib\.xcodeproj\s*\*\/)?\s*;\s*\}\s*,?/g, '');

        // Step 13: Remove the entire projectReferences property if it becomes empty
        content = content.replace(/\s*projectReferences\s*=\s*\(\s*\);?/g, '');

        // Step 14: Clean up any resulting empty lines or trailing commas
        content = content.replace(/,(\s*\))/g, '$1'); // Remove trailing commas before closing parentheses
        content = content.replace(/\n\s*\n\s*\n/g, '\n\n'); // Reduce multiple blank lines to double

        // Only write back if something was changed
        if (content !== originalContent) {
            fs.writeFileSync(pbxprojPath, content, 'utf8');
            utils.log('Removed CordovaLib subproject from Xcode project');
        } else {
            utils.logDebug('No CordovaLib references found to remove');
        }
    } catch (error) {
        utils.logError('Failed to remove CordovaLib from project', error);
    }
}

//
// Add Android API 35 theme file
//
function createAndroidAPI35Theme(projectDir) {
    const dirPath = path.join(projectDir, 'platforms', 'android', 'app', 'src', 'main', 'res', 'values-v35');
    const filePath = path.join(dirPath, 'themes.xml');
    const fileContents = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <!-- Override for API 35+ to fix white status bar with white icons issue -->
    <style name="SalesforceSDK_SplashScreen" parent="Theme.SplashScreen.IconBackground">
        <item name="postSplashScreenTheme">@style/Theme.AppCompat.NoActionBar</item>
        <!-- Use dark icons on light status bar background -->
        <item name="android:windowLightStatusBar">true</item>
    </style>
</resources>` 

    // Ensure the directory exists
    utils.mkDirIfNeeded(dirPath);

    // Write the file
    fs.writeFileSync(filePath, fileContents, 'utf8');
}

//
// Print details
//
function printDetails(config) {
    // Printing out details
    var details = ['Creating ' + config.platform.replace(',', ' and ') + ' ' + config.apptype + ' application using Salesforce Mobile SDK',
                        '  with app name:         ' + config.appname,
                        '       package name:     ' + config.packagename,
                        '       organization:     ' + config.organization,
                        '',
                        '  in:                    ' + config.projectPath,
                        '',
                        '  from template repo:    ' + config.templaterepouri
                  ];

    if (config.templatepath) {
        details = details.concat(['       template path:    ' + config.templatepath]);
    }
            

    if (config.sdkdependencies) {
        details = details.concat(['       sdk dependencies: ' + config.sdkdependencies]);
    }

    // OAuth configuration details
    if (config.consumerkey && config.consumerkey !== '__INSERT_CONSUMER_KEY_HERE__' && config.consumerkey.trim() !== '') {
        details = details.concat(['       consumer key:     ' + config.consumerkey]);
    }

    if (config.callbackurl && config.callbackurl !== '__INSERT_CALLBACK_URL_HERE__' && config.callbackurl.trim() !== '') {
        details = details.concat(['       callback URL:     ' + config.callbackurl]);
    }

    if (config.loginserver && config.loginserver.trim() !== '') {
        details = details.concat(['       login server:     ' + config.loginserver]);
    }
            
    // Hybrid extra details
    if (config.apptype.indexOf('hybrid') >= 0) {
        if (config.apptype === 'hybrid_remote') {
            details = details.concat(['       start page:       ' + config.startpage]);
        }

        details = details.concat(['       plugin repo:      ' + config.cordovaPluginRepoUri]);
    }
            
    utils.logParagraph(details);
}

//
// Check if valid OAuth configuration is provided
//
function hasValidOAuthConfig(config) {
    return config.consumerkey && config.callbackurl &&
           config.consumerkey !== '__INSERT_CONSUMER_KEY_HERE__' &&
           config.callbackurl !== '__INSERT_CALLBACK_URL_HERE__' &&
           config.consumerkey.trim() !== '' && 
           config.callbackurl.trim() !== '' &&
           (!config.loginserver || config.loginserver.trim() !== '');
}

//
// Parse a callback URL into its scheme, host and path components.
// Used to populate the Android redirect <intent-filter> in generated apps.
// Node yields '' for the host of a hostless URI (e.g. testsfdc:///mobilesdk/detect/oauth/done);
// that empty host is intentional and must NOT be coerced to '*'.
// On parse failure returns null so the placeholders remain and the app still builds.
//
function parseCallbackUrl(callbackurl) {
    try {
        var url = new URL(callbackurl);
        return {
            scheme: url.protocol.replace(/:$/, ''),
            host: url.host,
            path: url.pathname
        };
    } catch (error) {
        return null;
    }
}

//
// Print next steps
//
function printNextSteps(ide, projectPath, result, hasValidOAuth) {
    var workspacePath = path.join(projectPath, result.workspacePath);
    var bootconfigFile =  path.join(projectPath, result.bootconfigFile);

    var nextSteps = ['Next steps' + (result.platform ? ' for ' + result.platform : '') + ':',
                     '',
                     'Your application project is ready in ' + projectPath + '.',
                     'To use your new application in ' + ide + ', do the following:', 
                     '   - open ' + workspacePath + ' in ' + ide];

    // Only show OAuth configuration instructions if valid OAuth config was not provided
    if (!hasValidOAuth) {
        nextSteps.push('   - make sure to plug your OAuth Client ID and Callback URI');
        nextSteps.push('     into ' + bootconfigFile);
    }

    nextSteps.push('   - build and run');

    // Printing out next steps
    utils.logParagraph(nextSteps);
};    

//
// Print next steps for Native Login
// 
function printNextStepsForNativeLogin(ide, projectPath, result, hasValidOAuth) {
    var workspacePath = path.join(projectPath, result.workspacePath);
    var bootconfigFile =  path.join(projectPath, result.bootconfigFile);
    var entryFile = (ide === 'XCode') ? 'SceneDelegate' : 'MainApplication';  

    var nextSteps = ['Next steps' + (result.platform ? ' for ' + result.platform : '') + ':',
                     '',
                     'Your application project is ready in ' + projectPath + '.',
                     'To use your new application in ' + ide + ', do the following:', 
                     '   - open ' + workspacePath + ' in ' + ide];

    // Only show OAuth configuration instructions if valid OAuth config was not provided
    if (!hasValidOAuth) {
        nextSteps.push('   - Update the OAuth Client ID, Callback URI, and Community URL in ' + entryFile + ' class.');        
        nextSteps.push('   - Make sure to plug your OAuth Client ID and Callback URI into');
        nextSteps.push('     into ' + bootconfigFile);
        nextSteps.push('     since it is still be used for authentication if we fallback on the webview.');
    }

    nextSteps.push('   - build and run');

    // Printing out next steps
    utils.logParagraph(nextSteps);
}

//
// Print next steps for server project if present
//
function printNextStepsForServerProjectIfNeeded(projectPath) {
    var serverProjectPath = path.join(projectPath, SERVER_PROJECT_DIR);
    var hasServerProject = utils.dirExists(serverProjectPath);
        // Extra steps if there is a server project
    if (hasServerProject) {
        utils.logParagraph(['Your application also has a server project in ' + serverProjectPath + '.',
                            'Make sure to deploy it to your org before running your application.',
                            '',
                            'From ' + projectPath + ' do the following to setup a scratch org, push the server code:',
                            '   - sf force org create -f server/config/project-scratch-def.json -a MyOrg',
                            '   - cd server',
                            '   - sf force source push -u MyOrg',
                            'You also need a password to login to the scratch org from the mobile app:',
                            '   - sf force user password generate -u MyOrg'                            
                            ]);
    }
}

//
// Check tools
//
function checkTools(toolNames) {
    try {
        utils.log("Checking tools");
        for (var toolName of toolNames) {
            utils.checkToolVersion(SDK.tools[toolName].checkCmd, SDK.tools[toolName].minVersion, SDK.tools[toolName].maxVersion, toolName);
        }
    }
    catch (error) {
        utils.logError('Missing tools\n', error);
        process.exit(1);
    }
}

//
// Create app - check tools, read config then actually create app
//
function createApp(forcecli, config) {

    // Can't target ios or run pod if not on a mac
    if (process.platform != 'darwin') {
        forcecli.platforms = forcecli.platforms.filter(p=>p!='ios');
        forcecli.toolNames = forcecli.toolNames.filter(t=>t!='pod');

        if (forcecli.platforms.length == 0) {
            utils.logError('You can only run ' + forcecli.name + ' on a Mac');
            process.exit(1);
        }
    }

    // Check tools
    checkTools(forcecli.toolNames);

    if (config === undefined) {
        // Read parameters from command line
        configHelper.readConfig(process.argv, forcecli, function(config) { actuallyCreateApp(forcecli, config); });
    }
    else {
        // Use parameters passed through
        actuallyCreateApp(forcecli, config);
    }
}

//
// Override sdk dependencies in package.json
//
function overrideSdkDependencies(packageJsonPath, sdkDependenciesString) {
    try {
        console.log("packageJsonPath =>" + packageJsonPath);
        
        // Parse sdkDependencies
        let sdkDependencies = JSON.parse(sdkDependenciesString)
        
        // Read the package.json file
        let originalContent = fs.readFileSync(packageJsonPath, 'utf8');
        console.log("original content =>" + originalContent);
        let packageJson = JSON.parse(originalContent)

        // Ensure "sdkDependencies" exists in the package.json
        if (!packageJson.sdkDependencies) {
            packageJson.sdkDependencies = {};
        }

        // Merge the sdkDependencies argument into the packageJson.sdkDependencies
        packageJson.sdkDependencies = { 
            ...packageJson.sdkDependencies, 
            ...sdkDependencies 
        };

        // Write the updated package.json back to file
        let updatedContent = JSON.stringify(packageJson, null, 2);
        console.log("updated content =>" + updatedContent);
        fs.writeFileSync(packageJsonPath, updatedContent, 'utf8');
        
    } catch (err) {
        console.error(`Failed to override sdk dependencies in package.json: ${err}`);
    }
}

//
// Override sdk dependencies in the generated hybrid app's iOS Podfile.
// The Cordova plugin's plugin.xml hardcodes each Mobile SDK pod's :git repo and :branch => 'dev';
// package.json has no influence over that Podfile, so overrideSdkDependencies() above is a no-op
// for hybrid+iOS. This rewrites the :git/:branch of any pod line sourced from a repo named in
// sdkDependenciesString (e.g. "SalesforceMobileSDK-iOS") to point at the given fork + branch.
//
function overrideHybridIosPodfile(podfilePath, sdkDependenciesString) {
    try {
        if (!fs.existsSync(podfilePath)) {
            console.error(`Podfile not found at ${podfilePath}, skipping sdk dependencies override`);
            return;
        }

        let sdkDependencies = JSON.parse(sdkDependenciesString);
        let originalContent = fs.readFileSync(podfilePath, 'utf8');

        let updatedContent = originalContent.split('\n').map(function(line) {
            if (!/^\s*pod\s+'/.test(line)) {
                return line;
            }

            for (var repoName in sdkDependencies) {
                var gitRE = new RegExp(":git\\s*=>\\s*'[^']*\\/" + repoName + "(?:\\.git)?'");
                if (!gitRE.test(line) || !/:branch\s*=>\s*'[^']*'/.test(line)) {
                    continue;
                }

                var parts = sdkDependencies[repoName].split('#');
                var newGitUrl = parts[0];
                var newBranch = parts.length > 1 ? parts[1] : 'dev';

                line = line.replace(gitRE, ":git => '" + newGitUrl + "'");
                line = line.replace(/:branch\s*=>\s*'[^']*'/, ":branch => '" + newBranch + "'");
            }

            return line;
        }).join('\n');

        fs.writeFileSync(podfilePath, updatedContent, 'utf8');

    } catch (err) {
        console.error(`Failed to override sdk dependencies in Podfile: ${err}`);
    }
}


//
// Actually create app
//
function actuallyCreateApp(forcecli, config) {
    try {
        // Adding platform
        if (forcecli.platforms.length == 1) {
            config.platform = forcecli.platforms[0];
        }

        // Adding app type
        if (forcecli.appTypes.length == 1 || config.apptype === undefined || config.apptype === '') {
            config.apptype = forcecli.appTypes[0];
        }

        // Setting log level
        if (config.verbose) {
            utils.setLogLevel(utils.LOG_LEVELS.DEBUG);
        }
        else {
            utils.setLogLevel(utils.LOG_LEVELS.INFO);
        }

        // Computing projectDir
        config.projectDir = config.outputdir ? path.resolve(config.outputdir) : path.join(process.cwd(),config.appname)
        config.projectPath = path.relative(process.cwd(), config.projectDir);

        // Adding version
        config.version = SDK.version;

        // Parsing callback URL into scheme/host/path for the template (e.g. Android redirect intent-filter)
        if (hasValidOAuthConfig(config)) {
            var cb = parseCallbackUrl(config.callbackurl);
            if (cb) {
                config.callbackUrlScheme = cb.scheme;
                config.callbackUrlHost = cb.host;
                config.callbackUrlPath = cb.path;
            }
        }

        // Figuring out template repo uri and path
        let localTemplatesRoot;
        if (config.templatesource) {
            const source = config.templatesource;
            if (fs.existsSync(source)) {
                // Local path to templates suite
                localTemplatesRoot = path.resolve(source);
                if (!config.template) {
                    throw new Error('Missing --template when using --templatesource pointing to a local path');
                }
                config.templatepath = config.template;
                // For display purposes
                config.templaterepouri = source;
            } else {
                // Git URL with optional #branch
                const parsed = utils.separateRepoUrlPathBranch(source);
                config.templaterepouri = parsed.repo + '#' + parsed.branch;
                config.templatepath = config.template || parsed.path;
                if (!config.templatepath) {
                    throw new Error('Missing template name. Use --template to specify a template within your --templatesource repository.');
                }
            }
        }
        else if (config.templaterepouri) {
            if (fs.existsSync(config.templaterepouri)) {
                // Local path directly to a specific template directory
                localTemplatesRoot = path.resolve(config.templaterepouri);
                config.templaterepouri = localTemplatesRoot;
                // Use the directory itself as the template root
                config.templatepath = '';
            } else if (!config.templaterepouri.startsWith("https://")) {
                // Given a Mobile SDK template name
                config.templatepath = config.templaterepouri;
                config.templaterepouri = SDK.templatesRepoUri;
            } else {
                // Given a full URI to a specific template path
                var templateUriParsed = utils.separateRepoUrlPathBranch(config.templaterepouri);
                config.templaterepouri = templateUriParsed.repo + '#' + templateUriParsed.branch;
                config.templatepath = templateUriParsed.path;
            }
        }
        else {
            config.templaterepouri = SDK.templatesRepoUri;
            config.templatepath = forcecli.appTypesToPath[config.apptype];
        }

        // Creating tmp dir for template clone
        var tmpDir = utils.mkTmpDir();

        // Resolve template source directory (clone if needed)
        var repoDir;
        if (localTemplatesRoot) {
            repoDir = localTemplatesRoot;
        } else {
            repoDir = utils.cloneRepo(tmpDir, config.templaterepouri);
        }
        config.templateLocalPath = path.join(repoDir, config.templatepath);

        validateCustomProperties(`${repoDir}/template.json`, config.templateProperties);

        // Override sdk dependencies in package.json if any were provided
        if (config.sdkdependencies) {
            overrideSdkDependencies(path.join(config.templateLocalPath, 'package.json'), config.sdkdependencies);
        }

        // Getting apptype from template
        config.apptype = require(path.join(config.templateLocalPath, 'template.js')).appType;

        var isNative = config.apptype.indexOf('native') >= 0;

        // Adding hybrid only config
        if (!isNative) {
            config.cordovaPluginRepoUri = config.pluginrepouri || SDK.tools.cordova.pluginRepoUri;
        }

        // Print details
        printDetails(config);

        // Creating application
        var results = isNative ? createNativeApp(config) : createHybridApp(config);

        // Cleanup
        utils.removeFile(tmpDir);
        
        // Printing next steps
        if (!(results instanceof Array)) { results = [results] };
        var hasValidOAuth = hasValidOAuthConfig(config);
        for (var result of results) {
            var ide = SDK.ides[result.platform || config.platform.split(',')[0]];

            if (config.templatepath != undefined && config.templatepath.includes('NativeLogin')) {
                printNextStepsForNativeLogin(ide, config.projectPath, result, hasValidOAuth);
            } else {
                printNextSteps(ide, config.projectPath, result, hasValidOAuth);
            }
        }
        printNextStepsForServerProjectIfNeeded(config.projectPath);

    }
    catch (error) {
        utils.logError(forcecli.name + ' failed\n', error);
        process.exit(1);
    }
}

function validateCustomProperties(templateJsonPath, customProperties) {
    // skip if template json file does not exist
    if (!fs.existsSync(templateJsonPath)) {
        return;
    }

    utils.log('Validating custom properties against schema...');
    // Validate data against schema with AJV
    const ajv = new Ajv({allErrors: true});
    const schema = readJsonFile(templateJsonPath);
    const validate = ajv.compile(schema);

    const jsonToValidate = {
        templatePrerequisites: { templateProperties: customProperties }
    }
    const valid = validate(jsonToValidate);

    if (!valid) {
        utils.logError('Custom properties validation failed:\n', 
            JSON.stringify(validate.errors, null, "  "));       
        process.exit(1);
    }

    utils.logInfo('Custom properties are valid\n', COLOR.green);
}

module.exports = {
    createApp,
    validateCustomProperties,
    parseCallbackUrl,
    overrideHybridIosPodfile
};
