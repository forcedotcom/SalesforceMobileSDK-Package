#!/usr/bin/env node

// Constants
var version = '5.0.0';
var minimumCordovaCliVersion = '5.4.0';
var cordovaPlatformVersion = '4.2.0';
var defaultTemplateRepoUrl = 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates';
var defaultTemplateBranch = 'unstable';
var appTypeToDefaultTemplatePath = {
    'native': 'iOSNativeTemplate',
    'native_swift': 'iOSNativeSwiftTemplate',
    'react_native': 'ReactNativeTemplate'
};

// Dependencies
var shelljs = require('shelljs'),
    exec = require('child_process').exec,
    execSync = require('child_process').execSync,
    fs = require('fs'),
    path = require('path'),
    commandLineUtils = require('./shared/commandLineUtils'),
    miscUtils = require('./shared/utils'),
    cordovaHelper = require('./shared/cordovaHelper'),
    COLOR = require('./shared/outputColors');

// Calling main
main(process.argv);

//
// Main function
//
function main(args) {
    var commandLineArgs = process.argv.slice(2, args.length);
    var command = commandLineArgs.shift();

    var processorList = null;
    var commandHandler = null;

    switch (command || '') {
    case 'version':
        log('forceios version ' + version);
        process.exit(0);
        break;
    case 'create':
        processorList = createArgProcessorList();
        commandHandler = createApp;
        break;
    default:
        usage();
        process.exit(1);
    }

    commandLineUtils.processArgsInteractive(commandLineArgs, processorList, commandHandler);
}


//
// Usage
//
function usage() {
    
    // TODO we should add a few more operations (which would rely on npm like run and update?

    log('Usage:\n', COLOR.cyan);
    log('forceios create', COLOR.magenta);
    log('    --apptype=<Application Type> (native, native_swift, react_native, hybrid_remote, hybrid_local)', COLOR.magenta);
    log('    --appname=<Application Name>', COLOR.magenta);
    log('    --companyid=<Company Identifier> (com.myCompany.myApp)', COLOR.magenta);
    log('    --organization=<Organization Name> (Your company\'s/organization\'s name)', COLOR.magenta);
    log('    --startpage=<App Start Page> (The start page of your remote app. Only required for hybrid_remote)', COLOR.magenta);
    log('    [--outputdir=<Output directory> (Defaults to the current working directory)]', COLOR.magenta);
    log('    [--appid=<Salesforce App Identifier> (The Consumer Key for your app. Defaults to the sample app.)]', COLOR.magenta);
    log('    [--callbackuri=<Salesforce App Callback URL> (The Callback URL for your app. Defaults to the sample app.)]', COLOR.magenta);
    log('    [--templaterepourl=<Template repo URL> (URL of repo containing template application. Optional.)]', COLOR.magenta);
    log('    [--templatebranch=<Branch> (Branch of template repo to use. Defaults to ' + defaultTemplateBranch + '.)]', COLOR.magenta);
    log('    [--templatepath=<Path> (Path of template application in template repo. Defaults to "".)]', COLOR.magenta);
    log('\n OR \n', COLOR.cyan);
    log('forceios version', COLOR.magenta);
}

//
// Helper for 'create' command
//
function createApp(config) {
    // Adding platform
    config.platform = 'ios';

    // Computing config.projectdir
    config.projectdir = config.outputDir ? path.resolve(config.outputDir) : path.join(process.cwd(),config.appname);

    // Native app creation
    if (config.apptype === 'native' || config.apptype === 'native_swift' || config.apptype === 'react_native') {
        createNativeApp(config);
    }
    // Hybrid app creation
    else {
        createHybridApp(config);
    }
}

