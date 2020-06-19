[![CircleCI](https://circleci.com/gh/forcedotcom/SalesforceMobileSDK-Package/tree/dev.svg?style=svg)](https://circleci.com/gh/forcedotcom/SalesforceMobileSDK-Package/tree/dev)

# SalesforceMobileSDK-Package
Repo for forceios/forcedroid/forcehybrid/forcereact and the sfdx plugin.

## To get started do the following from the root directory
``` shell
node ./install.js
```

## To run forceios do
```shell
./ios/forceios.js
```

## To run forcedroid do
```shell
./android/forcedroid.js
```

## To run forcehybrid do
```shell
./hybrid/forcehybrid.js
```

## To run forcereact do
```shell
./react/forcereact.js
```

## To load the sfdx plugin from source do
```shell
sfdx plugins:link sfdx
```

## To run the sfdx plugin do
```shell
sfdx mobilesdk:ios --help 
sfdx mobilesdk:android --help 
sfdx mobilesdk:hybrid --help 
sfdx mobilesdk:reactnative --help
```

## To test forceios, forcedroid, forcehybrid, forcereact or the sfdx plugin do
```shell
./test/test_force.js
```

## To npm pack forceios, forcedroid, forcehybrid, forcereact or the sfx plugin do
```shell
./pack/pack.js
```

## To do a full release
```
./release/release.js
```
