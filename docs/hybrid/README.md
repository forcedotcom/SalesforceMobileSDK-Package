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

Platform versions and source configuration live in `shared/constants.js`. This
abbreviated example shows the Mobile SDK 14.1 development configuration. Consult
that file for the complete configuration, including the immutable iOS development
Plugin source:

```javascript
var VERSION = '14.1.0';

module.exports = {
    version: VERSION,

    tools: {
        cordova: {
            checkCmd: 'cordova -v',
            pluginRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#dev141',    // dev
            minVersion: '13.0.0',
//             pluginRepoUri: 'salesforce-mobilesdk-cordova-plugin@v' + VERSION, // GA
            platformVersion: {
                ios: '8.2.0',
                android: '15.1.0'
            }
        },
        // ...
    },

    templatesRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#dev141',    // dev
//     templatesRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#v' + VERSION, // GA
};
```

### Switching Between Dev and GA

Use `setversion.sh` to update the SDK version and toggle the configured development
and GA source lines; do not edit their comment markers by hand:

```bash
./setversion.sh -v 14.1.0 -d yes   # development build
./setversion.sh -v 14.1.0 -d no    # GA build
```

The script uncomments the matching `*RepoUri` lines, then comments out the sources
that do not apply:

- **Dev** (`-d yes`): comments out versioned sources containing `@v` or `#v`,
  leaving the configured development URIs active.
- **GA** (`-d no`): comments out development sources containing `#dev`, including
  `#dev141`, leaving the configured versioned sources active.

The script does not choose a development branch, change Cordova platform versions
or refresh the matched iOS development Plugin pin. Review those settings
separately when promoting an upgrade.

## Matched iOS Hybrid source promotion

For hybrid apps whose selected platforms include iOS, validate the Package CLI, plugin and Hybrid source as a matched set before promoting a Cordova upgrade on `dev` or a numbered development branch. When the selected development configuration pins the plugin to an immutable commit, its iOS pod declaration must select the matching Hybrid commit. Make both reviewed commits available through their declared upstream Git URLs and validate a fresh app without local source mappings. Publish Hybrid first, then the matching plugin, then Package. Squash or rebase changes require updating the dependent pins to the final upstream commit IDs and repeating that validation. Review-time local commits alone are not a publishable release set.

GA package selection and development configurations without matched pins retain the release tooling's existing source selection. Review and refresh the configured SDK version, branch selector and matched development pins in `shared/constants.js` for each upgrade or branch promotion; these pins are not carried automatically into another release.

## Cordova iOS upgrade validation

Use the [upgrade validation matrix](cordova-upgrade-validation.md) to record the source set and the coverage exercised.

On each Cordova iOS upgrade, check whether [apache/cordova-ios issue 1751](https://github.com/apache/cordova-ios/issues/1751) is fixed. CordovaPlugin's `tools/cordova-ios-podfile.js` compatibility hook is gated to exactly 8.2.0. If the issue remains, extend the version gate to the newly validated version. If it is fixed, remove the hook, its `plugin.xml` registrations and its tests.

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

When the selected hybrid platforms include iOS, the CLI also requires Node.js
22.9.0+ and CocoaPods 1.16.0+ before creating the Cordova app. Android-only hybrid
creation retains the general requirements above.

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
cordova platform add ios@8.2.0
cordova platform add android@15.1.0
```

### 5. Install CordovaPlugin

The CLI resolves the Plugin URI before installation, then runs:

```bash
cordova plugin add "<resolved-plugin-uri>" --force
```

An explicit `--pluginrepouri` takes precedence. For SDK 14.1.0 on `dev141`, a
selection that includes iOS uses the configured immutable development Plugin
source. Android-only selections use the configured Plugin source. Other SDK
versions, development branches and GA configurations retain their source
selection. The selected Plugin must be compatible with both requested platforms.

This triggers `plugin.xml` evaluation and runs both post-install hooks (`postinstall-ios.js` and `postinstall-android.js`) in the CordovaPlugin repo.

**iOS:** `postinstall-ios.js` copies `AppDelegate.swift` from the plugin into the generated app at `platforms/ios/App/Plugins/com.salesforce/AppDelegate.swift` and redirects the Xcode project reference to it. This gives the generated app a customizable app delegate with `SalesforceHybridSDKManager` initialization already wired up.

**Android:** `postinstall-android.js` injects a `MainApplication.kt` into the generated app at `platforms/android/app/src/main/java/<packagename>/MainApplication.kt`. It reads the app's `applicationId` from `app/build.gradle`, creates the source directory, copies and configures the file with the correct package name, and updates `android:name` in `AndroidManifest.xml` to point to the new class. The generated `MainApplication.kt` calls `SalesforceHybridSDKManager.initHybrid()` and includes commented-out hooks for IDP login and push notifications that developers can enable as needed.

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
