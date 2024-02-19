# sfdx-mobilesdk-plugin 

A plugin for the Salesforce CLI to create mobile applications to interface with the [Salesforce Platform](http://www.salesforce.com/platform/overview/), leveraging the [Salesforce Mobile SDK for iOS](https://github.com/forcedotcom/SalesforceMobileSDK-iOS) and the [Salesforce Mobile SDK for Android](https://github.com/forcedotcom/SalesforceMobileSDK-Android) repos.

## Setup

### Install from source

1. Install the Salesforce CLI (https://developer.salesforce.com/tools/salesforcecli).

2. Clone the repository: `git clone git@github.com:forcedotcom/SalesforceMobileSDK-Package`

3. Install npm modules: `npm install`

4. Generate oclif command classes `./sfdx/generate_oclif.js`

5. Link the plugin: `sf plugins link sfdx`

### Install as plugin

1. Install plugin: `sf plugins install sfdx-mobilesdk-plugin`

## Help
```
-> sf mobilesdk --help
create mobile apps based on the Salesforce Mobile SDK

USAGE
  $ sf mobilesdk COMMAND

TOPICS
  mobilesdk android      create an Android native mobile application
  mobilesdk hybrid       create a hybrid mobile application
  mobilesdk ios          create an iOS native mobile application
  mobilesdk reactnative  create a React Native mobile application

```

## Create a native iOS application 
### Help for iOS
```
-> sf mobilesdk ios --help
create an iOS native mobile application

USAGE
  $ sf mobilesdk ios COMMAND

COMMANDS
  mobilesdk ios checkconfig         validate store or syncs configuration
  mobilesdk ios create              create an iOS native mobile application
  mobilesdk ios createwithtemplate  create an iOS native mobile application from
                                    a template
  mobilesdk ios listtemplates       list available Mobile SDK templates to
                                    create an iOS native mobile application
  mobilesdk ios version             show version of Mobile SDK

```

### Create Objective-C (native) or Swift (native_swift) application
```
-> sf mobilesdk ios create --help
create an iOS native mobile application

USAGE
  $ sf mobilesdk ios create -n <value> -k <value> -o <value> [-t <value>] [-d
    <value>]

FLAGS
  -d, --outputdir=<value>     output directory (leave empty for current
                              directory)
  -k, --packagename=<value>   (required) app package identifier (e.g.
                              com.mycompany.myapp)
  -n, --appname=<value>       (required) application name
  -o, --organization=<value>  (required) organization name (your
                              company's/organization's name)
  -t, --apptype=<value>       application type (native_swift or native, leave
                              empty for native_swift)

DESCRIPTION
  create an iOS native mobile application

  This command initiates creation of a new app based on the standard Mobile SDK
  template.

```

### List available native iOS templates
```
-> sf mobilesdk ios listtemplates --help
list available Mobile SDK templates to create an iOS native mobile application

USAGE
  $ sf mobilesdk ios listtemplates

DESCRIPTION
  list available Mobile SDK templates to create an iOS native mobile application

  This command displays the list of available Mobile SDK templates. You can copy
  repo paths from the output for use with the createwithtemplate command.

```

### Create iOS application from template
```
-> sf mobilesdk ios createwithtemplate --help
create an iOS native mobile application from a template

USAGE
  $ sf mobilesdk ios createwithtemplate -r <value> -n <value> -k <value> -o <value> [-d
    <value>]

FLAGS
  -d, --outputdir=<value>        output directory (leave empty for current
                                 directory)
  -k, --packagename=<value>      (required) app package identifier (e.g.
                                 com.mycompany.myapp)
  -n, --appname=<value>          (required) application name
  -o, --organization=<value>     (required) organization name (your
                                 company's/organization's name)
  -r, --templaterepouri=<value>  (required) template repo URI or Mobile SDK
                                 template name

DESCRIPTION
  create an iOS native mobile application from a template

  This command initiates creation of a new app based on the Mobile SDK template
  that you specify. The template can be a specialized app for your app type that
  Mobile SDK provides, or your own custom app that you've configured to use as a
  template. See https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.met
  a/mobile_sdk/ios_new_project_template.htm for information on custom templates.

```

### Check store or syncs config
```
-> sf mobilesdk ios checkconfig --help
validate store or syncs configuration

USAGE
  $ sf mobilesdk ios checkconfig -p <value> -t <value>

FLAGS
  -p, --configpath=<value>  (required) path to store or syncs config to validate
  -t, --configtype=<value>  (required) type of config to validate (store or
                            syncs)

DESCRIPTION
  validate store or syncs configuration

  This command checks whether the given store or syncs configuration is valid
  according to its JSON schema.

```

## Create a native Android application 
### Help for Android
```
-> sf mobilesdk android --help
create an Android native mobile application

USAGE
  $ sf mobilesdk android COMMAND

COMMANDS
  mobilesdk android checkconfig         validate store or syncs configuration
  mobilesdk android create              create an Android native mobile
                                        application
  mobilesdk android createwithtemplate  create an Android native mobile
                                        application from a template
  mobilesdk android listtemplates       list available Mobile SDK templates to
                                        create an Android native mobile
                                        application
  mobilesdk android version             show version of Mobile SDK

```

### Create Java (native) or Kotlin (native_kotlin) application
```
-> sf mobilesdk android create --help
create an Android native mobile application

USAGE
  $ sf mobilesdk android create -n <value> -k <value> -o <value> [-t <value>] [-d
    <value>]

FLAGS
  -d, --outputdir=<value>     output directory (leave empty for current
                              directory)
  -k, --packagename=<value>   (required) app package identifier (e.g.
                              com.mycompany.myapp)
  -n, --appname=<value>       (required) application name
  -o, --organization=<value>  (required) organization name (your
                              company's/organization's name)
  -t, --apptype=<value>       application type (native_kotlin or native, leave
                              empty for native_kotlin)

DESCRIPTION
  create an Android native mobile application

  This command initiates creation of a new app based on the standard Mobile SDK
  template.

```

### List available native Android templates
```
-> sf mobilesdk android listtemplates --help
list available Mobile SDK templates to create an Android native mobile application

USAGE
  $ sf mobilesdk android listtemplates

DESCRIPTION
  list available Mobile SDK templates to create an Android native mobile
  application

  This command displays the list of available Mobile SDK templates. You can copy
  repo paths from the output for use with the createwithtemplate command.

```

### Create Android application from template
```
-> sf mobilesdk android createwithtemplate --help
create an Android native mobile application from a template

USAGE
  $ sf mobilesdk android createwithtemplate -r <value> -n <value> -k <value> -o <value> [-d
    <value>]

FLAGS
  -d, --outputdir=<value>        output directory (leave empty for current
                                 directory)
  -k, --packagename=<value>      (required) app package identifier (e.g.
                                 com.mycompany.myapp)
  -n, --appname=<value>          (required) application name
  -o, --organization=<value>     (required) organization name (your
                                 company's/organization's name)
  -r, --templaterepouri=<value>  (required) template repo URI or Mobile SDK
                                 template name

DESCRIPTION
  create an Android native mobile application from a template

  This command initiates creation of a new app based on the Mobile SDK template
  that you specify. The template can be a specialized app for your app type that
  Mobile SDK provides, or your own custom app that you've configured to use as a
  template. See https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.met
  a/mobile_sdk/ios_new_project_template.htm for information on custom templates.

```

### Check store or syncs config
```
-> sf mobilesdk android checkconfig --help
validate store or syncs configuration

USAGE
  $ sf mobilesdk android checkconfig -p <value> -t <value>

FLAGS
  -p, --configpath=<value>  (required) path to store or syncs config to validate
  -t, --configtype=<value>  (required) type of config to validate (store or
                            syncs)

DESCRIPTION
  validate store or syncs configuration

  This command checks whether the given store or syncs configuration is valid
  according to its JSON schema.

```

## Create an hybrid application 
### Help for hybrid
```
-> sf mobilesdk hybrid --help
create a hybrid mobile application

USAGE
  $ sf mobilesdk hybrid COMMAND

COMMANDS
  mobilesdk hybrid checkconfig         validate store or syncs configuration
  mobilesdk hybrid create              create a hybrid mobile application
  mobilesdk hybrid createwithtemplate  create a hybrid mobile application from a
                                       template
  mobilesdk hybrid listtemplates       list available Mobile SDK templates to
                                       create a hybrid mobile application
  mobilesdk hybrid version             show version of Mobile SDK

```

### Create hybrid application
```
-> sf mobilesdk hybrid create --help
create a hybrid mobile application

USAGE
  $ sf mobilesdk hybrid create -p <value> -n <value> -k <value> -o <value> [-t
    <value>] [-s <value>] [-d <value>]

FLAGS
  -d, --outputdir=<value>     output directory (leave empty for current
                              directory)
  -k, --packagename=<value>   (required) app package identifier (e.g.
                              com.mycompany.myapp)
  -n, --appname=<value>       (required) application name
  -o, --organization=<value>  (required) organization name (your
                              company's/organization's name)
  -p, --platform=<value>      (required) comma-separated list of platforms (ios,
                              android)
  -s, --startpage=<value>     app start page (the start page of your remote app;
                              required for hybrid_remote apps only)
  -t, --apptype=<value>       application type (hybrid_local or hybrid_remote or
                              hybrid_lwc, leave empty for hybrid_local)

DESCRIPTION
  create a hybrid mobile application

  This command initiates creation of a new app based on the standard Mobile SDK
  template.

```

### List available hybrid templates
```
-> sf mobilesdk hybrid listtemplates --help
list available Mobile SDK templates to create a hybrid mobile application

USAGE
  $ sf mobilesdk hybrid listtemplates

DESCRIPTION
  list available Mobile SDK templates to create a hybrid mobile application

  This command displays the list of available Mobile SDK templates. You can copy
  repo paths from the output for use with the createwithtemplate command.

```

### Create hybrid application from template
```
-> sf mobilesdk hybrid createwithtemplate --help
create a hybrid mobile application from a template

USAGE
  $ sf mobilesdk hybrid createwithtemplate -p <value> -r <value> -n <value> -k <value> -o <value>
    [-s <value>] [-d <value>]

FLAGS
  -d, --outputdir=<value>        output directory (leave empty for current
                                 directory)
  -k, --packagename=<value>      (required) app package identifier (e.g.
                                 com.mycompany.myapp)
  -n, --appname=<value>          (required) application name
  -o, --organization=<value>     (required) organization name (your
                                 company's/organization's name)
  -p, --platform=<value>         (required) comma-separated list of platforms
                                 (ios, android)
  -r, --templaterepouri=<value>  (required) template repo URI or Mobile SDK
                                 template name
  -s, --startpage=<value>        app start page (the start page of your remote
                                 app; required for hybrid_remote apps only)

DESCRIPTION
  create a hybrid mobile application from a template

  This command initiates creation of a new app based on the Mobile SDK template
  that you specify. The template can be a specialized app for your app type that
  Mobile SDK provides, or your own custom app that you've configured to use as a
  template. See https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.met
  a/mobile_sdk/ios_new_project_template.htm for information on custom templates.

```

### Check store or syncs config
```
-> sf mobilesdk hybrid checkconfig --help
validate store or syncs configuration

USAGE
  $ sf mobilesdk hybrid checkconfig -p <value> -t <value>

FLAGS
  -p, --configpath=<value>  (required) path to store or syncs config to validate
  -t, --configtype=<value>  (required) type of config to validate (store or
                            syncs)

DESCRIPTION
  validate store or syncs configuration

  This command checks whether the given store or syncs configuration is valid
  according to its JSON schema.

```

## Create a React Native application
### Help for React Native
```
-> sf mobilesdk reactnative --help
create a React Native mobile application

USAGE
  $ sf mobilesdk reactnative COMMAND

COMMANDS
  mobilesdk reactnative checkconfig         validate store or syncs
                                            configuration
  mobilesdk reactnative create              create a React Native mobile
                                            application
  mobilesdk reactnative createwithtemplate  create a React Native mobile
                                            application from a template
  mobilesdk reactnative listtemplates       list available Mobile SDK templates
                                            to create a React Native mobile
                                            application
  mobilesdk reactnative version             show version of Mobile SDK

```

### Create React Native application
```
-> sf mobilesdk reactnative create --help
create a React Native mobile application

USAGE
  $ sf mobilesdk reactnative create -p <value> -n <value> -k <value> -o <value> [-t
    <value>] [-d <value>]

FLAGS
  -d, --outputdir=<value>     output directory (leave empty for current
                              directory)
  -k, --packagename=<value>   (required) app package identifier (e.g.
                              com.mycompany.myapp)
  -n, --appname=<value>       (required) application name
  -o, --organization=<value>  (required) organization name (your
                              company's/organization's name)
  -p, --platform=<value>      (required) comma-separated list of platforms (ios,
                              android)
  -t, --apptype=<value>       application type (react_native_typescript or
                              react_native, leave empty for
                              react_native_typescript)

DESCRIPTION
  create a React Native mobile application

  This command initiates creation of a new app based on the standard Mobile SDK
  template.

```

### List available React Native templates
```
-> sf mobilesdk reactnative listtemplates --help
list available Mobile SDK templates to create a React Native mobile application

USAGE
  $ sf mobilesdk reactnative listtemplates

DESCRIPTION
  list available Mobile SDK templates to create a React Native mobile
  application

  This command displays the list of available Mobile SDK templates. You can copy
  repo paths from the output for use with the createwithtemplate command.

```

### Create React Native application from template
```
-> sf mobilesdk reactnative createwithtemplate --help
create a React Native mobile application from a template

USAGE
  $ sf mobilesdk reactnative createwithtemplate -p <value> -r <value> -n <value> -k <value> -o <value>
    [-d <value>]

FLAGS
  -d, --outputdir=<value>        output directory (leave empty for current
                                 directory)
  -k, --packagename=<value>      (required) app package identifier (e.g.
                                 com.mycompany.myapp)
  -n, --appname=<value>          (required) application name
  -o, --organization=<value>     (required) organization name (your
                                 company's/organization's name)
  -p, --platform=<value>         (required) comma-separated list of platforms
                                 (ios, android)
  -r, --templaterepouri=<value>  (required) template repo URI or Mobile SDK
                                 template name

DESCRIPTION
  create a React Native mobile application from a template

  This command initiates creation of a new app based on the Mobile SDK template
  that you specify. The template can be a specialized app for your app type that
  Mobile SDK provides, or your own custom app that you've configured to use as a
  template. See https://developer.salesforce.com/docs/atlas.en-us.mobile_sdk.met
  a/mobile_sdk/ios_new_project_template.htm for information on custom templates.

```

### Check store or syncs config
```
-> sf mobilesdk reactnative checkconfig --help
validate store or syncs configuration

USAGE
  $ sf mobilesdk reactnative checkconfig -p <value> -t <value>

FLAGS
  -p, --configpath=<value>  (required) path to store or syncs config to validate
  -t, --configtype=<value>  (required) type of config to validate (store or
                            syncs)

DESCRIPTION
  validate store or syncs configuration

  This command checks whether the given store or syncs configuration is valid
  according to its JSON schema.

```

