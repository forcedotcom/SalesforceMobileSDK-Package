# Salesforce Mobile SDK for Android Package

The **forcedroid** npm package allows users to create Android mobile applications to interface with the [Salesforce Platform](http://www.salesforce.com/platform/overview/), leveraging the [Salesforce Mobile SDK for Android](https://github.com/forcedotcom/SalesforceMobileSDK-Android).

## Getting Started

If you're new to mobile development, or the force.com platform, you may want to start at the [Mobile SDK landing page](http://wiki.developerforce.com/page/Mobile_SDK).  This page offers a variety of resources to help you determine the best technology path for creating your app, as well as many guides and blog posts detailing how to work with the Mobile SDK.

But assuming you're all read up, here's how to get started with the **forcedroid** package to create the starting point for your mobile application.

## Install the forcedroid Package

Because forcedroid is a command-line utility, we recommend installing it globally, so that it's easily accessible on your path:

        sudo npm install forcedroid -g

You're of course welcome to install it locally as well:

        npm install forcedroid

In this case, you can access the forcedroid app at `[Install Directory]/node_modules/.bin/forcedroid`.

## Using forcedroid

For the rest of this document, we'll assume that `forcedroid` is on your path.

Typing `forcedroid` with no arguments gives you a breakdown of the usage:

```
-> forcedroid
forcedroid: Tool for building an Android native mobile application using Salesforce Mobile SDK

Usage:

# Create an Android native mobile application
forcedroid create
    --apptype=Application Type (native, native_kotlin)
    --appname=Application Name
    --packagename=App Package Identifier (e.g. com.mycompany.myapp)
    --organization=Organization Name (Your company's/organization's name)
    [--outputdir=Output Directory (Leave empty for current directory)]

 OR 

# Create an Android native mobile application from a template
forcedroid createWithTemplate
    --templaterepouri=Template repo URI
    --appname=Application Name
    --packagename=App Package Identifier (e.g. com.mycompany.myapp)
    --organization=Organization Name (Your company's/organization's name)
    [--outputdir=Output Directory (Leave empty for current directory)]

 OR 

# Print version of Mobile SDK
forcedroid version

 OR 

forcedroid
```

**Note:** You can specify any or all of the arguments as command line options as specified in the usage.  If you run `forcedroid create` with missing arguments, it prompts you for each missing option interactively.

Once the creation script completes, you'll have a fully functioning basic application of the type you specified.  The new application has an Android Studio workspace that you can peruse, run, and debug.

### forcedroid create options

**App Type:** The type of application you wish to develop:

- **native** — A fully native Android application
- **native\_kotlin** — A fully native Android application written in Kotlin

**App Name:** The name of your application

**App Package Identifier:** The Java package identifier for your app (e.g. `com.acme.mobile_apps`).  **Note:** Your package name must be formatted as a [valid Java package name](http://docs.oracle.com/javase/tutorial/java/package/namingpkgs.html), or you will receive an error.

**Organization:** The name of your company or organization.  For example, `Acme Widgets, Inc.`

**Output Directory:** \( *Optional* \) The folder where you want your app to be created.

## More information

- After your app has been created, you will see some on-screen instructions for next steps, such as building and running your app, importing the project into Android Studio, and changing the default Connected App (sample) configuration values to match your own Connected App.

- You can find the `forceios` npm package [here](https://npmjs.org/package/forceios), to develop Mobile SDK apps for iOS.

- You can find the `forcehybrid` npm package [here](https://npmjs.org/package/forcehybrid), to develop Mobile SDK hybrid apps for iOS and Android.

- You can find the `forcereact` npm package [here](https://npmjs.org/package/forcereact), to develop Mobile SDK react native apps for iOS and Android.

- The Salesforce Mobile SDK for iOS source repository lives [here](https://github.com/forcedotcom/SalesforceMobileSDK-iOS).

- The Salesforce Mobile SDK for Android source repository lives [here](https://github.com/forcedotcom/SalesforceMobileSDK-Android).

- See [our developerforce site](http://wiki.developerforce.com/page/Mobile_SDK) for more information about how you can leverage the Salesforce Mobile SDK with the force.com platform.

- If you would like to make suggestions, have questions, or encounter any issues, we'd love to hear from you.  Post any feedback you have on our [Google+ Community](https://plus.google.com/communities/114225252149514546445).
