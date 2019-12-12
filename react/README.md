# Salesforce Mobile SDK for React Native Package

The **forcereact** npm package allows users to create React Native iOS and Android mobile applications to interface with the [Salesforce Platform](http://www.salesforce.com/platform/overview/), leveraging [Salesforce Mobile SDK for iOS](https://github.com/forcedotcom/SalesforceMobileSDK-iOS) and [Salesforce Mobile SDK for Android](https://github.com/forcedotcom/SalesforceMobileSDK-Android).

## Getting Started

If you're new to mobile development or the force.com platform, you may want to start at the [Mobile SDK landing page](http://wiki.developerforce.com/page/Mobile_SDK).  This page offers a variety of resources to help you determine the best technology path for creating your app, as well as many guides and blog posts detailing how to work with Mobile SDK.

But assuming you're all read up, here's how to get started with the **forcereact** package to create the starting point for your mobile application.

## Install the forcereact Package

Because forcereact is a command-line utility, we recommend installing it globally so that it's easily accessible on your path:

        sudo npm install forcereact -g

You're of course welcome to install it locally as well:

        npm install forcereact

In local installations, you can access the forcereact app at `[Install Directory]/node_modules/.bin/forcereact`.

## Using forcereact

For the rest of this document, we'll assume that `forcereact` is on your path.

Typing `forcereact` with no arguments gives you a breakdown of the usage:

```
-> forcereact
forcereact: Tool for building a React Native mobile application using Salesforce Mobile SDK

Usage:

# create a React Native mobile application
forcereact create
    --platform=comma-separated list of platforms (ios, android)
    --appname=application name
    --packagename=app package identifier (e.g. com.mycompany.myapp)
    --organization=organization name (your company's/organization's name)
    [--outputdir=output directory (leave empty for current directory)]

 OR 

# create a React Native mobile application from a template
forcereact createwithtemplate
    --platform=comma-separated list of platforms (ios, android)
    --templaterepouri=template repo URI or Mobile SDK template name
    --appname=application name
    --packagename=app package identifier (e.g. com.mycompany.myapp)
    --organization=organization name (your company's/organization's name)
    [--outputdir=output directory (leave empty for current directory)]

 OR 

# list available Mobile SDK templates
forcereact listtemplates

 OR 

# validate store or syncs configuration
forcereact checkconfig
    --configpath=path to store or syncs config to validate
    --configtype=type of config to validate (store or syncs)

 OR 

# show version of Mobile SDK
forcereact version

 OR 

forcereact
```

**Note:** You can specify any or all of the arguments as command line options as specified in the usage.  If you run `forcereact create` with missing arguments, it prompts you for each missing option interactively.

Once the creation script completes, you'll have a fully functioning basic application of the type you specified.  The new application has an Android Studio and/or an XCode workspace that you can peruse, run, and debug.

### forcedreact create options

**Platform:** Comma-separated list of the mobile platforms that you want to support: iOS, Android, or both

**App Name:** The name of your application

**App Package Identifier:** The Java package identifier for your app (e.g. `com.acme.mobile_apps`).  **Note:** Your package name must be formatted as a [valid Java package name](http://docs.oracle.com/javase/tutorial/java/package/namingpkgs.html), or you will receive an error.

**Organization:** The name of your company or organization.  For example, `Acme Widgets, Inc.`

**Output Directory:** \( *Optional* \) The folder where you want your app to be created.

### forcedreact createWithTemplate options

**Platform:** Comma-separated list of the mobile platforms that you want to support: iOS, Android, or both

**Template Repository:** The URI of the GitHub repo containing your template

**App Name:** The name of your application

**App Package Identifier:** The Java package identifier for your app (e.g. `com.acme.mobile_apps`).  **Note:** Your package name must be formatted as a [valid Java package name](http://docs.oracle.com/javase/tutorial/java/package/namingpkgs.html), or you will receive an error.

**Organization:** The name of your company or organization.  For example, `Acme Widgets, Inc.`

**Output Directory:** \( *Optional* \) The folder where you want your app to be created.

## More information

- After your app has been created, you will see some on-screen instructions for next steps, such as building and running your app, importing the project into XCode or Android Studio, and changing the default Connected App (sample) configuration values to match your own Connected App.

- You can find the `forceios` npm package [here](https://npmjs.org/package/forcedroid) to develop Mobile SDK apps for iOS.

- You can find the `forcedroid` npm package [here](https://npmjs.org/package/forcedroid) to develop Mobile SDK apps for Android.

- You can find the `forcehybrid` npm package [here](https://npmjs.org/package/forcehybrid) to develop Mobile SDK react native apps for iOS and Android.

- The Salesforce Mobile SDK for iOS source repository lives [here](https://github.com/forcedotcom/SalesforceMobileSDK-iOS).

- The Salesforce Mobile SDK for Android source repository lives [here](https://github.com/forcedotcom/SalesforceMobileSDK-Android).

- See [our developerforce site](http://wiki.developerforce.com/page/Mobile_SDK) for more information about how you can leverage Salesforce Mobile SDK with the force.com platform.

- If you would like to make suggestions, have questions, or encounter any issues, we'd love to hear from you.  Post any feedback you have on [Salesforce StackExchange](https://salesforce.stackexchange.com/questions/tagged/mobilesdk).
