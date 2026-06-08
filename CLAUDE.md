# CLAUDE.md — Salesforce Mobile SDK Package

---

## About This Project

The Salesforce Mobile SDK Package repository is the **distribution and tooling hub** for the entire Mobile SDK ecosystem. It provides the command-line tools, SFDX plugin, testing framework, and release automation that enable developers to create and maintain Salesforce mobile applications.

**Key constraint**: This is the **release orchestrator**. Changes here affect how developers create apps and how the entire SDK is released and distributed.

## Repository Purpose

This repository serves three primary functions:

1. **CLI Tools** - Standalone command-line tools (`forceios`, `forcedroid`, `forcehybrid`, `forcereact`)
2. **SFDX Plugin** - Salesforce CLI integration (`sf mobilesdk` commands)
3. **Release Infrastructure** - Scripts to test, package, and release the entire Mobile SDK

## Repository Structure

```
SalesforceMobileSDK-Package/
├── ios/                      # forceios CLI tool
│   ├── forceios.js           # Entry point
│   └── package.json          # NPM package definition
├── android/                  # forcedroid CLI tool
│   ├── forcedroid.js         # Entry point
│   └── package.json          # NPM package definition
├── hybrid/                   # forcehybrid CLI tool
│   ├── forcehybrid.js        # Entry point
│   └── package.json          # NPM package definition
├── react/                    # forcereact CLI tool
│   ├── forcereact.js         # Entry point
│   └── package.json          # NPM package definition
├── sfdx/                     # SFDX plugin (sf mobilesdk)
│   ├── generate_oclif.js     # Generates OCLIF command classes
│   ├── package.json          # Plugin package definition
│   └── README.md             # Plugin documentation
├── shared/                   # Shared utilities (symlinked into each tool)
│   ├── constants.js          # SDK version, tool requirements, CLI definitions
│   ├── createHelper.js       # Core app creation logic
│   ├── templateHelper.js     # Template handling and listing
│   ├── configHelper.js       # CLI argument parsing
│   ├── utils.js              # File operations, git, shell commands
│   ├── commandLineUtils.js   # Argument parsing utilities
│   └── outputColors.js       # Terminal color formatting
├── test/                     # Testing framework
│   └── test_force.js         # Comprehensive app generation tests
├── release/                  # Release automation
│   ├── release.js            # Main release orchestrator
│   └── common.js             # Release helper functions
├── pack/                     # NPM packaging
│   └── pack.js               # Creates .tgz packages for distribution
├── unittests/                # Unit tests
│   └── *.test.js             # Jest tests for shared utilities
└── package.json              # Root package definition
```

## CLI Tools Architecture

### Entry Points

Each CLI tool is a minimal wrapper that calls the shared `createHelper.createApp()` function:

```javascript
// ios/forceios.js, android/forcedroid.js, etc.
var SDK = require('./shared/constants'),
    createHelper = require('./shared/createHelper');

createHelper.createApp(SDK.forceclis.forceios); // or forcedroid, forcehybrid, forcereact
```

### Shared Logic

All CLI tools share common code via the `shared/` directory:

- **constants.js**: Defines SDK version (13.2.0), tool versions, CLI configurations
- **createHelper.js**: Main app creation logic (native and hybrid workflows)
- **templateHelper.js**: Template discovery, listing, and preparation
- **configHelper.js**: Interactive prompts and argument parsing

### Tool Definitions

Each CLI tool is defined in `shared/constants.js`:

```javascript
forceclis: {
    forceios: {
        name: 'forceios',
        topic: 'ios',
        purpose: 'an iOS native mobile application',
        platforms: ['ios'],
        toolNames: ['git', 'node', 'npm', 'pod'],
        appTypes: ['native_swift'],
        appTypesToPath: {
            'native_swift': 'iOSNativeSwiftTemplate'
        },
        commands: ['create', 'createwithtemplate', 'version', 'listtemplates', 'describetemplate', 'checkconfig']
    },
    // forcedroid, forcehybrid, forcereact follow same pattern
}
```

## Commands

### Common Commands

All CLI tools support these commands:

| Command | Purpose |
|---------|---------|
| **create** | Create app from standard template |
| **createwithtemplate** | Create app from custom template |
| **version** | Show SDK version |
| **listtemplates** | List available templates |
| **describetemplate** | Show template details |
| **checkconfig** | Validate SmartStore/MobileSync config JSON |

### Command Workflow

1. **Argument Parsing**: `configHelper.readConfig()` parses CLI args or prompts interactively
2. **Tool Validation**: `createHelper.checkTools()` verifies required tools (git, node, pod, etc.)
3. **Template Resolution**: `templateHelper` clones/reads template repository
4. **App Creation**:
   - **Native**: Copy template, run `template.js` prepare function
   - **Hybrid**: Use Cordova CLI to create project, add platforms, add plugin, copy template to `www/`
5. **OAuth Configuration**: Optionally auto-configure consumer key and callback URL
6. **Next Steps**: Print instructions for opening in Xcode/Android Studio

