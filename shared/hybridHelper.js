var shelljs = require('shelljs');

/**
 * Gets the the version of the currently installed cordova CLI tool.
 *
 * @return {String} The version of the cordova CLI tool, or null if the tool is not installed.
 */
function getCordovaCliVersion() {
	var cordovaVersionResult = shelljs.exec('cordova -v', { 'silent' : true });
    if (cordovaVersionResult.code !== 0) {
        return null;
    }

    var cordovaCliVersion = cordovaVersionResult.stdout.replace(/\r?\n|\r/, '');
    return cordovaCliVersion;
};

/**
 * Create hybrid application
 * @param config
 *  targetDir
 *  packagename
 *  appname
 *  apptype 'hybrid_local' or 'hybrid_remote'
 *  startpage
 *  platform 'iOS' or 'android'
 *  cordovaplatformversion
 *  pluginrepourl
 */
function createHybridApp(config) {
    var templateRepoUrl = config.templaterepourl || defaultTemplateRepoUrl;
    var templateBranch = config.templatebranch || defaultTemplateBranch;
    var templatePath = config.templatepath || (templateRepoUrl === defaultTemplateRepoUrl ? appTypeToDefaultTemplatePath[config.apptype] : '');

    // Create tmp dir
    var tmpDir = mkTmpDir();

    // Clone template repo
    runProcessThrowError('git clone --branch ' + templateBranch + ' --single-branch --depth 1 ' + templateRepoUrl + ' ' + tmpDir);

    // Make sure the Cordova CLI client exists.
    var cordovaCliVersion = cordovaHelper.getCordovaCliVersion();
    if (cordovaCliVersion === null) {
        console.log('cordova command line tool could not be found.  Make sure you install the cordova CLI from https://www.npmjs.org/package/cordova.');
        process.exit(6);
    }
    var minimumCordovaVersionNum = miscUtils.getVersionNumberFromString(minimumCordovaCliVersion);
    var cordovaCliVersionNum = miscUtils.getVersionNumberFromString(cordovaCliVersion);
    if (cordovaCliVersionNum < minimumCordovaVersionNum) {
        console.log('Installed cordova command line tool version (' + cordovaCliVersion + ') is less than the minimum required version (' + minimumCordovaCliVersion + ').  Please update your version of Cordova.');
        process.exit(7);
    }
    shelljs.exec('cordova create "' + config.targetDir + '" ' + config.packagename + ' ' + config.appname);
    shelljs.pushd(config.targetDir);
    shelljs.exec('cordova platform add ' + config.platform + '@' + config.cordovaplatformversion);
    shelljs.exec('cordova plugin add ' + config.pluginrepourl);

    // Remove the default Cordova app.
    shelljs.rm('-rf', path.join('www', '*'));



    // Copy the sample app, if a local app was selected.
    if (config.apptype === 'hybrid_local') {
        var sampleAppFolder = path.join(__dirname, '..', 'external', 'shared', 'samples', 'userlist');
        shelljs.cp('-R', path.join(sampleAppFolder, '*'), 'www');
    }
    var bootconfig = {
        "remoteAccessConsumerKey": "3MVG9Iu66FKeHhINkB1l7xt7kR8czFcCTUhgoA8Ol2Ltf1eYHOU4SqQRSEitYFDUpqRWcoQ2.dBv_a1Dyu5xa",
        "oauthRedirectURI": "testsfdc:///mobilesdk/detect/oauth/done",
        "oauthScopes": ["web", "api"],
        "isLocal": config.apptype === 'hybrid_local',
        "startPage": config.startpage || 'index.html',
        "errorPage": "error.html",
        "shouldAuthenticate": true,
        "attemptOfflineLoad": false,
        "androidPushNotificationClientId": ""
    };
    fs.writeFileSync(path.join('www', 'bootconfig.json'), JSON.stringify(bootconfig, null, 2));
    shelljs.exec('cordova prepare ' + config.platform);
    shelljs.popd();

    // Inform the user of next steps.
    var nextStepsOutput =
        ['',
         outputColors.green + 'Your application project is ready in ' + config.targetdir + '.',
         '',
         outputColors.cyan + 'To use your new application in Android Studio, do the following:' + outputColors.reset,
         '   - Launch Android Studio and select `Import project (Eclipse ADT, Gradle, etc.)` from the Welcome screen',
         '   - Navigate to the ' + outputColors.magenta + config.targetdir + '/' + config.appname + '/platforms/android' + outputColors.reset + ' folder, select it and click `Ok`',
         '   - From the dropdown that displays the available targets, choose the sample app you want to run and click the play button',
         ''].join('\n');
    console.log(nextStepsOutput);
    console.log(outputColors.cyan + 'Before you ship, make sure to plug your OAuth Client ID,\nCallback URI, and OAuth Scopes into '
        + outputColors.magenta + 'www/bootconfig.json' + outputColors.reset);
}



module.exports.getCordovaCliVersion = getCordovaCliVersion;
module.exports.createHybridApp = createHybridApp;
