## Release Scripts

### Setup

Run `npm install` at the repo root before using any release script.

---

## release.js — Full Release Orchestrator

`release.js` coordinates a complete Mobile SDK release across all 10 repositories.
Run it from the `release/` directory:

```bash
cd release
./release.js
```

### Interactive Prompts

| Prompt | Default | Notes |
|--------|---------|-------|
| Work directory | auto temp dir | Repos are cloned here |
| Organization | current user | GitHub org/username owning the forks |
| Is patch release? | no | Skip dev→master merge when yes |
| Release branch | `master2` | The branch that gets tagged |
| Development branch | `dev2` | The branch that tracks next version |
| Doc branch | `gh-pages2` | Only relevant for iOS and Android |
| Version being released | from constants.js | e.g. `13.2.1` |
| Version code (Android) | from constants.js | Integer, incremented for each release |
| Next version | `14.0.0` | Bumped on dev after release |
| Auto-yes all prompts | no | Skip interactive confirms per repo |

> **Defaults use test branches** (`master2`, `dev2`, `gh-pages2`). For a real release, supply the real branch names (`master`, `dev`, `gh-pages`).

### Release Sequence

Repos are released in dependency order:

1. `SalesforceMobileSDK-Shared`
2. `SalesforceMobileSDK-Android`
3. `SalesforceMobileSDK-iOS`
4. `SalesforceMobileSDK-iOS-Hybrid`
5. `SalesforceMobileSDK-iOS-Specs`
6. `SalesforceMobileSDK-iOS-SPM`
7. `SalesforceMobileSDK-CordovaPlugin`
8. `SalesforceMobileSDK-ReactNative`
9. `SalesforceMobileSDK-Templates`
10. `SalesforceMobileSDK-Package`

### Per-Repo Release Steps (generic flow via `releaseRepo()`)

For most repos the script runs this sequence:

```
clone/clean repo
│
├── master branch
│   ├── checkout master
│   ├── [skip if isPatch] merge dev → master  (strategy: -Xours)
│   ├── masterPostMergeCmd  (repo-specific, e.g. xcframework build)
│   ├── [skip if skipSetVersion] ./setVersion.sh -v <version> -d no
│   ├── update submodules  (repos with submodulePaths only)
│   ├── git add * && git commit && git push origin master
│   ├── git tag [v]<version> && git push origin master --tag
│   └── postReleaseGenerateCmd  (repo-specific, e.g. javadoc, npm pack)
│
└── dev branch
    ├── checkout dev
    ├── merge master → dev  (strategy: -Xours)
    ├── devPostMergeCmd  (repo-specific, e.g. update.sh for CordovaPlugin)
    ├── [skip if skipSetVersion] ./setVersion.sh -v <nextVersion> -d yes
    ├── update submodules
    └── git add * && git commit && git push origin dev
```

### Per-Repo Customization Parameters

`releaseRepo(repo, params)` accepts these optional params:

| Param | Type | Used by | Purpose |
|-------|------|---------|---------|
| `submodulePaths` | string[] | Android, iOS-Hybrid | Submodule paths to update after merge |
| `masterPostMergeCmd` | string/cmd | iOS-SPM | Command to run after dev→master merge, before commit+tag |
| `devPostMergeCmd` | string/cmd | CordovaPlugin | Command to run after master→dev merge |
| `postReleaseGenerateCmd` | cmd | iOS, Android, CordovaPlugin, Package | Runs after tagging master (doc gen, npm pack) |
| `skipSetVersion` | bool | iOS-SPM | Skip `./setVersion.sh` calls (iOS-SPM has no such script) |
| `noTagPrefix` | bool | iOS-SPM | Use `X.Y.Z` tag format instead of `vX.Y.Z` |

### Repo-Specific Notes

**iOS-Specs** — no `releaseRepo()`, custom flow:
- Checks out master, runs `./update.sh -b <masterBranch> -v <version>`, commits, pushes.
- No dev branch, no tag.

