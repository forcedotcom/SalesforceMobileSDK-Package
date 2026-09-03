## test_force.js — App Generation and Build Test

`test_force.js` generates apps from all relevant templates and compiles them with Xcode or Gradle. It is the integration test for the CLI tools and the template system.

Run from the `test/` directory:

```bash
cd test
./test_force.js --cli=forceios,forcedroid,forcehybrid,forcereact
```

### Key Flags

| Flag | Description |
|------|-------------|
| `--cli=X,Y` | Test specific CLI tools (`forceios`, `forcedroid`, `forcehybrid`, `forcereact`) |
| `--os=ios,android` | Filter by platform (alternative to `--cli`) |
| `--apptype=X` | Filter by app type (`native_swift`, `native_kotlin`, `react_native`, `hybrid_local`, etc.) |
| `--templaterepouri=URI` | Test a specific template repo URI or template name |
| `--use-sfdx` | Use the SFDX plugin instead of standalone CLI tools |
| `--pluginrepouri=URI` | Override Cordova plugin repo URI (default: from constants.js) |
| `--sdkdependencies=JSON` | Override SDK dependency repos (see below) |
| `--spmrepouri=URI` | Override iOS-SPM repo URI (default: `https://github.com/forcedotcom/SalesforceMobileSDK-iOS-SPM`) |
| `--spm-update` | Clone the SPM repo and build xcframeworks locally, then use that local build |
| `--exit-on-failure` | Stop on first failure instead of continuing |
| `--skip-build` | Generate apps without compiling them afterward |
| `--consumerkey=KEY` | OAuth consumer key injected into bootconfig |
| `--callbackurl=URL` | OAuth callback URL injected into bootconfig |
| `--loginserver=URL` | Login server URL (default: `https://login.salesforce.com`) |

### What It Does

1. **Packages the CLI tool(s)** — runs `pack.js` to produce `.tgz` files, then `npm install`s them into a temp dir.
2. **For each template** matching the requested CLI / OS / app type:
   - Runs `forceXXX createwithtemplate --templaterepouri=...` (or `create` for non-template types)
   - Unless `--skip-build` is set, compiles with `xcodebuild clean build` (iOS) or `./gradlew assembleDebug` (Android)
3. **Reports** pass/fail per template.

### SDK Dependency Overrides (`--sdkdependencies`)

The `--sdkdependencies` flag accepts a JSON object that overrides the `sdkDependencies` in template `package.json` files. This lets you test with unreleased SDK branches or forks.

```bash
# Test iOS templates against a fork's dev branch
./test_force.js --cli=forceios \
  --sdkdependencies='{"SalesforceMobileSDK-iOS":"https://github.com/wmathurin/SalesforceMobileSDK-iOS#dev"}'

# Test against a specific release tag
./test_force.js --cli=forceios \
  --sdkdependencies='{"SalesforceMobileSDK-iOS":"https://github.com/forcedotcom/SalesforceMobileSDK-iOS#v13.2.1"}'
```

### SPM Template Testing

The `iOSNativeSwiftPackageManagerTemplate` uses `SalesforceMobileSDK-iOS-SPM` as its SDK dependency. To test it against a custom SPM build (e.g. a fork or a pre-release build):

**Option A — point to a fork's branch directly:**
```bash
./test_force.js --cli=forceios \
  --sdkdependencies='{"SalesforceMobileSDK-iOS-SPM":"https://github.com/wmathurin/SalesforceMobileSDK-iOS-SPM#master2"}'
```

**Option B — build xcframeworks locally and use the local clone:**
```bash
./test_force.js --cli=forceios \
  --spmrepouri=https://github.com/wmathurin/SalesforceMobileSDK-iOS-SPM#master2 \
  --spm-update
```
`--spm-update` clones the SPM repo, runs `build_xcframeworks.sh` locally, and sets `sdkDependencies["SalesforceMobileSDK-iOS-SPM"]` to the local path. Use this when the xcframeworks in the remote branch are not yet built.

### Full Post-Release Test (after running release.js)

After `release.js` completes, use the test packages it built:

```bash
cd <work-dir>/SalesforceMobileSDK-Package

# Using standalone CLI tools
./test/test_force.js \
  --cli=forceios,forcedroid,forcereact,forcehybrid \
  --pluginrepouri=git@github.com:<org>/SalesforceMobileSDK-CordovaPlugin#v<version>

# Using SFDX plugin
./test/test_force.js \
  --cli=forceios,forcedroid,forcereact,forcehybrid \
  --use-sfdx \
  --pluginrepouri=git@github.com:<org>/SalesforceMobileSDK-CordovaPlugin#v<version>
```

### Testing iOS-SPM After a Release Dry Run

After running `release.js` with test branches on your fork, test the SPM template against the freshly released fork:

```bash
cd <work-dir>/SalesforceMobileSDK-Package
./test/test_force.js --cli=forceios \
  --sdkdependencies='{"SalesforceMobileSDK-iOS-SPM":"https://github.com/<org>/SalesforceMobileSDK-iOS-SPM#<testVersion>"}'
```

Replace `<org>` with your fork org and `<testVersion>` with the version tag that `release.js` created (e.g. `13.2.1`). Note: iOS-SPM tags have no `v` prefix.
