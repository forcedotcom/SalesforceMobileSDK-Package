[![Build](https://github.com/forcedotcom/SalesforceMobileSDK-Package/actions/workflows/nightly.yaml/badge.svg)](https://github.com/forcedotcom/SalesforceMobileSDK-Package/actions/workflows/nightly.yaml)

# Salesforce Mobile SDK Package

The **distribution and tooling hub** for the Salesforce Mobile SDK. This repository provides command-line tools, a Salesforce CLI plugin, testing framework, and release automation for creating and maintaining Salesforce mobile applications.

## Overview

This repository serves three primary functions:

1. **CLI Tools** - Standalone command-line tools for creating mobile apps
2. **SFDX Plugin** - Salesforce CLI integration for Mobile SDK
3. **SDK Infrastructure** - Testing, packaging, and release automation

## CLI Tools

The following NPM packages enable developers to create Salesforce mobile applications:

| Tool | Package | Purpose |
|------|---------|---------|
| **forceios** | [@npmjs](https://www.npmjs.com/package/forceios) | Create iOS native apps (Swift or Objective-C) |
| **forcedroid** | [@npmjs](https://www.npmjs.com/package/forcedroid) | Create Android native apps (Kotlin or Java) |
| **forcehybrid** | [@npmjs](https://www.npmjs.com/package/forcehybrid) | Create hybrid apps using Cordova (iOS and/or Android) |
| **forcereact** | [@npmjs](https://www.npmjs.com/package/forcereact) | Create React Native apps (iOS and/or Android) |

### Installation

Install globally via NPM:

```bash
npm install -g forceios forcedroid forcehybrid forcereact
```

### Usage

Each tool supports multiple commands:

```bash
# Create an app from the standard template
forceios create --appname=MyApp --packagename=com.mycompany.myapp --organization="My Company"

# List available templates
forceios listtemplates

# Create an app from a specific template
forceios createwithtemplate --templaterepouri=iOSNativeSwiftTemplate --appname=MyApp ...

# Show SDK version
forceios version

# Validate SmartStore/MobileSync config
forceios checkconfig --configpath=config.json --configtype=store
```

Replace `forceios` with `forcedroid`, `forcehybrid`, or `forcereact` for other platforms.

### OAuth Configuration

Optionally provide External Client App credentials to auto-configure OAuth:

```bash
forceios create \
  --appname=MyApp \
  --packagename=com.mycompany.myapp \
  --organization="My Company" \
  --consumerkey=<consumer-key> \
  --callbackurl=sfdc://oauth/success \
  --loginserver=https://login.salesforce.com
```

### Custom Templates

Use custom templates from a git repository or local path:

```bash
# From git URL with optional #branch
forceios createwithtemplate \
  --templatesource=https://github.com/myorg/my-templates#main \
  --template=MyTemplate \
  --appname=MyApp ...

# From local path
forceios createwithtemplate \
  --templatesource=/path/to/templates \
  --template=MyTemplate \
  --appname=MyApp ...
```

## Salesforce CLI Plugin

The `sfdx-mobilesdk-plugin` integrates Mobile SDK commands into the Salesforce CLI.

### Installation

```bash
sf plugins install sfdx-mobilesdk-plugin
```

### Usage

The plugin provides `sf mobilesdk` commands that mirror the standalone CLI tools:

```bash
# iOS commands
sf mobilesdk ios create --appname=MyApp --packagename=com.mycompany.myapp ...
sf mobilesdk ios listtemplates
sf mobilesdk ios createwithtemplate --templaterepouri=<template> ...

# Android commands
sf mobilesdk android create --appname=MyApp ...
sf mobilesdk android listtemplates

# Hybrid commands
sf mobilesdk hybrid create --platform=ios,android --appname=MyApp ...
sf mobilesdk hybrid listtemplates

# React Native commands
sf mobilesdk reactnative create --platform=ios,android --appname=MyApp ...
sf mobilesdk reactnative listtemplates
```

For detailed plugin documentation, see [sfdx/README.md](sfdx/README.md).

## Development

### Prerequisites

- **Node.js**: 22 or higher
- **npm**: 10 or higher
- **Git**: 2.13 or higher

### Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/forcedotcom/SalesforceMobileSDK-Package.git
cd SalesforceMobileSDK-Package
npm install
```

### Running from Source

#### CLI Tools

```bash
# Run forceios from source
./ios/forceios.js create --appname=MyApp ...

# Run forcedroid from source
./android/forcedroid.js create --appname=MyApp ...

# Run forcehybrid from source
./hybrid/forcehybrid.js create --appname=MyApp ...

# Run forcereact from source
./react/forcereact.js create --appname=MyApp ...
```

#### SFDX Plugin

```bash
# Generate OCLIF command classes (required after changes to shared/constants.js)
cd sfdx
node generate_oclif.js

# Link plugin for local development
sf plugins link sfdx

# Use the plugin
sf mobilesdk ios --help
sf mobilesdk android --help
sf mobilesdk hybrid --help
sf mobilesdk reactnative --help
```

## Testing

### Unit Tests

Run Jest tests for shared utilities:

```bash
npm test
```

Tests are located in `unittests/` and cover:
- Utility functions
- Argument parsing
- Template helpers
- Config validation

### Integration Tests

The `test/test_force.js` script performs comprehensive app generation testing:

```bash
# Test all CLI tools
./test/test_force.js --cli=forceios,forcedroid,forcehybrid,forcereact

# Test specific tools
./test/test_force.js --cli=forceios
./test/test_force.js --cli=forcedroid

# Test with SFDX plugin
./test/test_force.js --cli=forceios --use-sfdx

# Override plugin repo (for testing unreleased versions)
./test/test_force.js --cli=forcehybrid --pluginrepouri=https://github.com/user/SalesforceMobileSDK-CordovaPlugin#branch

# Override SDK dependencies (for testing custom SDK branches)
./test/test_force.js --cli=forceios --sdkdependencies='{"ios":"https://github.com/user/SalesforceMobileSDK-iOS#branch"}'
```

### What Gets Tested

The integration tests verify:
- ✅ App generation succeeds for all app types
- ✅ All required files are created
- ✅ Project structure is correct
- ✅ OAuth configuration is applied (if provided)
- ✅ Both CLI and SFDX plugin work

**App Types Tested:**
- **iOS**: `native` (Objective-C), `native_swift` (Swift)
- **Android**: `native` (Java), `native_kotlin` (Kotlin)
- **Hybrid**: `hybrid_local`, `hybrid_remote`
- **React Native**: `react_native`, `react_native_typescript`

## Packaging

Create distributable NPM packages:

```bash
# Package all CLI tools
./pack/pack.js --cli=forceios,forcedroid,forcehybrid,forcereact

# Package specific tools
./pack/pack.js --cli=forceios

# Package SFDX plugin
./pack/pack.js --sfdx-plugin
```

Output: `<name>-<version>.tgz` files in the current directory.

## Release Process

The `release/release.js` script orchestrates releases across all 10 Mobile SDK repositories:

1. **SalesforceMobileSDK-Shared**
2. **SalesforceMobileSDK-Android**
3. **SalesforceMobileSDK-iOS**
4. **SalesforceMobileSDK-iOS-Hybrid**
5. **SalesforceMobileSDK-iOS-Specs**
6. **SalesforceMobileSDK-iOS-SPM**
7. **SalesforceMobileSDK-CordovaPlugin**
8. **SalesforceMobileSDK-ReactNative**
9. **SalesforceMobileSDK-Templates**
10. **SalesforceMobileSDK-Package** (this repo)

### Running a Release

```bash
./release/release.js
```

The script will interactively prompt for:
- Work directory
- GitHub organization
- Branch names (master/dev/gh-pages)
- Version being released
- Next version
- Android version code

### What the Release Script Does

For each repository:
1. Clone or pull latest code
2. Merge dev → master (unless patch release)
3. Update version numbers in source files
4. Generate documentation (Android Javadoc, iOS docs)
5. Build XCFrameworks (iOS-SPM)
6. Update podspecs (iOS-Specs)
7. Run update scripts (CordovaPlugin)
8. Commit and tag release
9. Push to GitHub
10. Update dev branch for next version

### Post-Release Steps

After `release.js` completes, follow the instructions to:

1. **Test the packages**:
   ```bash
   cd <work-dir>/SalesforceMobileSDK-Package
   ./test/test_force.js --cli=forceios,forcedroid,forcereact,forcehybrid --pluginrepouri=<github-url>
   ```

2. **Publish to NPM**:
   ```bash
   npm publish forceios-<version>.tgz
   npm publish forcedroid-<version>.tgz
   npm publish forcehybrid-<version>.tgz
   npm publish forcereact-<version>.tgz
   npm publish sfdx-mobilesdk-plugin-<version>.tgz
   npm publish salesforce-mobilesdk-cordova-plugin-<version>.tgz
   ```

3. **Publish to Maven Central** (Android):
   ```bash
   cd <work-dir>/SalesforceMobileSDK-Android
   ./publish/publish.sh
   ```

## Repository Structure

```
SalesforceMobileSDK-Package/
├── ios/                      # forceios CLI tool
│   ├── forceios.js           # Entry point
│   └── package.json          # NPM package definition
├── android/                  # forcedroid CLI tool
│   ├── forcedroid.js         # Entry point
│   └── package.json
├── hybrid/                   # forcehybrid CLI tool
│   ├── forcehybrid.js        # Entry point
│   └── package.json
├── react/                    # forcereact CLI tool
│   ├── forcereact.js         # Entry point
│   └── package.json
├── sfdx/                     # SFDX plugin (sf mobilesdk)
│   ├── generate_oclif.js     # Generates OCLIF command classes
│   ├── package.json          # Plugin package definition
│   └── README.md             # Plugin documentation
├── shared/                   # Shared utilities (symlinked into tools)
│   ├── constants.js          # SDK version, tool requirements
│   ├── createHelper.js       # App creation logic
│   ├── templateHelper.js     # Template handling
│   ├── configHelper.js       # CLI argument parsing
│   └── utils.js              # File operations, git, shell
├── test/                     # Testing framework
│   └── test_force.js         # Integration tests
├── release/                  # Release automation
│   ├── release.js            # Main release orchestrator
│   └── common.js             # Release utilities
├── pack/                     # NPM packaging
│   └── pack.js               # Creates .tgz packages
├── unittests/                # Unit tests
│   └── *.test.js             # Jest tests
└── package.json              # Root package definition
```

## How It Works

### CLI Architecture

All CLI tools share common code via the `shared/` directory:

1. **Entry Points** (`ios/forceios.js`, etc.): Minimal wrappers that call `createHelper.createApp()`
2. **Constants** (`shared/constants.js`): Defines SDK version, tool requirements, CLI configurations
3. **Create Helper** (`shared/createHelper.js`): Main app creation logic for native and hybrid workflows
4. **Template Helper** (`shared/templateHelper.js`): Template discovery, listing, and execution

### Template System

Templates are fetched from the [SalesforceMobileSDK-Templates](https://github.com/forcedotcom/SalesforceMobileSDK-Templates) repository.

Each template has:
- `template.js` - Defines app type and prepare function
- `template.json` - Optional schema for custom properties
- Template files - Boilerplate code with placeholders

When creating an app:
1. Clone template repository (or use local path)
2. Copy template files to project directory
3. Run `template.js` prepare function (substitutes values, renames files)
4. For hybrid apps: Use Cordova CLI to create project structure
5. Print next steps for opening in IDE

## Version Management

The SDK version is defined in `shared/constants.js`:

```javascript
var VERSION = '14.0.0';
```

This version:
- Appears in all CLI tools (`forceios version`)
- Gets embedded in generated apps
- Determines which template repo tags to use
- Gets updated during releases

## Contributing

Contributions are welcome! Please:

1. Read [CLAUDE.md](CLAUDE.md) for development guidelines
2. Run tests before submitting: `npm test` and `./test/test_force.js`
3. Follow existing code style
4. Test changes with all CLI tools and SFDX plugin
5. Update documentation as needed

## Documentation

- **CLAUDE.md**: Comprehensive development guide for AI-assisted development
- **sfdx/README.md**: SFDX plugin installation and usage
- **[Mobile SDK Developer Guide](https://developer.salesforce.com/docs/platform/mobile-sdk/guide)**: Official documentation

## Related Repositories

- **[SalesforceMobileSDK-iOS](https://github.com/forcedotcom/SalesforceMobileSDK-iOS)** - iOS native SDK
- **[SalesforceMobileSDK-Android](https://github.com/forcedotcom/SalesforceMobileSDK-Android)** - Android native SDK
- **[SalesforceMobileSDK-Templates](https://github.com/forcedotcom/SalesforceMobileSDK-Templates)** - App templates
- **[SalesforceMobileSDK-Shared](https://github.com/forcedotcom/SalesforceMobileSDK-Shared)** - Hybrid JavaScript libraries
- **[SalesforceMobileSDK-CordovaPlugin](https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin)** - Cordova plugin
- **[SalesforceMobileSDK-ReactNative](https://github.com/forcedotcom/SalesforceMobileSDK-ReactNative)** - React Native libraries
- **[SalesforceMobileSDK-iOS-Hybrid](https://github.com/forcedotcom/SalesforceMobileSDK-iOS-Hybrid)** - iOS hybrid bridge
- **[SalesforceMobileSDK-iOS-Specs](https://github.com/forcedotcom/SalesforceMobileSDK-iOS-Specs)** - CocoaPods specs
- **[SalesforceMobileSDK-iOS-SPM](https://github.com/forcedotcom/SalesforceMobileSDK-iOS-SPM)** - Swift Package Manager distribution

## License

Salesforce Mobile SDK License. See [LICENSE](LICENSE) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/forcedotcom/SalesforceMobileSDK-Package/issues)
- **Questions**: [Salesforce Developer Community](https://developer.salesforce.com/forums)
- **Stack Overflow**: Tag questions with `salesforce-mobile-sdk`