## SFDX Plugin

The `sfdx/` directory contains a Salesforce CLI plugin that exposes the same functionality as the CLI tools via `sf mobilesdk` commands.

### Plugin Generation

The plugin uses OCLIF framework and generates command classes dynamically:

```bash
cd sfdx
node generate_oclif.js  # Generates OCLIF command classes from shared/constants.js
```

### Plugin Commands

```
sf mobilesdk ios create
sf mobilesdk android create
sf mobilesdk hybrid create
sf mobilesdk reactnative create
sf mobilesdk [platform] createwithtemplate
sf mobilesdk [platform] listtemplates
sf mobilesdk [platform] describetemplate
sf mobilesdk [platform] checkconfig
sf mobilesdk [platform] version
```

### Plugin Installation

- **From source**: `sf plugins link sfdx`
- **From npm**: `sf plugins install sfdx-mobilesdk-plugin`

## Template System

### Template Repository Structure

Templates are fetched from `SalesforceMobileSDK-Templates` repository:

- Repository URL configured in `shared/constants.js` (`templatesRepoUri`)
- Default: `https://github.com/forcedotcom/SalesforceMobileSDK-Templates#dev`
- Templates listed in `templates.json` at repo root

### Template Discovery

```bash
forceios listtemplates                    # List default templates
forceios listtemplates --templatesource=<git-url-or-local-path>  # Custom templates
forceios listtemplates --doc              # Include metadata from template.json
forceios listtemplates --json             # JSON output
```

### Creating Apps from Templates

```bash
# From default templates
forceios createwithtemplate --templaterepouri=iOSNativeSwiftTemplate --appname=MyApp ...

# From custom template suite
forceios createwithtemplate --templatesource=<git-url> --template=MyTemplate --appname=MyApp ...

# From local template directory
forceios createwithtemplate --templaterepouri=/path/to/template --appname=MyApp ...
```

### Template Execution

Each template has a `template.js` file with:

```javascript
module.exports = {
    appType: 'native_swift',
    prepare: function(config, replaceInFiles, moveFile, removeFile) {
        // Template-specific preparation logic
        // Returns { platform, workspacePath, bootconfigFile }
    }
};
```

## OAuth Configuration

CLI tools can auto-configure External Client App credentials:

```bash
forceios create \
  --appname=MyApp \
  --packagename=com.mycompany.myapp \
  --organization="My Company" \
  --consumerkey=<consumer-key> \
  --callbackurl=<callback-url> \
  --loginserver=https://login.salesforce.com
```

If not provided, tools print instructions to manually configure in bootconfig file.

## Testing Framework

### test_force.js

Comprehensive testing script that generates apps for all platforms and app types:

```bash
cd test

# Test all CLIs
./test_force.js --cli=forceios,forcedroid,forcehybrid,forcereact

# Test specific CLIs
./test_force.js --cli=forceios

# Test with SFDX plugin
./test_force.js --cli=forceios --use-sfdx

# Override plugin repo (for testing unreleased versions)
./test_force.js --cli=forcehybrid --pluginrepouri=<git-url>

# Override SDK dependencies (for testing with custom SDK branches)
./test_force.js --cli=forceios --sdkdependencies='{"ios":"<git-url>","android":"<git-url>"}'
```

### Test Coverage

- **Native iOS**: Objective-C and Swift templates
- **Native Android**: Java and Kotlin templates
- **Hybrid**: Local and remote templates
- **React Native**: JavaScript and TypeScript templates

Tests verify:
- App generation succeeds
- All required files are created
- Project structure is correct
- OAuth configuration is applied (if provided)

## Release Process

### release/release.js

The release orchestrator coordinates releases across all 11 Mobile SDK repositories:

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

### Release Workflow

```bash
cd release
./release.js
```

Interactive prompts guide you through:
1. Work directory
2. GitHub organization
3. Branch names (master/dev/gh-pages)
4. Version being released
5. Next version

For each repository, the script:
- Clones/pulls latest code
- Merges dev → master (unless patch release)
- Updates version numbers
- Generates documentation (Android Javadoc, iOS docs)
- Builds XCFrameworks (iOS-SPM)
- Updates podspecs (iOS-Specs)
- Runs update scripts (CordovaPlugin)
- Tags release
- Pushes to GitHub
- Updates dev branch for next version

### Post-Release Steps

After `release.js` completes:

1. **Test NPM packages**:
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

## Packaging (pack.js)

Creates distributable NPM packages:

```bash
cd pack

# Package CLI tools
./pack.js --cli=forceios,forcedroid,forcehybrid,forcereact

# Package SFDX plugin
./pack.js --sfdx-plugin
```

Output: `<name>-<version>.tgz` files in current directory

## Version Management

SDK version is defined in `shared/constants.js`:

```javascript
var VERSION = '13.2.0';

module.exports = {
    version: VERSION,
    // ...
};
```