**iOS-SPM** — uses `releaseRepo()` with custom params:
- `masterPostMergeCmd`: runs `./build_xcframeworks.sh -r <org> -b <masterBranch>` after the dev→master merge and before committing/tagging. The built xcframeworks are picked up by `git add *`.
- `skipSetVersion: true` — no `setVersion.sh` in iOS-SPM; version is communicated via tag only.
- `noTagPrefix: true` — SPM requires tags without `v` prefix (e.g. `13.2.0`, not `v13.2.0`).

**CordovaPlugin** — `masterPostMergeCmd` and `devPostMergeCmd` both run `./tools/update.sh -b <branch>` to sync files from source repos.

**iOS and Android** — `postReleaseGenerateCmd` generates documentation (jazzy / javadoc) and publishes to `gh-pages`.

**Package** — `postReleaseGenerateCmd` runs `pack.js` to build `.tgz` npm packages.

### Patch Releases

When `isPatch = true`:
- The `dev → master` merge is **skipped** for all repos.
- Changes must already be on master (cherry-picked or committed directly).
- All other steps (setVersion, commit, tag, merge master→dev, version bump) still run.

### After the Script Completes

The script prints next steps:

1. **Test the generated NPM packages:**
   ```bash
   cd <work-dir>/SalesforceMobileSDK-Package
   ./test/test_force.js --cli=forceios,forcedroid,forcereact,forcehybrid --pluginrepouri=git@github.com:<org>/SalesforceMobileSDK-CordovaPlugin#v<version>
   ```

2. **Publish to NPM** (from work-dir):
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

---

## setup_test_branches.js — Test Branch Setup

`setup_test_branches.js` creates parallel test branches (e.g. `master2`, `dev2`) across all repos in a personal fork so `release.js` can do a full dry-run without touching production branches.

```bash
cd release
./setup_test_branches.js
```

### Interactive Prompts

| Prompt | Default | Notes |
|--------|---------|-------|
| Work directory | auto temp dir | Repos cloned here |
| Organization | `wmathurin` | Must NOT be `forcedotcom` |
| Test master branch | `master2` | Must NOT be `master` |
| Test dev branch | `dev2` | Must NOT be `dev` |
| Test doc branch | `gh-pages2` | Must NOT be `gh-pages` |
| Test version | current SDK version | Must NOT be less than current version |
| Cleanup only? | no | Delete test branches without recreating them |
| Auto-yes | no | |

### What It Does Per Repo

For each repo:
1. **Delete** the test master, test dev (if applicable), test doc (if applicable) branch and test tag from origin.
2. **Create** test master branch off `master`.
3. **Create** test dev branch off `dev` and merge test master into it (for repos that have a dev branch).
4. **Create** test doc branch off `gh-pages` (iOS and Android only).
5. **Point to fork** — for repos with `filesWithOrg`, replace `forcedotcom` with the test org in the listed files (e.g. `.gitmodules`, `plugin.xml`, template `package.json` sdkDependencies). This ensures inter-repo references stay within the fork.
6. **Update submodules** — for repos with submodules (Android, iOS-Hybrid), update submodule pointers to the test branch.

### Repo-Specific Params

| Repo | noDev | noTag | noTagPrefix | filesWithOrg | submodulePaths |
|------|-------|-------|-------------|--------------|----------------|
| Shared | | | | | |
| Android | | | | `.gitmodules`, `libs/SalesforceReact/package.json` | `./external/shared` |
| iOS | | | | | |
| iOS-Hybrid | | | | `.gitmodules` | `./external/shared`, `./external/SalesforceMobileSDK-iOS` |
| iOS-Specs | ✓ | ✓ | | `update.sh` | |
| iOS-SPM | ✓ | | ✓ | | |
| CordovaPlugin | | | | `./plugin.xml`, `./tools/update.sh` | |
| ReactNative | | | | | |
| Templates | | | | all template `package.json` files | |
| Package | | | | `./shared/constants.js` | |

> **Note:** iOS-SPM currently has `noDev: true` because it has no dev branch. This will be removed as part of W-22921779.

### Running a Full Release Dry Run

