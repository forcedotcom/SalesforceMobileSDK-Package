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

## Setup

### Install from source

1. Install the Salesforce CLI (https://developer.salesforce.com/tools/salesforcecli).

2. Clone the repository: \`git clone git@github.com:forcedotcom/SalesforceMobileSDK-Package\`

3. Install npm modules: \`npm install\`

4. Generate oclif command classes \`./sfdx/generate_oclif.js\`

5. Link the plugin: \`sf plugins link sfdx\`

### Install as plugin

1. Install plugin: \`sf plugins install sfdx-mobilesdk-plugin\`

EOT

print "## Help"
run 'sf mobilesdk --help'
print "## Create a native iOS application "
print "### Help for iOS"
run 'sf mobilesdk ios --help'
print "### Create Objective-C (native) or Swift (native_swift) application"
run 'sf mobilesdk ios create --help'
print "### List available native iOS templates"
run 'sf mobilesdk ios listtemplates --help'
print "### Create iOS application from template"
run 'sf mobilesdk ios createwithtemplate --help'
print "### Check store or syncs config"
run 'sf mobilesdk ios checkconfig --help'

print "## Create a native Android application "
print "### Help for Android"
run 'sf mobilesdk android --help'
print "### Create Java (native) or Kotlin (native_kotlin) application"
run 'sf mobilesdk android create --help'
print "### List available native Android templates"
run 'sf mobilesdk android listtemplates --help'
print "### Create Android application from template"
run 'sf mobilesdk android createwithtemplate --help'
print "### Check store or syncs config"
run 'sf mobilesdk android checkconfig --help'

print "## Create an hybrid application "
print "### Help for hybrid"
run 'sf mobilesdk hybrid --help'
print "### Create hybrid application"
run 'sf mobilesdk hybrid create --help'
print "### List available hybrid templates"
run 'sf mobilesdk hybrid listtemplates --help'
print "### Create hybrid application from template"
run 'sf mobilesdk hybrid createwithtemplate --help'
print "### Check store or syncs config"
run 'sf mobilesdk hybrid checkconfig --help'

print "## Create a React Native application"
print "### Help for React Native"
run 'sf mobilesdk reactnative --help'
print "### Create React Native application"
run 'sf mobilesdk reactnative create --help'
print "### List available React Native templates"
run 'sf mobilesdk reactnative listtemplates --help'
print "### Create React Native application from template"
run 'sf mobilesdk reactnative createwithtemplate --help'
print "### Check store or syncs config"
run 'sf mobilesdk reactnative checkconfig --help'

