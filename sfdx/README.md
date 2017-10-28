# sfdx-mobilesdk-plugin 

A plugin for the Salesforce CLI to create mobile applications to interface with the [Salesforce Platform](http://www.salesforce.com/platform/overview/), leveraging the [Salesforce Mobile SDK for iOS](https://github.com/forcedotcom/SalesforceMobileSDK-iOS) and the [Salesforce Mobile SDK for Android](https://github.com/forcedotcom/SalesforceMobileSDK-Android) repos.

## Setup

### Install from source

1. Install the SDFX CLI (https://developer.salesforce.com/tools/sfdxcli).

2. Clone the repository: `git clone git@github.com:forcedotcom/SalesforceMobileSDK-Package`

3. Install npm modules: `npm install`

4. Link the plugin: `sfdx plugins:link sfdx`

### Install as plugin

1. Install plugin: `sfdx plugins:install sfdx-mobilesdk-plugin`

## Help
```
-> sfdx mobilesdk --help
Usage: sfdx mobilesdk:COMMAND

Help topics, type sfdx help TOPIC for more details:

 mobilesdk:android      Command for building an Android native mobile
                        application using Salesforce Mobile SDK
 mobilesdk:hybrid       Command for building a hybrid mobile application using
                        Salesforce Mobile SDK
 mobilesdk:ios          Command for building an iOS native mobile application
                        using Salesforce Mobile SDK
 mobilesdk:reactnative  Command for building a React Native mobile application
                        using Salesforce Mobile SDK

```

## Create a native iOS application 
### Help for iOS
```
-> sfdx mobilesdk:ios --help
sfdx mobilesdk:ios commands: (get help with sfdx help mobilesdk:ios:COMMAND)
 mobilesdk:ios:create              Create an iOS native mobile application
 mobilesdk:ios:createwithtemplate  Create an iOS native mobile application from
                                   a template
 mobilesdk:ios:version             Print version of Mobile SDK

```

### Create Objective-C (native) or Swift (native_swift) application
```
-> sfdx mobilesdk:ios:create --help
Usage: sfdx mobilesdk:ios:create 

Create an iOS native mobile application

Flags:
 -n, --appname APPNAME            (required) Application Name
 -t, --apptype APPTYPE            (required) Application Type (native,
                                  native_swift)
 -o, --organization ORGANIZATION  (required) Organization Name (Your
                                  company's/organization's name)
 -d, --outputdir OUTPUTDIR        Output Directory (Leave empty for current
                                  directory)
 -k, --packagename PACKAGENAME    (required) App Package Identifier (e.g.
                                  com.mycompany.myapp)

```

### Create iOS application from template
```
-> sfdx mobilesdk:ios:createwithtemplate --help
Usage: sfdx mobilesdk:ios:createwithtemplate 

Create an iOS native mobile application from a template

Flags:
 -n, --appname APPNAME                  (required) Application Name
 -o, --organization ORGANIZATION        (required) Organization Name (Your
                                        company's/organization's name)
 -d, --outputdir OUTPUTDIR              Output Directory (Leave empty for
                                        current directory)
 -k, --packagename PACKAGENAME          (required) App Package Identifier (e.g.
                                        com.mycompany.myapp)
 -r, --templaterepouri TEMPLATEREPOURI  (required) Template repo URI

```

## Create a native Android application 
### Help for Android
```
-> sfdx mobilesdk:android --help
sfdx mobilesdk:android commands: (get help with sfdx help mobilesdk:android:COMMAND)
 mobilesdk:android:create              Create an Android native mobile
                                       application
 mobilesdk:android:createwithtemplate  Create an Android native mobile
                                       application from a template
 mobilesdk:android:version             Print version of Mobile SDK

```

### Create Java (native) or Kotlin (native_kotlin) application
```
-> sfdx mobilesdk:android:create --help
Usage: sfdx mobilesdk:android:create 

Create an Android native mobile application

Flags:
 -n, --appname APPNAME            (required) Application Name
 -t, --apptype APPTYPE            (required) Application Type (native,
                                  native_kotlin)
 -o, --organization ORGANIZATION  (required) Organization Name (Your
                                  company's/organization's name)
 -d, --outputdir OUTPUTDIR        Output Directory (Leave empty for current
                                  directory)
 -k, --packagename PACKAGENAME    (required) App Package Identifier (e.g.
                                  com.mycompany.myapp)

```

### Create Android application from template
```
-> sfdx mobilesdk:android:createwithtemplate --help
Usage: sfdx mobilesdk:android:createwithtemplate 

Create an Android native mobile application from a template

Flags:
 -n, --appname APPNAME                  (required) Application Name
 -o, --organization ORGANIZATION        (required) Organization Name (Your
                                        company's/organization's name)
 -d, --outputdir OUTPUTDIR              Output Directory (Leave empty for
                                        current directory)
 -k, --packagename PACKAGENAME          (required) App Package Identifier (e.g.
                                        com.mycompany.myapp)
 -r, --templaterepouri TEMPLATEREPOURI  (required) Template repo URI

```

## Create an hybrid application 
### Help for hybrid
```
-> sfdx mobilesdk:hybrid --help
sfdx mobilesdk:hybrid commands: (get help with sfdx help mobilesdk:hybrid:COMMAND)
 mobilesdk:hybrid:create              Create a hybrid mobile application
 mobilesdk:hybrid:createwithtemplate  Create a hybrid mobile application from a
                                      template
 mobilesdk:hybrid:version             Print version of Mobile SDK

```

### Create hybrid application
```
-> sfdx mobilesdk:hybrid:create --help
Usage: sfdx mobilesdk:hybrid:create 

Create a hybrid mobile application

Flags:
 -n, --appname APPNAME            (required) Application Name
 -t, --apptype APPTYPE            (required) Application Type (hybrid_local,
                                  hybrid_remote)
 -o, --organization ORGANIZATION  (required) Organization Name (Your
                                  company's/organization's name)
 -d, --outputdir OUTPUTDIR        Output Directory (Leave empty for current
                                  directory)
 -k, --packagename PACKAGENAME    (required) App Package Identifier (e.g.
                                  com.mycompany.myapp)
 -p, --platform PLATFORM          (required) Comma-separated list of platforms
                                  (ios, android)
 -s, --startpage STARTPAGE        App Start Page (The start page of your remote
                                  app. Only required for hybrid_remote)

```

### Create hybrid application from template
```
-> sfdx mobilesdk:hybrid:createwithtemplate --help
Usage: sfdx mobilesdk:hybrid:createwithtemplate 

Create a hybrid mobile application from a template

Flags:
 -n, --appname APPNAME                  (required) Application Name
 -o, --organization ORGANIZATION        (required) Organization Name (Your
                                        company's/organization's name)
 -d, --outputdir OUTPUTDIR              Output Directory (Leave empty for
                                        current directory)
 -k, --packagename PACKAGENAME          (required) App Package Identifier (e.g.
                                        com.mycompany.myapp)
 -p, --platform PLATFORM                (required) Comma-separated list of
                                        platforms (ios, android)
 -r, --templaterepouri TEMPLATEREPOURI  (required) Template repo URI

```

## Create a React Native application
### Help for React Native
```
-> sfdx mobilesdk:reactnative --help
sfdx mobilesdk:reactnative commands: (get help with sfdx help mobilesdk:reactnative:COMMAND)
 mobilesdk:reactnative:create              Create a React Native mobile
                                           application
 mobilesdk:reactnative:createwithtemplate  Create a React Native mobile
                                           application from a template
 mobilesdk:reactnative:version             Print version of Mobile SDK

```

### Create React Native application
```
-> sfdx mobilesdk:reactnative:create --help
Usage: sfdx mobilesdk:reactnative:create 

Create a React Native mobile application

Flags:
 -n, --appname APPNAME            (required) Application Name
 -o, --organization ORGANIZATION  (required) Organization Name (Your
                                  company's/organization's name)
 -d, --outputdir OUTPUTDIR        Output Directory (Leave empty for current
                                  directory)
 -k, --packagename PACKAGENAME    (required) App Package Identifier (e.g.
                                  com.mycompany.myapp)
 -p, --platform PLATFORM          (required) Comma-separated list of platforms
                                  (ios, android)

```

### Create React Native application from template
```
-> sfdx mobilesdk:reactnative:createwithtemplate --help
Usage: sfdx mobilesdk:reactnative:createwithtemplate 

Create a React Native mobile application from a template

Flags:
 -n, --appname APPNAME                  (required) Application Name
 -o, --organization ORGANIZATION        (required) Organization Name (Your
                                        company's/organization's name)
 -d, --outputdir OUTPUTDIR              Output Directory (Leave empty for
                                        current directory)
 -k, --packagename PACKAGENAME          (required) App Package Identifier (e.g.
                                        com.mycompany.myapp)
 -p, --platform PLATFORM                (required) Comma-separated list of
                                        platforms (ios, android)
 -r, --templaterepouri TEMPLATEREPOURI  (required) Template repo URI

```