```bash
# 1. Set up test branches on your fork
cd release
./setup_test_branches.js
# org: wmathurin, master2, dev2, gh-pages2, version: 13.2.1 (or whatever current is)

# 2. Run the release script against those test branches
./release.js
# org: wmathurin, master2, dev2, gh-pages2, version: 13.2.1, nextVersion: 14.0.0
```

### Cleanup

Re-run with `cleanupOnly: true` to delete all test branches without recreating them.
Or set up fresh test branches by running `setup_test_branches.js` again (it deletes then recreates).

## dev_branch.js — Parallel development branch (e.g. `dev141`)

Use when `dev` holds changes for a patch release that hasn't shipped and the next minor version's work must start. Creates `dev141` in Shared, iOS, Android, iOS-Hybrid, ReactNative, CordovaPlugin, Templates and Package, with every cross-repo pointer (submodule pins, `#dev` in package.json, `branch="dev"` in plugin.xml, hardcoded `dev` in `tools/update.sh` and `test_template.sh`) re-pointed, and `dev141` added to `pr.yaml` and the iOS/Android Danger files. Pointer rules live in `dev_branch_config.js` (unit tested in `unittests/devBranchConfig.test.js`); `point`/`unpoint` are exact inverses and idempotent.

```bash
node release/dev_branch.js <status|setup|point|sync|mergeback|verify|dispatcher> --org <org> --branch <name> [--dir <dir>] [--repos a,b] [--dry-run]
```

`--org` and `--branch` (e.g. `dev141`) are required, as is `--version` for `setup` (nothing is defaulted); `--org forcedotcom` additionally needs `--really`. **Always run against your fork first**, with `--dry-run` (all local work in the clones, no push/PR/`update.sh`). Repo keys, in dependency order: `shared, ios, android, ioshybrid, reactnative, cordovaplugin, templates, pkg`.

| Step | Command | Notes |
|---|---|---|
| Create | `setup --branch dev141 --version 14.1.0` | Per repo: branch off `origin/dev`, `setversion.sh -v 14.1.0 -d yes` (Android `-c` = current versionCode + 1, or `--version-code`), `point`, repin submodules, push. Skips repos that already have the branch. Run `dispatcher` too. |
| Nightlies | `dispatcher` | Opens a PR to `dev` in each repo adding `.github/workflows/nightly-dev141.yaml` (scheduled workflows only run from the default branch; this runs the nightlies with `--ref dev141`, crons +3h). |
| Re-point | `point` | After anything that rewrote refs (e.g. a `setversion.sh` run on `dev141`). |
| Sync | `sync` | Manual. Branch `sync-dev-into-dev141-<date>` off `dev141`, merge `origin/dev`, `point`, push, PR to `dev141`. Conflicts: submodule pins and CordovaPlugin generated files (`src/`, `www/`, gradle wrapper) take the `dev141` side (run `point --repos cordovaplugin` after dependency PRs merge); pointer files edited on both sides are three-way merged on their `dev` form and re-pointed. Stops when both branches changed the same lines; fix, commit, then `--resume`. |
| Merge back | `mergeback` | After the patch release. Branch `dev141-merge-back`, merge `dev`, `unpoint` (also removes the dispatcher workflow, repins submodules), push, PR to `dev`. |
| Check | `verify --ref origin/dev` | No `dev141` string left; every submodule pin reachable from the dependency's `origin/dev`. |
| Report | `status` | Ahead/behind per repo. |

Rules:
- Merge sync and merge-back PRs with **merge commits, never squash** (submodule SHAs must stay reachable), **in dependency order**.
- The patch release (`release.js`) must use next version `14.1.0` so version files on `dev` and `dev141` converge.
- The iOS and Android `dev141` branches need the same branch protection as `dev` (repo admin, manual).
- `sync`/`mergeback` skip repos with nothing to merge, and re-running (or `--resume`) refreshes an already open PR instead of failing.
- Not covered yet: UITests (`AppGenerator.kt`, `install.sh` hardcode `dev`) and the Workspace `install.sh`.
- On forks, `runs-on: forcedotcom-ubuntu` in the workflows must be swapped for `ubuntu-latest` to run CI.
