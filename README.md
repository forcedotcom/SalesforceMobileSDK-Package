[![CircleCI](https://circleci.com/gh/forcedotcom/SalesforceMobileSDK-Package/tree/dev.svg?style=svg)](https://circleci.com/gh/forcedotcom/SalesforceMobileSDK-Package/tree/dev)

# SalesforceMobileSDK-Package
Repo for forceios/forcedroid/forcehybrid/forcereact and the Salesforce CLI plugin.

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

## To load the sf plugin from source do
```shell
sf plugins link sfdx
```

## To run the Salesforce CLI plugin do
```shell
sf mobilesdk ios --help 
sf mobilesdk android --help 
sf mobilesdk hybrid --help 
sf mobilesdk reactnative --help
```

## To test forceios, forcedroid, forcehybrid, forcereact or the Salesforce CLI plugin do
```shell
./test/test_force.js
```

## To npm pack forceios, forcedroid, forcehybrid, forcereact or the Salesforce CLI plugin do
```shell
./pack/pack.js
```

## To do a full release
```
./release/release.js
```