//
// Helper to create hybrid application
//
function createHybridApp(config) {
    // Make sure the Cordova CLI client exists.
    var cordovaCliVersion = cordovaHelper.getCordovaCliVersion();
    if (cordovaCliVersion === null) {
        log('cordova command line tool could not be found.  Make sure you install the cordova CLI from https://www.npmjs.org/package/cordova.');
        process.exit(11);
    }

    var minimumCordovaCliVersionNum = miscUtils.getVersionNumberFromString(minimumCordovaCliVersion);
    var cordovaCliVersionNum = miscUtils.getVersionNumberFromString(cordovaCliVersion);
    if (cordovaCliVersionNum < minimumCordovaCliVersionNum) {
        log('Installed cordova command line tool version (' + cordovaCliVersion + ') is less than the minimum required version (' + minimumCordovaCliVersion + ').  Please update your version of Cordova.');
        process.exit(12);
    }

    log('Using cordova CLI version ' + cordovaCliVersion + ' to create the hybrid app.');

    shelljs.exec('cordova create "' + config.projectdir + '" ' + config.companyid + ' ' + config.appname);
    shelljs.pushd(config.projectdir);
    shelljs.exec('cordova platform add ios@' + cordovaPlatformVersion);
    shelljs.exec('cordova plugin add https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#unstable');

    // Remove the default Cordova app.
    shelljs.rm('-rf', path.join('www', '*'));

    // Copy the sample app, if a local app was selected.
    if (config.apptype === 'hybrid_local') {
        var sampleAppFolder = path.join(__dirname, '..', 'external', 'shared', 'samples', 'userlist');
        shelljs.cp('-R', path.join(sampleAppFolder, '*'), 'www');
    }

    // Add bootconfig.json
    var bootconfig = {
        "remoteAccessConsumerKey": config.appid || "3MVG9Iu66FKeHhINkB1l7xt7kR8czFcCTUhgoA8Ol2Ltf1eYHOU4SqQRSEitYFDUpqRWcoQ2.dBv_a1Dyu5xa",
        "oauthRedirectURI": config.callbackuri || "testsfdc:///mobilesdk/detect/oauth/done",
        "oauthScopes": ["web", "api"],
        "isLocal": config.apptype === 'hybrid_local',
        "startPage": config.startpage || 'index.html',
        "errorPage": "error.html",
        "shouldAuthenticate": true,
        "attemptOfflineLoad": false
    };

    fs.writeFileSync(path.join('www', 'bootconfig.json'), JSON.stringify(bootconfig, null, 2));
    shelljs.exec('cordova prepare ios');
    shelljs.popd();

    // Inform the user of next steps.
    log('Next steps:', COLOR.cyan);
    log('Your application project is ready in ' + config.projectdir + '.', COLOR.magenta);
    log('To build the new application, do the following:', COLOR.magenta);
    log('   - cd ' + config.projectdir, COLOR.magenta);
    log('   - cordova build', COLOR.magenta);
    log('To run the application, start an emulator or plug in your device and run:', COLOR.magenta);
    log('   - cordova run', COLOR.magenta);
    log('To use your new application in XCode, do the following:', COLOR.magenta);
    log('   - open ' + config.projectdir + '/platforms/ios/' + config.appname + '.xcodeproj in XCode', COLOR.magenta);
    log('   - build and run', COLOR.magenta);
    log('Before you ship, make sure to plug your OAuth Client ID,\nCallback URI, and OAuth Scopes into www/bootconfig.json', COLOR.cyan);
}

//
// Helper to create native application
//
function createNativeApp(config) {
    var templateRepoUrl = config.templaterepourl || defaultTemplateRepoUrl;
    var templateBranch = config.templatebranch || defaultTemplateBranch;
    var templatePath = config.templatepath || (templateRepoUrl === defaultTemplateRepoUrl ? appTypeToDefaultTemplatePath[config.apptype] : '');

    // Create tmp dir
    var tmpDir = mkTmpDir();

    // Clone template repo
    runProcessThrowError('git clone --branch ' + templateBranch + ' --single-branch --depth 1 ' + templateRepoUrl + ' ' + tmpDir);

    // Copy template to project dir
    shelljs.cp('-R', path.join(tmpDir, templatePath), config.projectdir);
    
    // Run prepare method of template
    var templatePrepare = require(path.join(config.projectdir, 'template.js')).prepare;
    var workspace;
    shelljs.pushd(config.projectdir);
    try {
        var workspace = templatePrepare(config, replaceInFiles, moveFile, runProcessThrowError);
    }
    finally {
        shelljs.popd();
    }

    // Cleanup
    removeFile(tmpDir);
    removeFile(path.join(config.projectdir, 'template.js'));

    // Next steps
    log('Next steps:', COLOR.cyan);
    log('Your application project is ready in ' + config.projectdir + '.', COLOR.magenta);
    log('To use your new application in XCode, do the following:', COLOR.magenta);
    log('   - open ' + path.join(config.projectdir, workspace) + ' in XCode', COLOR.magenta);
    log('   - build and run', COLOR.magenta);
}

// -----
// Input argument validation / processing.
// -----

