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
 mobilesdk:ios:create              create an iOS native mobile application
 mobilesdk:ios:createwithtemplate  create an iOS native mobile application from
                                   a template
 mobilesdk:ios:listtemplates       list available Mobile SDK templates
 mobilesdk:ios:version             show version of Mobile SDK

```

### Create Objective-C (native) or Swift (native_swift) application
```
-> sfdx mobilesdk:ios:create --help
Usage: sfdx mobilesdk:ios:create 

create an iOS native mobile application

Flags:
 -n, --appname APPNAME            (required) application name
 -t, --apptype APPTYPE            (required) application type (native, native_swift)
 -o, --organization ORGANIZATION  (required) organization name (your company's/organization's name)
 -d, --outputdir OUTPUTDIR        output directory (leave empty for current directory)
 -k, --packagename PACKAGENAME    (required) app package identifier (e.g. com.mycompany.myapp)

This command initiates creation of a new app based on the standard Mobile SDK template.

```

### List available native iOS templates
```
-> sfdx mobilesdk:ios:listtemplates --help
Usage: sfdx mobilesdk:ios:listtemplates

list available Mobile SDK templates

This command displays the list of available Mobile SDK templates.

```

### Create iOS application from template
```
-> sfdx mobilesdk:ios:createwithtemplate --help
Usage: sfdx mobilesdk:ios:createwithtemplate 

create an iOS native mobile application from a template

Flags:
 -n, --appname APPNAME                  (required) application name
 -o, --organization ORGANIZATION        (required) organization name (your company's/organization's name)
 -d, --outputdir OUTPUTDIR              output directory (leave empty for current directory)
 -k, --packagename PACKAGENAME          (required) app package identifier (e.g. com.mycompany.myapp)
 -r, --templaterepouri TEMPLATEREPOURI  (required) template repo URI

This command initiates creation of a new app based on the Mobile SDK template that you specify. The template can be a specialized app for your app type that Mobile SDK provides, or your own custom app that you've configured to use as a template. See https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/ios_new_project_template.htm for information on custom templates.

```

## Create a native Android application 
### Help for Android
```
-> sfdx mobilesdk:android --help
sfdx mobilesdk:android commands: (get help with sfdx help mobilesdk:android:COMMAND)
 mobilesdk:android:create              create an Android native mobile
                                       application
 mobilesdk:android:createwithtemplate  create an Android native mobile
                                       application from a template
 mobilesdk:android:listtemplates       list available Mobile SDK templates
 mobilesdk:android:version             show version of Mobile SDK

```

### Create Java (native) or Kotlin (native_kotlin) application
```
-> sfdx mobilesdk:android:create --help
Usage: sfdx mobilesdk:android:create 

create an Android native mobile application

Flags:
 -n, --appname APPNAME            (required) application name
 -t, --apptype APPTYPE            (required) application type (native, native_kotlin)
 -o, --organization ORGANIZATION  (required) organization name (your company's/organization's name)
 -d, --outputdir OUTPUTDIR        output directory (leave empty for current directory)
 -k, --packagename PACKAGENAME    (required) app package identifier (e.g. com.mycompany.myapp)

This command initiates creation of a new app based on the standard Mobile SDK template.

```

### List available native Android templates
```
-> sfdx mobilesdk:android:listtemplates --help
Usage: sfdx mobilesdk:android:listtemplates

list available Mobile SDK templates

This command displays the list of available Mobile SDK templates.

```

### Create Android application from template
```
-> sfdx mobilesdk:android:createwithtemplate --help
Usage: sfdx mobilesdk:android:createwithtemplate 

create an Android native mobile application from a template

Flags:
 -n, --appname APPNAME                  (required) application name
 -o, --organization ORGANIZATION        (required) organization name (your company's/organization's name)
 -d, --outputdir OUTPUTDIR              output directory (leave empty for current directory)
 -k, --packagename PACKAGENAME          (required) app package identifier (e.g. com.mycompany.myapp)
 -r, --templaterepouri TEMPLATEREPOURI  (required) template repo URI

This command initiates creation of a new app based on the Mobile SDK template that you specify. The template can be a specialized app for your app type that Mobile SDK provides, or your own custom app that you've configured to use as a template. See https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/ios_new_project_template.htm for information on custom templates.