This version is:
- Used by all CLI tools (`forceios version`)
- Embedded in generated apps
- Used to determine template repo tags
- Updated during release process

## Dependencies and Requirements

### Tool Requirements

Defined in `shared/constants.js` and checked before app creation:

| Tool | Min Version | Used By |
|------|-------------|---------|
| **git** | 2.13 | All CLIs |
| **node** | 22 | All CLIs |
| **npm** | 10 | All CLIs |
| **yarn** | 1.22 | forcereact |
| **tsc** | 4.1.2 | forcereact |
| **pod** | 1.8.0 | forceios, forcereact |
| **cordova** | 13.0.0 | forcehybrid |
| **sf** | 2.0.0 | forcehybrid (for server projects) |

### NPM Dependencies

- **shelljs**: File operations
- **prompts**: Interactive CLI prompts
- **ajv**: JSON schema validation
- **@oclif/core**: SFDX plugin framework (sfdx/ only)

## Testing Standards

### Unit Tests

Location: `unittests/`

Run with Jest:
```bash
npm test
```

Tests cover:
- Utility functions
- Argument parsing
- Template helpers
- Config validation

### Integration Tests

Location: `test/test_force.js`

Tests actual app generation across all platforms and app types.

## Code Standards

### JavaScript Standards

- **Node.js**: 22+
- **Style**: Use existing code style (shelljs patterns, callback-based for older code)
- **Error Handling**: Use `utils.runProcessThrowError()` for shell commands
- **Logging**: Use `utils.log()`, `utils.logInfo()`, `utils.logError()` with colors

### Naming Conventions

- **Files**: `camelCase.js`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`

## Agent Behavior Guidelines

### Do

- Test app generation after making changes to CLI tools
- Run `test/test_force.js` with relevant CLIs before committing
- Update `shared/constants.js` when changing SDK version or tool requirements
- Test both standalone CLI and SFDX plugin flows
- Verify changes work across all app types (native, hybrid, React Native)
- Check that OAuth auto-configuration works when provided

### Don't

- Don't modify the SDK version in `constants.js` without coordinating with release process
- Don't change tool minimum versions without verifying compatibility
- Don't modify release scripts without understanding the cross-repo impact
- Don't add new dependencies without team discussion
- Don't change the template structure without coordinating with Templates repo
- Don't modify pack.js or release.js without thorough testing

### Escalation — Stop and Flag for Human Review

- Any change to release process (`release/release.js`)
- Changes to version numbers or SDK requirements
- New tool dependencies or minimum version bumps
- Changes to template discovery or execution logic
- Modifications to SFDX plugin structure
- Changes affecting OAuth configuration flow
- Breaking changes to CLI arguments or commands

## Key Domain Concepts

- **CLI Tool**: Standalone Node.js command (forceios, forcedroid, etc.)
- **SFDX Plugin**: Salesforce CLI integration using OCLIF framework
- **Template**: Git repository containing app boilerplate code and `template.js` script
- **Template Suite**: Repository with `templates.json` listing multiple templates
- **App Type**: Type of app being created (native, native_swift, hybrid_local, react_native, etc.)
- **Platform**: Target platform (ios, android, or both)
- **External Client App**: Salesforce OAuth configuration (consumer key, callback URL, scopes)
- **Bootconfig File**: Mobile SDK configuration file for OAuth settings (`bootconfig.json` or platform-specific)
- **Force CLI**: Generic term for forceios, forcedroid, forcehybrid, forcereact tools
- **SDK Dependencies**: Git URLs for iOS/Android SDK repos (can be overridden for testing)

## Related Documentation

- **Mobile SDK Development Guide**: https://developer.salesforce.com/docs/platform/mobile-sdk/guide
- **Templates Repository**: See `SalesforceMobileSDK-Templates/CLAUDE.md` and `TESTING.md`
- **iOS SDK**: See `SalesforceMobileSDK-iOS/CLAUDE.md`
- **Android SDK**: See `SalesforceMobileSDK-Android/CLAUDE.md`
- **Hybrid**: See `SalesforceMobileSDK-Shared/CLAUDE.md`, `SalesforceMobileSDK-iOS-Hybrid/CLAUDE.md`, `SalesforceMobileSDK-CordovaPlugin/CLAUDE.md`
- **React Native**: See `SalesforceMobileSDK-ReactNative/CLAUDE.md`

## Distribution

### NPM Packages

Published to npmjs.org:
- `forceios` - iOS native app generator
- `forcedroid` - Android native app generator
- `forcehybrid` - Hybrid app generator
- `forcereact` - React Native app generator
- `sfdx-mobilesdk-plugin` - Salesforce CLI plugin
- `salesforce-mobilesdk-cordova-plugin` - Cordova plugin (built from CordovaPlugin repo)

### Installation

```bash
# Install CLI tools globally
npm install -g forceios forcedroid forcehybrid forcereact

# Install SFDX plugin
sf plugins install sfdx-mobilesdk-plugin
```

### Usage Examples

See README.md for detailed usage examples of all commands.
