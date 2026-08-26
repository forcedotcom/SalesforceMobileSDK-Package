---
name: test-templates
description: Test templates with test_force.js script
type: skill
---

# Test Templates with test_force.js

This skill documents testing templates in the Package repository using the `test/test_force.js` script.

## Purpose

After modifying CLI tools or templates, you need to verify that:
1. CLI tools can generate apps from all applicable templates
2. Generated apps install dependencies correctly
3. Generated apps compile successfully

## Prerequisites

- Package repo with changes committed locally
- npm dependencies installed (`npm install`)
- Know which CLIs to test
- Know which template source to test (if testing custom templates)

## Basic Usage

### Test All CLIs

```bash
./test/test_force.js --cli=forceios,forcedroid,forcehybrid,forcereact
```

### Test Specific CLI

```bash
./test/test_force.js --cli=forceios
```

### Test with SFDX Plugin

```bash
./test/test_force.js --cli=forceios --use-sfdx
```

### Exit on First Failure

```bash
./test/test_force.js --cli=forceios --exit-on-failure
```

## Testing with Custom Template Source

When testing with templates from a specific branch:

### Override Template Source

```bash
./test/test_force.js \
  --cli=forceios \
  --templaterepouri=https://github.com/wmathurin/SalesforceMobileSDK-Templates#my-feature
```

This makes the CLI use templates from the specified branch instead of the default.

### Override SDK Dependencies

```bash
./test/test_force.js \
  --cli=forceios \
  --sdkdependencies='{"SalesforceMobileSDK-iOS":"https://github.com/wmathurin/SalesforceMobileSDK-iOS#my-feature"}'
```

This overrides SDK dependencies in template `package.json` files.

### Combined: Templates and SDK

```bash
./test/test_force.js \
  --cli=forceios \
  --templaterepouri=https://github.com/wmathurin/SalesforceMobileSDK-Templates#template-changes \
  --sdkdependencies='{"SalesforceMobileSDK-iOS":"https://github.com/wmathurin/SalesforceMobileSDK-iOS#sdk-changes"}'
```

## What Gets Tested

For each applicable template, the script:

1. **Packages CLI** - Creates .tgz package
2. **Installs CLI** - Installs in temporary directory via npm
3. **Generates App** - Runs CLI to generate app from template
4. **Builds App** - Compiles generated app
   - iOS: `xcodebuild` with workspace
   - Android: `./gradlew assembleDebug`
   - React Native: Both iOS and Android

✅ **Tested**:
- CLI tool packaging
- App generation from templates
- Dependency installation
- Project compilation

❌ **NOT Tested**:
- Running the generated app
- Unit tests
- UI tests

## Test Coverage by CLI

| CLI | Templates Tested | Platforms |
|-----|------------------|-----------|
| **forceios** | All iOS native templates | iOS |
| **forcedroid** | All Android native templates | Android |
| **forcereact** | All React Native templates | iOS and Android |
| **forcehybrid** | All hybrid templates | iOS and Android |

## Common Testing Scenarios

### After Modifying CLI Code

Test all CLIs to ensure changes don't break app generation:

```bash
./test/test_force.js --cli=forceios,forcedroid,forcehybrid,forcereact
```

### After Removing a Template

Test affected CLIs to ensure remaining templates work:

```bash
./test/test_force.js --cli=forceios
```

### Testing CLI with Custom Templates Branch

When templates have been modified and pushed to a branch:

```bash
./test/test_force.js \
  --cli=forceios \
  --templaterepouri=https://github.com/wmathurin/SalesforceMobileSDK-Templates#remove-native
```

### Testing All CLIs with SPM Update

```bash
./test/test_force.js \
  --cli=forceios,forcedroid,forcehybrid,forcereact \
  --spm-update \
  --spmrepouri=https://github.com/wmathurin/SalesforceMobileSDK-iOS-SPM#my-feature
```

## Output Interpretation

**Success**:
```
!SUCCESS! GENERATING native_swift app for ios based on template iOSNativeSwiftTemplate (dev)
!SUCCESS! COMPILING native_swift app for ios based on template iOSNativeSwiftTemplate (dev)
```

**Failure**:
```
!FAILURE! GENERATING native_swift app for ios based on template iOSNativeSwiftTemplate (dev)
Command failed: ...
```

## Validation Checklist

- [ ] Test script runs without errors
- [ ] All applicable CLIs tested
- [ ] All templates for each CLI generate successfully
- [ ] All generated apps compile successfully
- [ ] No dependency resolution errors

## Integration with Other Skills

This skill is used by:
- **remove-template**: Test CLIs after template removal
- **CLI modifications**: Test after changing CLI tool code
- **Template changes**: Test CLI with modified templates

## Example: Testing After Template Removal

After removing templates from Templates repo and updating Package repo:

```bash
cd SalesforceMobileSDK-Package

# Test affected CLI
./test/test_force.js --cli=forceios --exit-on-failure
```

## Example: Cross-Repo Testing

Testing Package repo changes with Templates repo changes:

```bash
cd SalesforceMobileSDK-Package

# Test forceios with templates from branch
./test/test_force.js \
  --cli=forceios \
  --templaterepouri=https://github.com/wmathurin/SalesforceMobileSDK-Templates#remove-native \
  --exit-on-failure
```

## Notes

- **test_force.js location**: Located in `test/` directory
- **Temporary directory**: Creates `tmp<timestamp>/` for each test run
- **Cleanup**: Removes temporary directory after successful tests
- **Performance**: Testing all CLIs can take 45-90 minutes
- **CI Integration**: Used by GitHub Actions workflows
- **npm dependencies required**: Run `npm install` before testing

## Alternative: Testing Without test_force.js

You can also test by manually running CLI commands:

```bash
# Install CLI locally
npm install -g .

# Test with custom template source
forceios createwithtemplate \
  --templatesource=https://github.com/wmathurin/SalesforceMobileSDK-Templates#my-branch \
  --template=iOSNativeSwiftTemplate \
  --appname=TestApp \
  --packagename=com.test.app \
  --organization=Test \
  --outputdir=/tmp/testapp
```

## Related Documentation

- See `test/test_force.js` for full script implementation
- See `.github/workflows/` for CI test configuration
- See workspace skill `test-templates.md` for cross-repo testing coordination
