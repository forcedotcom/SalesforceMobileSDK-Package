# SalesforceMobileSDK-Package
Repo for forceios/forcedroid/forcehybrid and the sfdx plugin.

## To get started do the following from the root directory
``` shell
node ./install.js
```

## To run forceios do
./ios/forceios.js

## To run forcedroid do
./android/forcedroid.js

## To run forcehybrid do
./android/forcehybrid.js

## To run forcereact do
./android/forcereact.js

## To load the sfdx plugin from source do
sfdx plugins:link sfdx

## To run the sfdx plugin do
sfdx mobilesdk:ios --help 
sfdx mobilesdk:android --help 
sfdx mobilesdk:hybrid --help 
sfdx mobilesdk:reactnative --help

## To test forceios, forcedroid, forcehybrid, forcereact or the sfdx plugin do
./test/test_force.js

## To npm pack forceios, forcedroid, forcehybrid, forcereact or the sfx plugin do
./pack/pack.js
