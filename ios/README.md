# Salesforce Mobile SDK for iOS Package

The **forceios** npm package allows users to create iOS mobile applications to interface with the [Salesforce Platform](http://www.salesforce.com/platform/overview/), leveraging [Salesforce Mobile SDK for iOS](https://github.com/forcedotcom/SalesforceMobileSDK-iOS).

## Getting Started

If you're new to mobile development or the force.com platform, you may want to start at the [Mobile SDK landing page](http://wiki.developerforce.com/page/Mobile_SDK).  This page offers a variety of resources to help you determine the best technology path for creating your app, as well as many guides and blog posts detailing how to work with the Mobile SDK.

But assuming you're all read up, here's how to get started with the **forceios** package to create the starting point for your mobile application.

## Install the forceios Package

Because forceios is a command-line utility, we recommend installing it globally, so that it's easily accessible on your path:

        sudo npm install forceios -g

You're of course welcome to install it locally as well:

        npm install forceios

In local installations, you can access the forceios app at `[Install Directory]/node_modules/.bin/forceios`.

## Using forceios

For the rest of this document, we'll assume that `forceios` is on your path.

Typing `forceios` with no arguments gives you a breakdown of the usage:

```
-> forceios
forceios: Tool for building an iOS native mobile application using Salesforce Mobile SDK

Usage:

# create an iOS native mobile application
forceios create
    [--apptype=application type (native_swift or native, leave empty for native_swift)]
    --appname=application name
    --packagename=app package identifier (e.g. com.mycompany.myapp)
    --organization=organization name (your company's/organization's name)
    [--outputdir=output directory (leave empty for current directory)]

 OR 

# create an iOS native mobile application from a template
forceios createwithtemplate
    --templaterepouri=template repo URI or Mobile SDK template name
    --appname=application name
    --packagename=app package identifier (e.g. com.mycompany.myapp)
    --organization=organization name (your company's/organization's name)
    [--outputdir=output directory (leave empty for current directory)]

 OR 

# list available Mobile SDK templates
forceios listtemplates

 OR 

# validate store or syncs configuration
forceios checkconfig
    --configpath=path to store or syncs config to validate
    --configtype=type of config to validate (store or syncs)

 OR 

# show version of Mobile SDK
forceios version

 OR 

forceios
```

**Note:** You can specify any or all of the arguments as command line options as specified in the usage.  If you run `forceios create` with missing arguments, it prompts you for each missing option interactively.

Once the creation script completes, you'll have a fully functioning basic application of the type you specified.  The new application has an Xcode workspace that you can peruse, run, and debug.

### forceios create options

**App Type:** \( *Optional* \) The type of application you wish to develop:

- **native\_swift** (default) — A fully native iOS application written in Swift
- **native** — A fully native iOS application written in Objective C

**App Name:** The name of your application

**App Package Identifier:** An identifier for your company, similar to a Java package (e.g. `com.acme.MobileApps`).  This concatenates with the app name to form the unique identifier for your app in the App Store.

**Organization:** The name of your company or organization.  For example, `Acme Widgets, Inc.`

**Output Directory:** \( *Optional* \) The folder where you want your app to be created.

## More information

- After your app has been created, you will see some on-screen instructions for next steps, such as building and running your app, importing the project into XCode, and changing the default Connected App (sample) configuration values to match your own Connected App.

- You can find the `forcedroid` npm package [here](https://npmjs.org/package/forcedroid) to develop Mobile SDK apps for Android.

- You can find the `forcehybrid` npm package [here](https://npmjs.org/package/forcehybrid) to develop Mobile SDK hybrid apps for iOS and Android.

- You can find the `forcereact` npm package [here](https://npmjs.org/package/forcereact) to develop Mobile SDK react native apps for iOS and Android.

- The Salesforce Mobile SDK for iOS source repository lives [here](https://github.com/forcedotcom/SalesforceMobileSDK-iOS).

- The Salesforce Mobile SDK for Android source repository lives [here](https://github.com/forcedotcom/SalesforceMobileSDK-Android).

- See [our developerforce site](http://wiki.developerforce.com/page/Mobile_SDK) for more information about how you can leverage Salesforce Mobile SDK with the force.com platform.

- If you would like to make suggestions, have questions, or encounter any issues, we'd love to hear from you.  Post any feedback you have on [Salesforce StackExchange](https://salesforce.stackexchange.com/questions/tagged/mobilesdk).
