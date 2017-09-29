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

var VERSION = '6.0.0';

module.exports = {
    version: VERSION,

    templatesRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#dev',    // dev
    //templatesRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#v' + VERSION, // GA


    forceclis: {
        forceios: {
            name: 'forceios',
            description: 'command line utility for building iOS native mobile applications using Salesforce Mobile SDK',
            sfdx_topic: 'ios',
            sfdx_description: 'command for building an iOS native mobile application using Saleforce Mobile SDK',
            dir: 'ios',
            platforms: ['ios'],
            toolNames: ['git', 'npm', 'pod'],
            appTypes: ['native', 'native_swift'],
            appTypesToPath: {
                'native': 'iOSNativeTemplate',
                'native_swift': 'iOSNativeSwiftTemplate'
            },
            commands: ['create', 'createWithTemplate', 'version']            
        },
        forcedroid: {
            name: 'forcedroid',
            description: 'command line utility for building Android native mobile applications using Salesforce Mobile SDK',
            sfdx_topic: 'android',
            sfdx_description: 'command for building a Android native mobile application using Saleforce Mobile SDK',
            dir: 'android',
            platforms: ['android'],
            toolNames: ['git', 'npm'],
            appTypes: ['native', 'native_kotlin'],
            appTypesToPath: {
                'native': 'AndroidNativeTemplate',
                'native_kotlin': 'AndroidNativeKotlinTemplate'
            },
            commands: ['create', 'createWithTemplate', 'version']            
        },
        forcehybrid: {
            name: 'forcehybrid',
            description: 'command line utility for building hybrid mobile applications using Salesforce Mobile SDK',
            sfdx_topic: 'hybrid',
            sfdx_description: 'command for building an hybrid mobile application using Saleforce Mobile SDK',
            dir: 'hybrid',
            platforms: ['ios', 'android'],
            toolNames: ['git', 'npm', 'cordova'],
            appTypes: ['hybrid_local', 'hybrid_remote'],
            appTypesToPath: {
                'hybrid_local': 'HybridLocalTemplate',
                'hybrid_remote': 'HybridRemoteTemplate'
            },
            commands: ['create', 'version']            
        },
        forcereact: {
            name: 'forcereact',
            description: 'command line utility for building react native mobile applications using Salesforce Mobile SDK',
            sfdx_topic: 'reactnative',
            sfdx_description: 'command for building a React Native mobile application using Saleforce Mobile SDK',
            dir: 'react',
            platforms: ['ios', 'android'],
            toolNames: ['git', 'npm', 'pod'],
            appTypes: ['react_native'],
            appTypesToPath: {
                'react_native': 'ReactNativeTemplate'
            },
            commands: ['create', 'createWithTemplate', 'version']
        }
    },

    args: {
        platform: {
            name: 'platform',
            'char': 'p',
            description: cli => 'Comma separated platforms (' + cli.platforms.join(', ') + ')',
            prompt: cli => 'Enter the target platform(s) separated by commas (' + cli.platforms.join(', ') + ')',
            error: (val, cli) => 'Platform(s) must be in ' + cli.platforms.join(', '),
            validate: (val, cli) => !val.split(",").some(p=>cli.platforms.indexOf(p) == -1)
        },
        appType: {
            name:'apptype',
            'char':'t',
            description: cli => 'Application Type (' + cli.appTypes.join(', ') + ')',
            prompt: cli => 'Enter your application type (' + cli.appTypes.join(', ') + '):',
            error: (val, cli) => 'App type must be ' + cli.appTypes.join(' or ') + '.',
            validate: (val, cli) => cli.appTypes.indexOf(val) >=0
        },
        templateRepoUri: {
            name:'templaterepouri',
            'char': 'r',
            description:'Template repo URI',
            prompt: 'Enter URI of repo containing template application:',
            error: (val, cli) => 'Invalid value for template repo uri: \'' + val + '\'.',
            validate: (val, cli) => /^\S+$/.test(val)
        },
        appName: {
            name: 'appname',
            'char': 'n',
            description: 'Application Name',
            prompt: 'Enter your application name:',
            error: (val, cli) => 'Invalid value for application name: \'' + val + '\'.',
            validate: (val, cli) => /^\S+$/.test(val)
        },
        packageName: {
            name: 'packagename',
            'char': 'p',
            description: 'App Package Identifier (e.g. com.mycompany.myapp)',
            prompt: 'Enter your package name:',
            error: (val, cli) => '\'' + val + '\' is not a valid package name.',
            validate: (val, cli) => /^[a-z]+[a-z0-9_]*(\.[a-z]+[a-z0-9_]*)*$/.test(val),
        },
        organization: {
            name: 'organization',
            'char': 'o',
            description: 'Organization Name (Your company\'s/organization\'s name)',
            prompt: 'Enter your organization name (Acme, Inc.):',
            error: (val, cli) => 'Invalid value for organization: \'' + val + '\'.',
            validate: (val, cli) => /\S+/.test(val)
        },
        outputDir: {
            name:'outputdir',
            'char':'d',
            description:'Output Directory (Leave empty for current directory)',
            prompt: 'Enter output directory for your app (leave empty for the current directory):',
            error: (val, cli) => 'Invalid value for output directory (directory must not already exist): \'' + val + '\'.',
            validate: (val, cli) => val === undefined || val === '' || !shelljs.test('-e', path.resolve(val)),
            required:false
        },
        startPage: {
            name:'startpage',
            'char':'s',
            description:'App Start Page (The start page of your remote app. Only required for hybrid_remote)',
            prompt: 'Enter the start page for your app:',
            error: (val, cli) => 'Invalid value for start page: \'' + val + '\'.',
            validate: (val, cli) => /\S+/.test(val),
            required: false
        },
        // Private args
        verbose: {
            name:'verbose',
            'char':'v',
            hasValue:false,
            required:false
        },
        templatePath: {
            name:'templatePath',
            'char':'v',
            error: (val, cli) => 'Invalid value for template path: \'' + val + '\'.',
            validate: (val, cli) => /.*/.test(val),
            required:false
        },            
        pluginRepoUri: {
            name:'pluginrepouri',
            'char':'v',
            error: (val, cli) => 'Invalid value for plugin repo uri: \'' + val + '\'.',
            validate: (val, cli) => /.*/.test(val),
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
            description: cli => 'create ' + cli.platforms.join('/') + ' ' + cli.appTypes.join(' or ') + ' mobile application'
        },
        createWithTemplate: {
            name: 'createWithTemplate',
            args: cli => [cli.platforms.length > 1 ? 'platform' : null,
                          'templateRepoUri',
                          'appName',
                          'packageName',
                          'organization',
                          'outputDir',
                          'verbose',
                          'templatePath'
                         ].filter(x=>x!=null),
            description: cli => 'create ' + cli.platforms.join('/') + ' ' + cli.appTypes.join(' or ') + ' mobile application from a template'
        },
        version: {
            name: 'version',
            args: [],
            description: 'print version of Mobile SDK'
        }
    },

    tools: {
        git: {
            checkCmd: 'git --version',
            minVersion: '2.13'
        },
        npm: {
            checkCmd: 'npm -v',
            minVersion: '3.10'
        },
        pod: {
            checkCmd: 'pod --version',
            minVersion: '1.2'
        },
        cordova: {
            checkCmd: 'cordova -v',
            minVersion: '7.0.0',
            pluginRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#dev',    // dev
            //pluginRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#v' + VERSION, // GA
            platformVersion: {
                ios: '4.4.0',
                android: '6.2.3'
            }
        }
    },

    ides: {
        ios: 'XCode',
        android: 'Android Studio'
    }
};
