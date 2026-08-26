---
name: remove-template
description: Update Package repository after removing a template
type: skill
---

# Update Package Repository After Template Removal

This skill updates the SalesforceMobileSDK-Package repository after a template has been removed from the Templates repository.

## Prerequisites

- Template has been removed from Templates repo and pushed to a branch
- Know the template's `appType` (from templates.json before removal)
- Know if this was the **last template** with that `appType`

## Steps

### 1. Update setup_test_branches.js

**File**: `release/setup_test_branches.js`

**Lines 49-68**: Contains hardcoded array `templatesPackageJsons`.

Remove the line for the deleted template:

```javascript
const templatesPackageJsons = [
    './AndroidIDPTemplate/package.json',
    './AndroidNativeKotlinTemplate/package.json',
    // ... other templates ...
    './TemplateName/package.json',  // ← REMOVE THIS LINE
    './iOSNativeTemplate/package.json'
]
```

### 2. Check constants.js for Default Template

**File**: `shared/constants.js`

**Check**: Is the removed template a **default** in `appTypesToPath`?

```javascript
forceclis: {
    forceios: {
        appTypesToPath: {
            'native': 'iOSNativeTemplate',       // Check if removed template is here
            'native_swift': 'iOSNativeSwiftTemplate'
        }
    }
}
```

**Actions**:
- If the removed template is a default AND another template exists with same appType:
  - Replace with another template of the same appType
- If the removed template is a default AND it's the last of that appType:
  - Proceed to Step 3

### 3. If Last Template of AppType - Remove AppType Support

**Only if** the removed template was the **last template** with its `appType`:

#### 3.1. Update constants.js

Remove the appType from CLI definitions:

```javascript
forceclis: {
    forcexxx: {
        appTypes: ['native_swift', 'native'],  // ← Remove the appType
        appTypesToPath: {
            'native': 'iOSNativeTemplate',  // ← Remove mapping
            'native_swift': 'iOSNativeSwiftTemplate'
        }
    }
}
```

#### 3.2. Update test_force.js

**File**: `test/test_force.js`

Remove from `APP_TYPE` enum:

```javascript
var APP_TYPE = {
    native: 'native',
    native_swift: 'native_swift',  // ← Remove if last of this type
    // ...
};
```

#### 3.3. Generate OCLIF Command Classes

After modifying constants.js, regenerate SFDX plugin commands:

```bash
cd sfdx
./generate_oclif.js
```

#### 3.4. Link SFDX Plugin

Link the sfdx plugin to reflect the changes:

```bash
sf plugins link sfdx
```

#### 3.5. Generate SFDX Plugin README

Update the SFDX plugin README with new help text:

```bash
cd sfdx
./generate_readme.sh
```

### 4. Search All JS Files

Search for any explicit references to the template name:

```bash
grep -r "TemplateName" --include="*.js" --exclude-dir=node_modules .
```

**Note**: These files work generically and should NOT have explicit references:
- `release/release.js` - Generic template repo processing
- `test/test_force.js` - Uses `templateHelper.getTemplates()` 
- `shared/createHelper.js` - Generic template handling
- `shared/templateHelper.js` - Dynamic template loading
- `shared/configHelper.js` - Generic config handling

**Action**: Only update if you find explicit references.

### 5. Update README.md

**File**: `README.md`

**Search for**:
- Template name in examples
- AppType references (if appType was removed)

**Remove**: Examples and documentation referencing the removed template/appType.

### 6. Update CLAUDE.md

**File**: `CLAUDE.md`

**Search for**:
- Template name in examples
- AppType in documentation
- AppType in CLI tool definitions

**Remove**: All references to the removed template/appType.

## Validation

### Checklist

- [ ] setup_test_branches.js updated (templatesPackageJsons array)
- [ ] constants.js checked (updated if template was a default)
- [ ] If last appType:
  - [ ] appTypes array updated in constants.js
  - [ ] appTypesToPath updated in constants.js
  - [ ] APP_TYPE enum updated in test_force.js
  - [ ] OCLIF commands regenerated: `sfdx/generate_oclif.js`
  - [ ] SFDX plugin linked: `sf plugins link sfdx`
  - [ ] SFDX README regenerated: `sfdx/generate_readme.sh`
- [ ] All JS files scanned: `grep -r "TemplateName" --include="*.js" --exclude-dir=node_modules .`
- [ ] README.md updated
- [ ] CLAUDE.md updated

### Test Prompting Behavior

If you removed the last template of an appType, verify the prompt is automatically skipped:

```bash
# Test interactively - appType prompt should not appear for this CLI
echo "" | node ios/forceios.js create --appname=TestApp --packagename=com.test.app --organization=Test
```

Expected: No prompt for appType if only one remains.

### Run test_force.js

**Important**: This requires pointing to the modified Templates repo branch.

See the separate skill: `SalesforceMobileSDK-Workspace/.claude/skills/test-templates.md`

## Commit Changes

```bash
git add -A
git commit -m "Update Package repo after removing <TemplateName>

Updated after template removal:
- setup_test_branches.js: Removed from templatesPackageJsons array
[- constants.js: Removed <appType> support (if last of type)]
[- test_force.js: Removed APP_TYPE.<appType> (if last of type)]
[- Regenerated OCLIF commands and SFDX README (if constants.js changed)]
- README.md: Removed references
- CLAUDE.md: Removed references"

git push origin <branch-name>
```

## Next Steps

After pushing, proceed to test both repos together using the test-templates skill.

See: `SalesforceMobileSDK-Workspace/.claude/skills/test-templates.md`
