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

var path = require('path'),
    shelljs = require('shelljs');

var VERSION = '6.2.0';

module.exports = {
    version: VERSION,

    tools: {
        git: {
            checkCmd: 'git --version',
            minVersion: '2.13'
        },
        node: {
            checkCmd: 'node --version',
            minVersion: '6.9',
            maxVersion: '8.11',
        },
        npm: {
            checkCmd: 'npm -v',
            minVersion: '3.10'
        },
        pod: {
            checkCmd: 'pod --version',
            minVersion: '1.2',
            maxVersion: '1.4',
        },
        cordova: {
            checkCmd: 'cordova -v',
            pluginRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#dev',    // dev
            minVersion: '8.0.0',
            //pluginRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#v' + VERSION, // GA
            platformVersion: {
                ios: '4.5.4',
                android: '7.0.0'
            }
        }
    },

    ides: {
        ios: 'XCode',
        android: 'Android Studio'
    },

    templatesRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#dev',    // dev
    //templatesRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#v' + VERSION, // GA

    forceclis: {
        forceios: {
            name: 'forceios',
            topic: 'ios',
            purpose: 'an iOS native mobile application',
            dir: 'ios',
            platforms: ['ios'],
            toolNames: ['git', 'node', 'npm', 'pod'],
            appTypes: ['native', 'native_swift'],
            appTypesToPath: {
                'native': 'iOSNativeTemplate',
                'native_swift': 'iOSNativeSwiftTemplate'
            },
            commands: ['create', 'createwithtemplate', 'version', 'listtemplates']            
        },
        forcedroid: {
            name: 'forcedroid',
            topic: 'android',
            purpose: 'an Android native mobile application',
            dir: 'android',
            platforms: ['android'],
            toolNames: ['git', 'node', 'npm'],
            appTypes: ['native', 'native_kotlin'],
            appTypesToPath: {
                'native': 'AndroidNativeTemplate',
                'native_kotlin': 'AndroidNativeKotlinTemplate'
            },
            commands: ['create', 'createwithtemplate', 'version', 'listtemplates']            
        },
        forcehybrid: {
            name: 'forcehybrid',
            topic: 'hybrid',
            purpose: 'a hybrid mobile application',
            dir: 'hybrid',
            platforms: ['ios', 'android'],
            toolNames: ['git', 'node', 'npm', 'cordova'],
            appTypes: ['hybrid_local', 'hybrid_remote'],
            appTypesToPath: {
                'hybrid_local': 'HybridLocalTemplate',
                'hybrid_remote': 'HybridRemoteTemplate'
            },
            commands: ['create', 'createwithtemplate', 'version', 'listtemplates']            
        },
        forcereact: {
            name: 'forcereact',
            topic: 'reactnative',
            purpose: 'a React Native mobile application',
            dir: 'react',
            platforms: ['ios', 'android'],
            toolNames: ['git', 'node', 'npm', 'pod'],
            appTypes: ['react_native'],
            appTypesToPath: {
                'react_native': 'ReactNativeTemplate'
            },
            commands: ['create', 'createwithtemplate', 'version', 'listtemplates']
        }
    },

    args: {
        platform: {
            name: 'platform',
            'char': 'p',
            description: cli => 'comma-separated list of platforms (' + cli.platforms.join(', ') + ')',
            longDescription: cli => 'A comma-separated list of one or more platforms you support. The script creates a project for each platform you select. Available options are ' + cli.platforms.join(', ') + '.',
            prompt: cli => 'Enter the target platform(s) separated by commas (' + cli.platforms.join(', ') + '):',
            error: cli => val => 'Platform(s) must be in ' + cli.platforms.join(', '),
            validate: cli => val => !val.split(",").some(p=>cli.platforms.indexOf(p) == -1)
        },
        appType: {
            name:'apptype',
            'char':'t',
            description: cli => 'application type (' + cli.appTypes.join(', ') + ')',
            longDescription: cli => 'You can choose one of the following types of applications: ' + cli.appTypes.join(', ') + '.',
            prompt: cli => 'Enter your application type (' + cli.appTypes.join(', ') + '):',
            error: cli => val => 'App type must be ' + cli.appTypes.join(' or ') + '.',
            validate: cli => val => cli.appTypes.indexOf(val) >=0
        },
        templateRepoUri: {
            name:'templaterepouri',
            'char': 'r',
            description:'template repo URI',
            longDescription: 'The URI of a repository that contains the template application to be used as the basis of your new app. See https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/ios_new_project_template.htm for information on creating templates.',
            prompt: 'Enter URI of repo containing template application:',
            error: cli => val => 'Invalid value for template repo uri: \'' + val + '\'.',
            validate: cli => val => /^\S+$/.test(val)
        },
        appName: {
            name: 'appname',
            'char': 'n',
            description: 'application name',
            longDescription: 'A name for the app that conforms to the naming requirements for the platform.',
            prompt: 'Enter your application name:',
            error: cli => val => 'Invalid value for application name: \'' + val + '\'.',
            validate: cli => val => /^\S+$/.test(val)
        },
        packageName: {
            name: 'packagename',
            'char': 'k',
            description: 'app package identifier (e.g. com.mycompany.myapp)',
            longDescription: 'A string in reverse internet domain format that identifies your app\'s package or bundle. For example, "com.mycompany.myapp".',
            prompt: 'Enter your package name:',
            error: cli => val => '\'' + val + '\' is not a valid package name.',
            validate: cli => val => /^[a-z]+[a-z0-9_]*(\.[a-z]+[a-z0-9_]*)*$/.test(val),
        },
        organization: {
            name: 'organization',
            'char': 'o',
            description: 'organization name (your company\'s/organization\'s name)',
            longDescription: 'The name of your company or organization. This string is user-defined and may contain spaces and punctuation.',
            prompt: 'Enter your organization name (Acme, Inc.):',
            error: cli => val => 'Invalid value for organization: \'' + val + '\'.',
            validate: cli => val => /\S+/.test(val)
        },
        outputDir: {
            name:'outputdir',
            'char':'d',
            description:'output directory (leave empty for current directory)',
            longDescription: 'The local path for your new project. If this path points to an existing directory, that directory must be empty. If you don\'t specify a value, the script creates the app in the current directory.',
            prompt: 'Enter output directory for your app (leave empty for the current directory):',
            error: cli => val => 'Invalid value for output directory (directory must not already exist): \'' + val + '\'.',
            validate: cli => val => val === undefined || val === '' || !shelljs.test('-e', path.resolve(val)),
            required:false
        },
        startPage: {
            name:'startpage',
            'char':'s',
            description:'app start page (the start page of your remote app; required for hybrid_remote apps only)',
            longDescription: 'For hybrid remote apps only, specify the relative server path to your Visualforce start page. This relative path always discards the Salesforce instance and domain name and starts with "apex/".',
            prompt: 'Enter the start page for your app:',
            error: cli => val => 'Invalid value for start page: \'' + val + '\'.',
            validate: cli => val => /\S+/.test(val),
            required: false,
            promptIf: otherArgs => otherArgs.apptype === 'hybrid_remote'
        },
        // Private args
        verbose: {
            name:'verbose',
            'char':'v',
            hasValue:false,
            required:false
        },
        pluginRepoUri: {
            name:'pluginrepouri',
            'char':'v',
            error: cli => val => 'Invalid value for plugin repo uri: \'' + val + '\'.',
            validate: cli => val => /.*/.test(val),
            required:false
        }  
    },

    commands: {
        create: {
            name: 'create',
            args: cli => [cli.platforms.length > 1 ? 'platform' : null,
                          cli.appTypes.length > 1 ? 'appType' : null,
                          'appName',
                          'packageName',
                          'organization',
                          cli.appTypes.indexOf('hybrid_remote') >=0 ? 'startPage' : null,
                          'outputDir',
                          'verbose',
                          cli.name === 'forcehybrid' ? 'pluginRepoUri' : null
                         ].filter(x=>x!=null),
            description: cli => 'create ' + cli.purpose,
            longDescription: cli => 'Create ' + cli.purpose + '.',
            help: 'This command initiates creation of a new app based on the standard Mobile SDK template.'
        },
        createwithtemplate: {
            name: 'createwithtemplate',
            args: cli => [cli.platforms.length > 1 ? 'platform' : null,
                          'templateRepoUri',
                          'appName',
                          'packageName',
                          'organization',
                          'outputDir',
                          'verbose'
                         ].filter(x=>x!=null),
            description: cli => 'create ' + cli.purpose + ' from a template',
            longDescription: cli => 'Create ' + cli.purpose + ' from a template.',
            help: 'This command initiates creation of a new app based on the Mobile SDK template that you specify. The template can be a specialized app for your app type that Mobile SDK provides, or your own custom app that you\'ve configured to use as a template. See https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/ios_new_project_template.htm for information on custom templates.'
        },
        version: {
            name: 'version',
            args: [],
            description: 'show version of Mobile SDK',
            longDescription: 'Show version of Mobile SDK.',
            help: 'This command displays to the console the version of Mobile SDK that the script uses to create apps.'
        },
        listtemplates: {
            name: 'listtemplates',
            args: [],
            description: cli => 'list available Mobile SDK templates to create ' + cli.purpose,
            longDescription: cli => 'List available Mobile SDK templates to create ' + cli.purpose + '.',
            help: 'This command displays the list of available Mobile SDK templates. You can copy repo paths from the output for use with the createwithtemplate command.'
        }
    }
};
