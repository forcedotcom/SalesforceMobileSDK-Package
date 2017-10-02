# sfdx-mobilesdk-plugin 

A plugin for the Salesforce CLI to create mobile applications to interface with the [Salesforce Platform](http://www.salesforce.com/platform/overview/), leveraging the [Salesforce Mobile SDK for iOS](https://github.com/forcedotcom/SalesforceMobileSDK-iOS) and the [Salesforce Mobile SDK for Android](https://github.com/forcedotcom/SalesforceMobileSDK-Android).

## Setup

### Install from source

1. Install the SDFX CLI.

2. Clone the repository: `git clone git@github.com:forcedotcom/SalesforceMobileSDK-Package`

3. Install npm modules: `npm install`

4. Link the plugin: `sfdx plugins:link sfdx`

### Install as plugin

1. Install plugin: `sfdx plugins:install sfdx-mobilesdk-plugin`

## Create a native iOS application 

```
-> sfdx mobilesdk:ios --help
Parsing sfdx-mobilesdk-plugin... done
Usage: sfdx ios:COMMAND [command-specific-options]

Commands for ios, type "sfdx help ios:COMMAND" for more details:

 sfdx mobilesdk:ios:create           # create ios native or native_swift mobile application
 sfdx mobilesdk:ios:createWithTemplate # create ios native or native_swift mobile application from a template
 sfdx mobilesdk:ios:version          # print version of Mobile SDK

-> sfdx mobilesdk:ios:create --help
Usage: sfdx mobilesdk:ios:create

create ios native or native_swift mobile application

 -n, --appname APPNAME           # Application Name
 -t, --apptype APPTYPE           # Application Type (native, native_swift)
 -o, --organization ORGANIZATION # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR       # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME   # App Package Identifier (e.g. com.mycompany.myapp)

-> sfdx mobilesdk:ios:createWithTemplate --help
Usage: sfdx mobilesdk:ios:createWithTemplate

create ios native or native_swift mobile application from a template

 -n, --appname APPNAME                 # Application Name
 -o, --organization ORGANIZATION       # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR             # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME         # App Package Identifier (e.g. com.mycompany.myapp)
 -r, --templaterepouri TEMPLATEREPOURI # Template repo URI
```

## Create a native Android application 
```
-> sfdx mobilesdk:android --help
Parsing sfdx-mobilesdk-plugin... done
Usage: sfdx android:COMMAND [command-specific-options]

Commands for android, type "sfdx help android:COMMAND" for more details:

 sfdx mobilesdk:android:create       # create android native or native_kotlin mobile application
 sfdx mobilesdk:android:createWithTemplate # create android native or native_kotlin mobile application from a template
 sfdx mobilesdk:android:version      # print version of Mobile SDK

-> sfdx mobilesdk:android:create --help
Parsing sfdx-mobilesdk-plugin... done
Usage: sfdx mobilesdk:android:create

create android native or native_kotlin mobile application

 -n, --appname APPNAME           # Application Name
 -t, --apptype APPTYPE           # Application Type (native, native_kotlin)
 -o, --organization ORGANIZATION # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR       # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME   # App Package Identifier (e.g. com.mycompany.myapp)

-> sfdx mobilesdk:android:createWithTemplate --help
Parsing sfdx-mobilesdk-plugin... done
Usage: sfdx mobilesdk:android:createWithTemplate

create android native or native_kotlin mobile application from a template

 -n, --appname APPNAME                 # Application Name
 -o, --organization ORGANIZATION       # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR             # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME         # App Package Identifier (e.g. com.mycompany.myapp)
 -r, --templaterepouri TEMPLATEREPOURI # Template repo URI
 
```

## Create an hybrid application 
```
-> sfdx mobilesdk:ios:create --help
Usage: sfdx mobilesdk:ios:create

create ios native or native_swift mobile application

 -n, --appname APPNAME           # Application Name
 -t, --apptype APPTYPE           # Application Type (native, native_swift)
 -o, --organization ORGANIZATION # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR       # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME   # App Package Identifier (e.g. com.mycompany.myapp)

-> sfdx mobilesdk:ios:createWithTemplate --help
Usage: sfdx mobilesdk:ios:createWithTemplate

create ios native or native_swift mobile application from a template

 -n, --appname APPNAME                 # Application Name
 -o, --organization ORGANIZATION       # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR             # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME         # App Package Identifier (e.g. com.mycompany.myapp)
 -r, --templaterepouri TEMPLATEREPOURI # Template repo URI

-> sfdx mobilesdk:hybrid --help
Parsing sfdx-mobilesdk-plugin... done
Usage: sfdx hybrid:COMMAND [command-specific-options]


Commands for hybrid, type "sfdx help hybrid:COMMAND" for more details:

 sfdx mobilesdk:hybrid:create        # create ios/android hybrid_local or hybrid_remote mobile application
 sfdx mobilesdk:hybrid:createWithTemplate # create ios/android hybrid_local or hybrid_remote mobile application from a template
 sfdx mobilesdk:hybrid:version       # print version of Mobile SDK

-> sfdx mobilesdk:hybrid:create --help
Usage: sfdx mobilesdk:hybrid:create

create ios/android hybrid_local or hybrid_remote mobile application

 -n, --appname APPNAME             # Application Name
 -t, --apptype APPTYPE             # Application Type (hybrid_local, hybrid_remote)
 -o, --organization ORGANIZATION   # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR         # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME     # App Package Identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM           # Comma separated platforms (ios, android)
 -s, --startpage STARTPAGE         # App Start Page (The start page of your remote app. Only required for hybrid_remote)

-> sfdx mobilesdk:hybrid:createWithTemplate --help
Usage: sfdx mobilesdk:hybrid:createWithTemplate

create ios/android hybrid_local or hybrid_remote mobile application from a template

 -n, --appname APPNAME                 # Application Name
 -o, --organization ORGANIZATION       # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR             # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME         # App Package Identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM               # Comma separated platforms (ios, android)
 -r, --templaterepouri TEMPLATEREPOURI # Template repo URI
```

## Create a React Native application 
```
-> sfdx mobilesdk:reactnative --help
Parsing sfdx-mobilesdk-plugin... done
Usage: sfdx reactnative:COMMAND [command-specific-options]


Commands for reactnative, type "sfdx help reactnative:COMMAND" for more details:

 sfdx mobilesdk:reactnative:create   # create ios/android react_native mobile application
 sfdx mobilesdk:reactnative:createWithTemplate # create ios/android react_native mobile application from a template
 sfdx mobilesdk:reactnative:version  # print version of Mobile SDK

-> sfdx mobilesdk:reactnative:create --help
Usage: sfdx mobilesdk:reactnative:create

create ios/android react_native mobile application

 -n, --appname APPNAME           # Application Name
 -o, --organization ORGANIZATION # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR       # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME   # App Package Identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM         # Comma separated platforms (ios, android)

-> sfdx mobilesdk:reactnative:createWithTemplate --help
Usage: sfdx mobilesdk:reactnative:createWithTemplate

create ios/android react_native mobile application from a template

 -n, --appname APPNAME                 # Application Name
 -o, --organization ORGANIZATION       # Organization Name (Your company's/organization's name)
 -d, --outputdir OUTPUTDIR             # Output Directory (Leave empty for current directory)
 -p, --packagename PACKAGENAME         # App Package Identifier (e.g. com.mycompany.myapp)
 -p, --platform PLATFORM               # Comma separated platforms (ios, android)
```