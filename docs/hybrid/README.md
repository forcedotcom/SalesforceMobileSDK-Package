# Hybrid App Creation (`forcehybrid`)

This document describes how the `forcehybrid` CLI tool creates Salesforce hybrid mobile applications using Apache Cordova.

## Entry Point

The CLI entry point is `hybrid/forcehybrid.js`:

```javascript
var SDK = require('./shared/constants'),
    createHelper = require('./shared/createHelper');

createHelper.createApp(SDK.forceclis.forcehybrid);
```

## Supported Commands

| Command | Description |
|---------|-------------|
| `create` | Create app from a standard template (HybridLocalTemplate or HybridRemoteTemplate) |
| `createwithtemplate` | Create app from a custom template |
| `version` | Print SDK version |
| `listtemplates` | List available hybrid templates |
| `describetemplate` | Show details for a specific template |
| `checkconfig` | Validate SmartStore/MobileSync config JSON |

## Distribution

`forcehybrid` is packaged and published to [npmjs.org](https://www.npmjs.com/package/forcehybrid) with every SDK release. Developers install it globally:

```bash
npm install -g forcehybrid
```

The packaging step is run by `pack/pack.js` in this repo, and the publish is performed manually as part of the release process driven by `release/release.js`.

## Version Configuration (`shared/constants.js`)

All version pins live in `shared/constants.js`. This is the single source of truth:

```javascript
var VERSION = '14.0.0';

module.exports = {
    version: VERSION,

    tools: {
        cordova: {
            checkCmd: 'cordova -v',
            pluginRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#dev',    // dev
            minVersion: '13.0.0',
//             pluginRepoUri: 'salesforce-mobilesdk-cordova-plugin@v' + VERSION, // GA
            platformVersion: {
                ios: '7.1.1',
                android: '15.0.0'
            }
        },
        // ...
    },

    templatesRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#dev',    // dev
//     templatesRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#v' + VERSION, // GA
};
```

### Switching Between Dev and GA

Each URI has two lines -- one for dev (pointing to the `#dev` branch) and one for GA (pointing to a version tag). To switch modes, comment out one and uncomment the other:

- **Dev mode** (default): Uses `#dev` branch of CordovaPlugin and Templates repos.
- **GA mode**: Uses tagged versions like `salesforce-mobilesdk-cordova-plugin@v14.0.0` and `#v14.0.0`.

## `createHybridApp()` Step-by-Step Workflow

Located in `shared/createHelper.js`, this function orchestrates the full hybrid app creation:

### 1. Check Prerequisites

The CLI verifies minimum tool versions before proceeding:

| Tool | Minimum Version |
|------|----------------|
| git | 2.13 |
| node | 22 |
| npm | 10 |
| cordova | 13.0.0 |
| sf | 2.0.0 |

### 2. Create Bare Cordova Project

```bash
cordova create "<projectDir>" <packagename> <appname>
```

### 3. Install shelljs

```bash
npm install shelljs@0.8.5
```

Required by the Android post-install hook (`postinstall-android.js`) that runs during plugin installation.

### 4. Add Platforms

For each platform in the comma-separated list (ios, android, or both):

```bash
cordova platform add ios@7.1.1
cordova platform add android@15.0.0
```

### 5. Install CordovaPlugin

```bash
cordova plugin add https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#dev --force
```

This triggers `plugin.xml` evaluation and runs both post-install hooks (`postinstall-ios.js` and `postinstall-android.js`) in the CordovaPlugin repo.

### 6. Remove Default `www/` Directory

The default Cordova app content is deleted.

### 7. Copy Template into `www/`

The selected template (e.g., `HybridLocalTemplate` or `HybridRemoteTemplate`) is copied into the `www/` directory.

### 8. Run Template Prepare

Calls `prepareTemplate(config, webDir)` which executes the `template.js` `prepare()` function from the template directory. This handles variable substitution and file renaming specific to the template.

### 9. Remove `template.js` from `www/`

Cleanup step -- `template.js` is only needed during generation.

### 10. Server-Side Setup (Hybrid Remote Only)

If the template's `www/` contains a `server` subdirectory:

1. Run `sf force project create -n server` to create a Salesforce DX project
2. Copy per-platform `cordova.js` from `platforms/<platform>/platform_www/` into the DX project as static resources
3. Merge template server files into the DX project
4. Remove the `server` directory from `www/`

### 11. Cordova Prepare

```bash
cordova prepare
```

Generates final platform-specific projects. On iOS this triggers CocoaPods installation; on Android it triggers Gradle sync.

### 12. Remove CordovaLib from iOS Workspace

`removeCordovaLibFromWorkspace()` performs regex surgery on `project.pbxproj` to remove the `CordovaLib.xcodeproj` subproject reference and all associated Xcode entries:

- PBXFileReference for CordovaLib.xcodeproj
- PBXContainerItemProxy entries referencing CordovaLib
- PBXReferenceProxy entries linked to deleted proxies
- Products group referencing CordovaLib
- PBXTargetDependency entries for CordovaLib
- References from dependency arrays
- projectReferences array entries
- Empty projectReferences property cleanup
- Trailing comma and blank line cleanup

This fixes a "Generic Xcode Archive" failure caused by CordovaLib appearing as a subproject.

### 13. Android API 35 Theme

`createAndroidAPI35Theme()` writes a theme override file at:

```
platforms/android/app/src/main/res/values-v35/themes.xml
```

This fixes a white-status-bar-with-white-icons issue on Android API 35+.

### 14. Print Next Steps

Instructs the user to open:
- `platforms/ios/<appname>.xcworkspace` in Xcode
- `platforms/android` in Android Studio

## Override Flags

For testing and development, these flags override default URIs:

### `--pluginrepouri`

Override the CordovaPlugin repo URI. Useful for testing with a fork or branch:

```bash
forcehybrid create --pluginrepouri=https://github.com/myuser/SalesforceMobileSDK-CordovaPlugin#my-branch ...
```

### `--sdkdependencies`

Override SDK dependency URLs in templates (for testing with custom SDK branches):

```bash
forcehybrid create --sdkdependencies='{"ios":"https://github.com/myuser/SalesforceMobileSDK-iOS#my-branch","android":"https://github.com/myuser/SalesforceMobileSDK-Android#my-branch"}' ...
```

## Integration Testing (`test/test_force.js`)

The `test_force.js` script generates and builds hybrid apps to verify the full workflow:

```bash
cd test

# Test hybrid app creation with default settings
node test_force.js --cli=forcehybrid

# Test with a custom CordovaPlugin repo
node test_force.js --cli=forcehybrid --pluginrepouri=https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#my-branch

# Test with custom SDK dependencies
node test_force.js --cli=forcehybrid --sdkdependencies='{"ios":"...","android":"..."}'
```

This creates both `hybrid_local` and `hybrid_remote` apps for all supported platforms and verifies they build successfully.