function createArgProcessorList() {

    var argProcessorList = new commandLineUtils.ArgProcessorList();

    // App type
    addProcessorFor(argProcessorList, 'apptype', 'Enter your application type (native, native_swift, react_native, hybrid_remote, or hybrid_local):', 'App type must be native, native_swift, react_native, hybrid_remote, or hybrid_local.',
                    function(val) { return ['native', 'native_swift', 'react_native', 'hybrid_remote', 'hybrid_local'].indexOf(val) >= 0; });

    // App name
    addProcessorFor(argProcessorList, 'appname', 'Enter your application name:', 'Invalid value for application name: \'$val\'.', /^\S+$/);

    // Output dir
    addProcessorForOptional(argProcessorList, 'outputdir', 'Enter the output directory for your app (defaults to the current directory):');

    // Company Identifier
    addProcessorFor(argProcessorList, 'companyid', 'Enter the package name for your app (com.mycompany.my_app):', 'Invalid value for company identifier: \'$val\'', /^[a-z]+[a-z0-9_]*(\.[a-z]+[a-z0-9_]*)*$/);

    // Organization
    addProcessorFor(argProcessorList, 'organization', 'Enter your organization name (Acme, Inc.):', 'Invalid value for organization: \'$val\'.',  /\S+/);

    // Start page
    addProcessorFor(argProcessorList, 'startpage', 'Enter the start page for your app (only applicable for hybrid_remote apps):', 'Invalid value for start page: \'$val\'.', /\S+/,
                    function(argsMap) { return (argsMap['apptype'] === 'hybrid_remote'); });

    // Connected App ID
    addProcessorForOptional(argProcessorList, 'appid', 'Enter your Connected App ID (defaults to the sample app\'s ID):');

    // Connected App Callback URI
    addProcessorForOptional(argProcessorList, 'callbackuri', 'Enter your Connected App Callback URI (defaults to the sample app\'s URI):');

    // Template Repo URL
    addProcessorForOptional(argProcessorList, 'templaterepourl', 'Enter URL of repo containing template application (leave empty for default template):');

    // Template Branch
    addProcessorForOptional(argProcessorList, 'templatebranch', 'Enter branch of template repo to use (defaults to ' + defaultTemplateBranch + '):');

    // Template Path
    addProcessorForOptional(argProcessorList, 'templatepath', 'Enter path of template application in template repo (defaults to ""):');

    return argProcessorList;
}

//
// Helper function to add arg processor
// * argProcessorList: ArgProcessorList
// * argName: string, name of argument
// * prompt: string for prompt
// * error: string for error (can contain $val to print the value typed by the user in the error message)
// * validation: function or regexp or null (no validation)
// * preprocessor: function or null
// * postprocessor: function or null
//
function addProcessorFor(argProcessorList, argName, prompt, error, validation, preprocessor, postprocessor) {
   argProcessorList.addArgProcessor(argName, prompt, function(val) {
       val = val.trim();

       // validation is either a function or a regexp
       if (typeof validation === 'function' && validation(val)
           || typeof validation === 'object' && typeof validation.test === 'function' && validation.test(val))
       {
           return new commandLineUtils.ArgProcessorOutput(true, typeof postprocessor === 'function' ? postprocessor(val) : val);
       }
       else {
           return new commandLineUtils.ArgProcessorOutput(false, error.replace('$val', val));
       }

   }, preprocessor);
}

//
// Helper function to add arg processor for optional arg- should unset value when nothing is typed in
// * argProcessorList: ArgProcessorList
// * argName: string, name of argument
// * prompt: string for prompt
//
function addProcessorForOptional(argProcessorList, argName, prompt) {
    addProcessorFor(argProcessorList, argName, prompt, undefined, function() { return true;}, undefined, undefined);
}

//
// Helper to run arbitrary shell command - errors thrown
//
function runProcessThrowError(cmd, dir) {
    log('Running: ' + cmd, COLOR.green);
    if (dir) shelljs.pushd(dir);
    try {
        execSync(cmd, {stdio:[0,1,2]});
    }
    finally {
        if (dir) shelljs.popd();
    }
}

//
// Helper to make temp dir and return its path
//
function mkTmpDir() {
    var tmpDir = path.join('tmp' + random(1000));
    log('Making temp dir:' + tmpDir);
    shelljs.mkdir('-p', tmpDir);
    return tmpDir;
}

//
// Helper to return random number between n/10 and n
//
function random(n) {
    return (n/10)+Math.floor(Math.random()*(9*n/10));
}

//
// Helper to replace string in multiple files
//
function replaceInFiles(from, to, files) {
    var fromRegexp = typeof(from) === 'string' ? new RegExp(from, 'g') : from;
    for (var i=0; i<files.length; i++) {
        log('Replacing ' + from + ' with ' + to + ' in: ' + files[i]);
        miscUtils.replaceTextInFile(files[i], fromRegexp, to);
    }
}

//
// Helper to move file
//
function moveFile(from, to) {
    log('Moving: ' + from + ' to ' + to);
    shelljs.mv(from, to);
}

//
// Helper to remove file
//
function removeFile(path) {
    log('Removing: ' + path);
    shelljs.rm('-rf', path);
}


//
// Print important information
//
function log(msg, color) {
    if (color) {
        console.log(color + msg + COLOR.reset);
    }
    else {
        console.log(msg);
    }
}