```

## Create an hybrid application 
### Help for hybrid
```
-> sfdx mobilesdk:hybrid --help
sfdx mobilesdk:hybrid commands: (get help with sfdx help mobilesdk:hybrid:COMMAND)
 mobilesdk:hybrid:create              create a hybrid mobile application
 mobilesdk:hybrid:createwithtemplate  create a hybrid mobile application from a
                                      template
 mobilesdk:hybrid:listtemplates       list available Mobile SDK templates
 mobilesdk:hybrid:version             show version of Mobile SDK

```

### Create hybrid application
```
-> sfdx mobilesdk:hybrid:create --help
Usage: sfdx mobilesdk:hybrid:create 

create a hybrid mobile application

Flags:
 -n, --appname APPNAME            (required) application name
 -t, --apptype APPTYPE            (required) application type (hybrid_local, hybrid_remote)
 -o, --organization ORGANIZATION  (required) organization name (your company's/organization's name)
 -d, --outputdir OUTPUTDIR        output directory (leave empty for current directory)
 -k, --packagename PACKAGENAME    (required) app package identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM          (required) comma-separated list of platforms (ios, android)
 -s, --startpage STARTPAGE        app start page (the start page of your remote app; required for hybrid_remote apps only)

This command initiates creation of a new app based on the standard Mobile SDK template.

```

### List available hybrid templates
```
-> sfdx mobilesdk:hybrid:listtemplates --help
Usage: sfdx mobilesdk:hybrid:listtemplates

list available Mobile SDK templates

This command displays the list of available Mobile SDK templates.

```

### Create hybrid application from template
```
-> sfdx mobilesdk:hybrid:createwithtemplate --help
Usage: sfdx mobilesdk:hybrid:createwithtemplate 

create a hybrid mobile application from a template

Flags:
 -n, --appname APPNAME                  (required) application name
 -o, --organization ORGANIZATION        (required) organization name (your company's/organization's name)
 -d, --outputdir OUTPUTDIR              output directory (leave empty for current directory)
 -k, --packagename PACKAGENAME          (required) app package identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM                (required) comma-separated list of platforms (ios, android)
 -r, --templaterepouri TEMPLATEREPOURI  (required) template repo URI

This command initiates creation of a new app based on the Mobile SDK template that you specify. The template can be a specialized app for your app type that Mobile SDK provides, or your own custom app that you've configured to use as a template. See https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/ios_new_project_template.htm for information on custom templates.

```

## Create a React Native application
### Help for React Native
```
-> sfdx mobilesdk:reactnative --help
sfdx mobilesdk:reactnative commands: (get help with sfdx help mobilesdk:reactnative:COMMAND)
 mobilesdk:reactnative:create              create a React Native mobile
                                           application
 mobilesdk:reactnative:createwithtemplate  create a React Native mobile
                                           application from a template
 mobilesdk:reactnative:listtemplates       list available Mobile SDK templates
 mobilesdk:reactnative:version             show version of Mobile SDK

```

### Create React Native application
```
-> sfdx mobilesdk:reactnative:create --help
Usage: sfdx mobilesdk:reactnative:create 

create a React Native mobile application

Flags:
 -n, --appname APPNAME            (required) application name
 -o, --organization ORGANIZATION  (required) organization name (your company's/organization's name)
 -d, --outputdir OUTPUTDIR        output directory (leave empty for current directory)
 -k, --packagename PACKAGENAME    (required) app package identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM          (required) comma-separated list of platforms (ios, android)

This command initiates creation of a new app based on the standard Mobile SDK template.

```

### List available React Native templates
```
-> sfdx mobilesdk:reactnative:listtemplates --help
Usage: sfdx mobilesdk:reactnative:listtemplates

list available Mobile SDK templates

This command displays the list of available Mobile SDK templates.

```

### Create React Native application from template
```
-> sfdx mobilesdk:reactnative:createwithtemplate --help
Usage: sfdx mobilesdk:reactnative:createwithtemplate 

create a React Native mobile application from a template

Flags:
 -n, --appname APPNAME                  (required) application name
 -o, --organization ORGANIZATION        (required) organization name (your company's/organization's name)
 -d, --outputdir OUTPUTDIR              output directory (leave empty for current directory)
 -k, --packagename PACKAGENAME          (required) app package identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM                (required) comma-separated list of platforms (ios, android)
 -r, --templaterepouri TEMPLATEREPOURI  (required) template repo URI

This command initiates creation of a new app based on the Mobile SDK template that you specify. The template can be a specialized app for your app type that Mobile SDK provides, or your own custom app that you've configured to use as a template. See https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.meta/mobile_sdk/ios_new_project_template.htm for information on custom templates.

```

