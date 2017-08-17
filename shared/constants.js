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

var VERSION = '6.0.0';

module.exports = {
    version: VERSION,

    templatesRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#dev',    // dev
    //templatesRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#v' + VERSION, // GA


    forceclis: {
        forceios: {
            name: 'forceios',
            description: 'command line utility for building iOS native mobile applications using Salesforce Mobile SDK',
            dir: 'ios',
            platforms: ['ios'],
            toolNames: ['git', 'npm', 'pod'],
            appTypes: ['native', 'native_swift'],
            appTypesToPath: {
                'native': 'iOSNativeTemplate',
                'native_swift': 'iOSNativeSwiftTemplate'
            }
        },
        forcedroid: {
            name: 'forcedroid',
            description: 'command line utility for building Android native mobile applications using Salesforce Mobile SDK',
            dir: 'android',
            platforms: ['android'],
            toolNames: ['git', 'npm'],
            appTypes: ['native', 'native_kotlin'],
            appTypesToPath: {
                'native': 'AndroidNativeTemplate',
                'native_kotlin': 'AndroidNativeKotlinTemplate'
            }
        },
        forcehybrid: {
            name: 'forcehybrid',
            description: 'command line utility for building hybrid mobile applications using Salesforce Mobile SDK',
            dir: 'hybrid',
            platforms: ['ios', 'android'],
            toolNames: ['git', 'npm', 'cordova'],
            appTypes: ['hybrid_local', 'hybrid_remote'],
            appTypesToPath: {
                'hybrid_local': 'HybridLocalTemplate',
                'hybrid_remote': 'HybridRemoteTemplate'
            }
        },
        forcereact: {
            name: 'forcereact',
            description: 'command line utility for building react native mobile applications using Salesforce Mobile SDK',
            dir: 'react',
            platforms: ['ios', 'android'],
            toolNames: ['git', 'npm', 'pod'],
            appTypes: ['react_native'],
            appTypesToPath: {
                'react_native': 'ReactNativeTemplate'
            }
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
