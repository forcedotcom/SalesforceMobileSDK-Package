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

var VERSION = '5.1.0';

module.exports = {
    version: VERSION,

    tools: {
        gitMinVersion: '2.10',
        npmMinVersion: '3.10',
        podMinVersion: '1.1'
    },
    
    cordova: {
        //pluginRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#dev',    // dev
        pluginRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#v' + VERSION, // GA
        minimumCliVersion: '6.4.0',
        platformVersion: {
            ios: '4.3.0',
            android: '6.1.2'
        }
    },

    appTypes: {
        ios: ['native', 'native_swift', 'react_native', 'hybrid_local', 'hybrid_remote'],
        android: ['native', 'react_native', 'hybrid_local', 'hybrid_remote']
    },

    templates: {
        //repoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#dev',    // dev
        repoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#v' + VERSION, // GA
        appTypesToPath: {
            ios: {
                'native': 'iOSNativeTemplate',
                'native_swift': 'iOSNativeSwiftTemplate',
                'react_native': 'ReactNativeTemplate',
                'hybrid_local': 'HybridLocalTemplate',
                'hybrid_remote': 'HybridRemoteTemplate'
            },
            android: {
                'native': 'AndroidNativeTemplate',
                'react_native': 'ReactNativeTemplate',
                'hybrid_local': 'HybridLocalTemplate',
                'hybrid_remote': 'HybridRemoteTemplate'
            }
        }
    }
};
