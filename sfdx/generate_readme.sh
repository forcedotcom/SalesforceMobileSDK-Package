#!/bin/bash

print() {
echo "$1" >> README.md
}

run() {
echo "\`\`\`" >> README.md
echo "-> $1" >> README.md
# removing colors, make sure to install gnu-sed (brew install gnu-sed)
$1 | gsed -r "s/\x1B\[([0-9]{1,2}(;[0-9]{1,2})?)?[mGK]//g" >> README.md
echo "\`\`\`" >> README.md
echo "" >> README.md
}

cat <<EOT > README.md
# sfdx-mobilesdk-plugin 

A plugin for the Salesforce CLI to create mobile applications to interface with the [Salesforce Platform](http://www.salesforce.com/platform/overview/), leveraging the [Salesforce Mobile SDK for iOS](https://github.com/forcedotcom/SalesforceMobileSDK-iOS) and the [Salesforce Mobile SDK for Android](https://github.com/forcedotcom/SalesforceMobileSDK-Android) repos.

## Special Note Regarding SFDX and Oclif

SFDX now supports the Heroku "O"pen "CLI" "F"ramework and sfdx-mobilesdk-plugin v7.1.0 has been updated to be compatible. The new plugin will run in both version 6 and version 7 instances of the SFDX cli. However, older versions of the mobilesdk plugin will not work in the Oclif version of the CLI. 

If there is a need to use an older plugin one must first uninstall V7 of the CLI and install a V6 instance.

To determine the latest version of v6 go here:

https://www.npmjs.com/package/sfdx-cli?activeTab=versions

The most reliable way to install a previous version of the CLI is via npm.

\`npm install sfdx-cli@<V6 version from npmjs> -g\`

## Setup

### Install from source

1. Install the SDFX CLI (https://developer.salesforce.com/tools/sfdxcli).

2. Clone the repository: \`git clone git@github.com:forcedotcom/SalesforceMobileSDK-Package\`

3. Install npm modules: \`npm install\`

4. Generate oclif command classes \`./sfdx/generate_oclif.js\`

5. Link the plugin: \`sfdx plugins:link sfdx\`

### Install as plugin

1. Install plugin: \`sfdx plugins:install sfdx-mobilesdk-plugin\`

EOT

print "## Help"
run 'sfdx mobilesdk --help'
print "## Create a native iOS application "
print "### Help for iOS"
run 'sfdx mobilesdk:ios --help'
print "### Create Objective-C (native) or Swift (native_swift) application"
run 'sfdx mobilesdk:ios:create --help'
print "### List available native iOS templates"
run 'sfdx mobilesdk:ios:listtemplates --help'
print "### Create iOS application from template"
run 'sfdx mobilesdk:ios:createwithtemplate --help'
print "### Check store or syncs config"
run 'sfdx mobilesdk:ios:checkconfig --help'

print "## Create a native Android application "
print "### Help for Android"
run 'sfdx mobilesdk:android --help'
print "### Create Java (native) or Kotlin (native_kotlin) application"
run 'sfdx mobilesdk:android:create --help'
print "### List available native Android templates"
run 'sfdx mobilesdk:android:listtemplates --help'
print "### Create Android application from template"
run 'sfdx mobilesdk:android:createwithtemplate --help'
print "### Check store or syncs config"
run 'sfdx mobilesdk:android:checkconfig --help'

print "## Create an hybrid application "
print "### Help for hybrid"
run 'sfdx mobilesdk:hybrid --help'
print "### Create hybrid application"
run 'sfdx mobilesdk:hybrid:create --help'
print "### List available hybrid templates"
run 'sfdx mobilesdk:hybrid:listtemplates --help'
print "### Create hybrid application from template"
run 'sfdx mobilesdk:hybrid:createwithtemplate --help'
print "### Check store or syncs config"
run 'sfdx mobilesdk:hybrid:checkconfig --help'

print "## Create a React Native application"
print "### Help for React Native"
run 'sfdx mobilesdk:reactnative --help'
print "### Create React Native application"
run 'sfdx mobilesdk:reactnative:create --help'
print "### List available React Native templates"
run 'sfdx mobilesdk:reactnative:listtemplates --help'
print "### Create React Native application from template"
run 'sfdx mobilesdk:reactnative:createwithtemplate --help'
print "### Check store or syncs config"
run 'sfdx mobilesdk:reactnative:checkconfig --help'

