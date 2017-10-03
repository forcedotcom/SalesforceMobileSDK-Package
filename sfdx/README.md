# sfdx-mobilesdk-plugin 

A plugin for the Salesforce CLI to create mobile applications to interface with the [Salesforce Platform](http://www.salesforce.com/platform/overview/), leveraging the [Salesforce Mobile SDK for iOS](https://github.com/forcedotcom/SalesforceMobileSDK-iOS) and the [Salesforce Mobile SDK for Android](https://github.com/forcedotcom/SalesforceMobileSDK-Android) repos.

## Setup

### Install from source

1. Install the SDFX CLI (https://developer.salesforce.com/tools/sfdxcli).

2. Clone the repository: `git clone git@github.com:forcedotcom/SalesforceMobileSDK-Package`

3. Install npm modules: `npm install`

4. Link the plugin: `sfdx plugins:link sfdx`

### Install as plugin

1. Install the plugin: `sfdx plugins:install sfdx-mobilesdk-plugin`

## Help
```
-> sfdx mobilesdk --help
Usage: sfdx COMMAND [command-specific-options]

Help topics. Type "sfdx help TOPIC" for more details.

  sfdx mobilesdk:ios         # Command for building an iOS native mobile application using Saleforce Mobile SDK
  sfdx mobilesdk:android     # Command for building an Android native mobile application using Saleforce Mobile SDK
  sfdx mobilesdk:hybrid      # Command for building a hybrid mobile application using Saleforce Mobile SDK
  sfdx mobilesdk:reactnative # Command for building a React Native mobile application using Saleforce Mobile SDK
```

## Create a native iOS application 

### Help for iOS
```
-> sfdx mobilesdk:ios --help
Usage: sfdx ios:COMMAND [command-specific-options]

Commands for the ios option. Type "sfdx help ios:COMMAND" for more details.

 sfdx mobilesdk:ios:create           # Create an iOS native or native_swift mobile application
 sfdx mobilesdk:ios:createWithTemplate # Create an iOS native or native_swift mobile application from a template
 sfdx mobilesdk:ios:version          # Print version of Mobile SDK
```

### Create Objective-C (native) or Swift (native_swift) application
```
-> sfdx mobilesdk:ios:create --help
Usage: sfdx mobilesdk:ios:create

Create an iOS native or native_swift mobile application.

 -n, --appname APPNAME           # Application Name
 -t, --apptype APPTYPE           # Application Type (native, native_swift)
 -o, --organization ORGANIZATION # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR       # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME   # App Package Identifier (e.g. com.mycompany.myapp)
```

### Create iOS application from template
```
-> sfdx mobilesdk:ios:createWithTemplate --help
Usage: sfdx mobilesdk:ios:createWithTemplate

Create an iOS native or native_swift mobile application from a template.

 -n, --appname APPNAME                 # Application Name
 -o, --organization ORGANIZATION       # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR             # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME         # App Package Identifier (e.g. com.mycompany.myapp)
 -r, --templaterepouri TEMPLATEREPOURI # Template repo URI
```

## Create a native Android application 

### Help for Android
```
-> sfdx mobilesdk:android --help
Usage: sfdx android:COMMAND [command-specific-options]

Commands for the android options. Type "sfdx help android:COMMAND" for more details.

 sfdx mobilesdk:android:create       # Create an Android native or native_kotlin mobile application
 sfdx mobilesdk:android:createWithTemplate # Create an Android native or native_kotlin mobile application from a template
 sfdx mobilesdk:android:version      # Print version of Mobile SDK
```

### Create Java (native) or Kotlin (native_kotlin) application
```
-> sfdx mobilesdk:android:create --help
Usage: sfdx mobilesdk:android:create

Create an Android native or native_kotlin mobile application.

 -n, --appname APPNAME           # Application Name
 -t, --apptype APPTYPE           # Application Type (native, native_kotlin)
 -o, --organization ORGANIZATION # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR       # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME   # App Package Identifier (e.g. com.mycompany.myapp)
```

### Create Android application from template
```
-> sfdx mobilesdk:android:createWithTemplate --help
Usage: sfdx mobilesdk:android:createWithTemplate

Create an Android native or native_kotlin mobile application from a template.

 -n, --appname APPNAME                 # Application Name
 -o, --organization ORGANIZATION       # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR             # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME         # App Package Identifier (e.g. com.mycompany.myapp)
 -r, --templaterepouri TEMPLATEREPOURI # Template repo URI
 
```

## Create an hybrid application 

### Help for hybrid
```
-> sfdx mobilesdk:hybrid --help
Usage: sfdx hybrid:COMMAND [command-specific-options]

Commands for the hybrid option. Type "sfdx help hybrid:COMMAND" for more details.

 sfdx mobilesdk:hybrid:create        # Create an iOS/Android hybrid_local or hybrid_remote mobile application
 sfdx mobilesdk:hybrid:createWithTemplate # Create an iOS/Android hybrid_local or hybrid_remote mobile application from a template
 sfdx mobilesdk:hybrid:version       # Print version of Mobile SDK
```

### Create hybrid application
```
-> sfdx mobilesdk:hybrid:create --help
Usage: sfdx mobilesdk:hybrid:create

Create an iOS/Android hybrid_local or hybrid_remote mobile application.

 -n, --appname APPNAME             # Application Name
 -t, --apptype APPTYPE             # Application Type (hybrid_local, hybrid_remote)
 -o, --organization ORGANIZATION   # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR         # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME     # App Package Identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM           # Comma-separated list of platforms (ios, android)
 -s, --startpage STARTPAGE         # App Start Page (The start page of your remote app. Only required for hybrid_remote.)
```

### Create hybrid application from template

```
-> sfdx mobilesdk:hybrid:createWithTemplate --help
Usage: sfdx mobilesdk:hybrid:createWithTemplate

Create an iOS/Android hybrid_local or hybrid_remote mobile application from a template.

 -n, --appname APPNAME                 # Application Name
 -o, --organization ORGANIZATION       # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR             # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME         # App Package Identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM               # Comma-separated list of platforms (ios, android)
 -r, --templaterepouri TEMPLATEREPOURI # Template repo URI
```

## Create a React Native application 

### Help for React Native
```
-> sfdx mobilesdk:reactnative --help
Usage: sfdx reactnative:COMMAND [command-specific-options]

Commands for the reactnative option. Type "sfdx help reactnative:COMMAND" for more details.

 sfdx mobilesdk:reactnative:create   # Create an iOS/Android react_native mobile application
 sfdx mobilesdk:reactnative:createWithTemplate # Create an iOS/Android react_native mobile application from a template
 sfdx mobilesdk:reactnative:version  # Print version of Mobile SDK
```

### Create React Native application
```
-> sfdx mobilesdk:reactnative:create --help
Usage: sfdx mobilesdk:reactnative:create

Create an iOS/Android react_native mobile application.

 -n, --appname APPNAME           # Application Name
 -o, --organization ORGANIZATION # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR       # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME   # App Package Identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM         # Comma-separated platforms (ios, android)
```

### Create React Native application from template
```
-> sfdx mobilesdk:reactnative:createWithTemplate --help
Usage: sfdx mobilesdk:reactnative:createWithTemplate

Create an iOS/Android react_native mobile application from a template.

 -n, --appname APPNAME                 # Application Name
 -o, --organization ORGANIZATION       # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR             # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME         # App Package Identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM               # Comma-separated platforms (ios, android)
```
