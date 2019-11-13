# Salesforce Mobile SDK store and syncs config validator

The **forcecheckconfig** npm package allows users to validate store and syncs config files.

## Install the forcecheckconfig Package

Because forcecheckconfig is a command-line utility, we recommend installing it globally, so that it's easily accessible on your path:

        sudo npm install forcecheckconfig -g

You're of course welcome to install it locally as well:

        npm install forcecheckconfig

In local installations, you can access the forceios app at `[Install Directory]/node_modules/.bin/forcecheckconfig`.

## Using forcecheckconfig

For the rest of this document, we'll assume that `forcecheckconfig` is on your path.

Typing `forcecheckconfig --usage` gives you a breakdown of the usage:

```
-> forcecheckconfig
Usage:

  forcecheckconfig --usage

 OR 

  forcecheckconfig --path=configPath --type=configType
  Where:
  - configPath is the path to a store config or a syncs config
  - configType is: store or syncs
  
```

## Checking a store config file
Simply type `forcecheckconfig --path=userstore.json --type=store`

## Checking a syncs config file
Simply type `forcecheckconfig --path=usersyncs.json --type=syncs`


## More information

- The Salesforce Mobile SDK for iOS source repository lives [here](https://github.com/forcedotcom/SalesforceMobileSDK-iOS).

- The Salesforce Mobile SDK for Android source repository lives [here](https://github.com/forcedotcom/SalesforceMobileSDK-Android).

- See [our developerforce site](http://wiki.developerforce.com/page/Mobile_SDK) for more information about how you can leverage Salesforce Mobile SDK with the force.com platform.

- If you would like to make suggestions, have questions, or encounter any issues, we'd love to hear from you.  Post any feedback you have on [Salesforce StackExchange](https://salesforce.stackexchange.com/questions/tagged/mobilesdk).
