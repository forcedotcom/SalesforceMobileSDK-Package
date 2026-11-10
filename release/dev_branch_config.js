/*
 * Copyright (c) 2026-present, salesforce.com, inc.
 * All rights reserved.
 * Redistribution and use of this software in source and binary forms, with or
 * without modification, are permitted provided that the following conditions
 * are met:
 * - Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * - Neither the name of salesforce.com, inc. nor the names of its contributors
 * may be used to endorse or promote products derived from this software without
 * specific prior written permission of salesforce.com, inc.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

//
// Manifest and pure rewrite rules for dev_branch.js (parallel development branch, e.g. dev141).
//
// A "pointer" is anything in a repo that names the branch of another repo (or of itself):
// #dev refs in package.json, branch="dev" in plugin.xml, hardcoded dev in scripts, the
// branches list of pr.yaml, ...  `point` rewrites dev -> <branch>, `unpoint` is its exact inverse.
// Both are idempotent so they can be re-run after setversion.sh / merges rewrote things.
//
// Nothing in here touches git or the file system except listFiles(), which makes it unit testable.
//

const fs = require('fs'),
      path = require('path')

const BASE_BRANCH = 'dev'
const MAIN_ORG = 'forcedotcom'

// Repos in dependency order (a repo is processed after the repos it points to)
const REPO_KEYS = ['shared', 'ios', 'android', 'ioshybrid', 'reactnative', 'cordovaplugin', 'templates', 'pkg']

function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

//
// Rule builders. A rule is {files | listFiles, point(content, ctx), unpoint(content, ctx)}
// where ctx is {branch, org}. point/unpoint return the new content.
//

// Swaps the token `dev` that directly follows prefixSrc (a regex source) with the branch.
// `dev141` is never matched by point because the token must not be followed by [\w.-].
function swapBranch(prefixSrc) {
    const NOT_FOLLOWED = '(?![\\w.-])'
    return {
        point: (content, ctx) => content.replace(
            new RegExp(`(${prefixSrc})${escapeRegExp(BASE_BRANCH)}${NOT_FOLLOWED}`, 'g'),
            (m, prefix) => prefix + ctx.branch),
        unpoint: (content, ctx) => content.replace(
            new RegExp(`(${prefixSrc})${escapeRegExp(ctx.branch)}${NOT_FOLLOWED}`, 'g'),
            (m, prefix) => prefix + BASE_BRANCH)
    }
}

// Swaps an exact string for another (the other being a function of the branch).
function swapLiteral(from, toFn) {
    return {
        point: (content, ctx) => content.split(from).join(toFn(ctx.branch)),
        unpoint: (content, ctx) => content.split(toFn(ctx.branch)).join(from)
    }
}

// Swaps org in github urls: forcedotcom <-> ctx.org (only used when testing on a fork)
const ORG_PREFIX_SRC = 'github\\.com[/:]'
const forkRule = {
    point: (content, ctx) => ctx.org === MAIN_ORG ? content : content.replace(
        new RegExp(`(${ORG_PREFIX_SRC})${MAIN_ORG}/`, 'g'), (m, prefix) => `${prefix}${ctx.org}/`),
    unpoint: (content, ctx) => ctx.org === MAIN_ORG ? content : content.replace(
        new RegExp(`(${ORG_PREFIX_SRC})${escapeRegExp(ctx.org)}/`, 'g'), (m, prefix) => `${prefix}${MAIN_ORG}/`)
}

// Rule sources
const SDK_REPO_REF = swapBranch('SalesforceMobileSDK-[\\w-]+(?:\\.git)?#')     // package.json, constants.js, ...
const POD_BRANCH = swapBranch('<pod [^>]*branch="')                           // plugin.xml
const UPDATE_SH_CLONE = swapBranch('update_repo "\\$\\{(?:IOS_SDK|SHARED_SDK)_FOLDER\\}" "\\$\\{\\w+\\}" "')  // CordovaPlugin tools/update.sh
const TEST_TEMPLATE_DEFAULT = swapBranch('\\$\\{(?:MSDK_IOS_BRANCH|MSDK_ANDROID_BRANCH|RN_FORCE_BRANCH):-')  // Templates test_template.sh
const PR_BRANCHES = swapLiteral('branches: [dev, master]', b => `branches: [dev, ${b}, master]`)
const DANGER_IOS = swapLiteral('github.branch_for_base != "dev"', b => `!["dev", "${b}"].include?(github.branch_for_base)`)
const DANGER_ANDROID = swapLiteral('!["dev", "dpop"].include?(github.branch_for_base)', b => `!["dev", "dpop", "${b}"].include?(github.branch_for_base)`)

const PR_YAML = '.github/workflows/pr.yaml'
const DANGER = '.github/DangerFiles/TestOrchestrator.rb'

// Lists directories' package.json that carry SDK pointers
function templatePackageJsons(repoDir) {
    return fs.readdirSync(repoDir, {withFileTypes: true})
        .filter(d => d.isDirectory() && fs.existsSync(path.join(repoDir, d.name, 'package.json')))
        .map(d => path.join(d.name, 'package.json'))
        .filter(f => /SalesforceMobileSDK/.test(fs.readFileSync(path.join(repoDir, f), 'utf8')))
        .sort()
}

//
// Manifest
//   rules:        pointer rewrites; a rule whose files are missing, or in which neither
//                 the dev form nor the branch form is found, is reported as an error
//   forkExtra:    extra files where the org must be swapped when testing on a fork
//   submodules:   {path, dep} - pinned to the head of repo `dep` on the target branch
//   nightly:      nightly workflows to dispatch on the branch, with the cron of the dispatcher
//                 (existing crons shifted by +3h so dev and dev141 nightlies don't run together)
//
const MANIFEST = {
    shared: {
        repo: 'SalesforceMobileSDK-Shared',
        rules: []
    },
    ios: {
        repo: 'SalesforceMobileSDK-iOS',
        rules: [
            {files: [PR_YAML], ...PR_BRANCHES},
            {files: [DANGER], ...DANGER_IOS}
        ],
        nightly: [
            {workflow: 'nightly.yaml', cron: '0 8 * * 2-6'},
            {workflow: 'ui-test-nightly.yaml', cron: '0 10 * * 2-6'}
        ]
    },
    android: {
        repo: 'SalesforceMobileSDK-Android',
        rules: [
            {files: [PR_YAML], ...PR_BRANCHES},
            {files: [DANGER], ...DANGER_ANDROID}
        ],
        forkExtra: ['.gitmodules'],
        submodules: [{path: 'external/shared', dep: 'shared'}],
        nightly: [{workflow: 'nightly.yaml', cron: '30 9 * * 2-6'}],
        versionManifest: 'libs/SalesforceSDK/AndroidManifest.xml'
    },
    ioshybrid: {
        repo: 'SalesforceMobileSDK-iOS-Hybrid',
        rules: [
            {files: [PR_YAML], ...PR_BRANCHES}
        ],
        forkExtra: ['.gitmodules'],
        submodules: [{path: 'external/shared', dep: 'shared'}, {path: 'external/SalesforceMobileSDK-iOS', dep: 'ios'}],
        nightly: [{workflow: 'nightly.yaml', cron: '30 8 * * 3,5'}]
    },
    reactnative: {
        repo: 'SalesforceMobileSDK-ReactNative',
        rules: [
            {files: [PR_YAML], ...PR_BRANCHES},
            {files: ['androidTests/package.json', 'iosTests/package.json'], ...SDK_REPO_REF}
        ],
        nightly: [{workflow: 'nightly.yaml', cron: '30 8 * * 2,4,6'}]
    },
    cordovaplugin: {
        repo: 'SalesforceMobileSDK-CordovaPlugin',
        rules: [
            {files: ['plugin.xml'], ...POD_BRANCH},
            {files: ['tools/update.sh'], ...UPDATE_SH_CLONE}
        ],
        forkExtra: ['tools/update.sh', 'plugin.xml'],
        // src/ is generated by tools/update.sh from Shared, iOS-Hybrid, Android (and iOS for shared sources)
        generate: ['./tools/update.sh', '-b', '{branch}', '-i', '{org}', '-a', '{org}'],
        // paths written by update.sh: never merged by hand, regenerated instead
        generated: ['src/', 'www/', 'gradle/', 'gradle.properties', 'gradlew', 'gradlew.bat']
    },
    templates: {
        repo: 'SalesforceMobileSDK-Templates',
        rules: [
            {files: [PR_YAML], ...PR_BRANCHES},
            {listFiles: templatePackageJsons, ...SDK_REPO_REF},
            {files: ['test_template.sh'], ...swapBranch('SalesforceMobileSDK-CordovaPlugin#')},
            {files: ['test_template.sh'], ...TEST_TEMPLATE_DEFAULT}
        ],
        nightly: [{workflow: 'nightly.yaml', cron: '0 13 * * 1,3,5'}]
    },
    pkg: {
        repo: 'SalesforceMobileSDK-Package',
        rules: [
            {files: [PR_YAML], ...PR_BRANCHES},
            {files: ['shared/constants.js'], ...SDK_REPO_REF}
        ],
        nightly: [{workflow: 'nightly.yaml', cron: '0 13 * * 2,4'}]
    }
}

//
// Pure functions
//

// Files a rule applies to (relative to repoDir)
function ruleFiles(rule, repoDir) {
    return rule.listFiles ? rule.listFiles(repoDir) : rule.files
}

// Resolves a rule's file list against a checked-out repo (expands listFiles)
function expandedRules(repoKey, repoDir) {
    return MANIFEST[repoKey].rules.map(rule => Object.assign({}, rule, {paths: ruleFiles(rule, repoDir)}))
}

// Files that need to be read from disk for a repo
function filesToRead(repoKey, repoDir) {
    const set = new Set(MANIFEST[repoKey].forkExtra || [])
    expandedRules(repoKey, repoDir).forEach(r => r.paths.forEach(p => set.add(p)))
    return Array.from(set).sort()
}

// Applies all rules (and the fork rule) of a repo on in-memory files.
//   files: {relativePath: content}; rules: expanded rules (each with .paths)
// Returns {files (new contents), changedPaths, problems}
function applyRules(repoKey, files, direction, ctx, rules) {
    const cfg = MANIFEST[repoKey]
    rules = rules || cfg.rules.map(r => Object.assign({}, r, {paths: r.files || []}))
    const out = Object.assign({}, files)
    const changedPaths = new Set()
    const problems = []

    const apply = (rule, relPath, label, required) => {
        if (!(relPath in out)) {
            if (required) problems.push(`${repoKey}: missing file ${relPath} (${label})`)
            return
        }
        const result = rule[direction](out[relPath], ctx)
        if (result !== out[relPath]) {
            out[relPath] = result
            changedPaths.add(relPath)
        } else if (required && rule.point(out[relPath], ctx) === out[relPath]
                   && rule.unpoint(out[relPath], ctx) === out[relPath]) {
            problems.push(`${repoKey}: ${relPath} matches neither the dev nor the ${ctx.branch} form of rule ${label} - pointer rules need updating`)
        }
    }

    // On unpoint, undo rules in reverse order
    const ordered = direction === 'point' ? rules : rules.slice().reverse()
    ordered.forEach((rule, i) => rule.paths.forEach(p => apply(rule, p, rule.name || `#${i}`, !rule.listFiles)))

    // Fork rule on all files that carry pointers
    const forkPaths = new Set((cfg.forkExtra || []).concat(...rules.map(r => r.paths)))
    forkPaths.forEach(p => apply(forkRule, p, 'fork', false))

    return {files: out, changedPaths: Array.from(changedPaths).sort(), problems}
}

// Applies the rules of a repo to the content of a single file (rules that don't cover relPath are no-ops)
function transformFile(repoKey, repoDir, relPath, content, direction, ctx) {
    const r = applyRules(repoKey, {[relPath]: content}, direction, ctx, expandedRules(repoKey, repoDir))
    return r.files[relPath]
}

// True if relPath is written by a generator script (see MANIFEST[...].generated)
function isGenerated(repoKey, relPath) {
    return (MANIFEST[repoKey].generated || []).some(g => g.endsWith('/') ? relPath.startsWith(g) : relPath === g)
}

// Reads the files of a repo from disk, applies the rules, writes back what changed
function applyRulesOnDisk(repoKey, repoDir, direction, ctx) {
    const files = {}
    filesToRead(repoKey, repoDir).forEach(p => {
        const full = path.join(repoDir, p)
        if (fs.existsSync(full)) files[p] = fs.readFileSync(full, 'utf8')
    })
    const result = applyRules(repoKey, files, direction, ctx, expandedRules(repoKey, repoDir))
    result.changedPaths.forEach(p => fs.writeFileSync(path.join(repoDir, p), result.files[p]))
    return result
}

// Content of the workflow (on the default branch) that dispatches the nightly workflows on the branch
function dispatcherWorkflow(repoKey, branch, org) {
    const cfg = MANIFEST[repoKey]
    const runner = org === MAIN_ORG
        ? 'forcedotcom-ubuntu  # forks: use ubuntu-latest (org-scoped runner)'
        : 'ubuntu-latest'
    // One cron entry per distinct cron; each job dispatches the workflows that share it
    const crons = Array.from(new Set(cfg.nightly.map(n => n.cron)))
    const triggers = crons.map(c => `    - cron: "${c}"  # cron is UTC; see nightly workflows (shifted +3h)`).join('\n')
    const dispatches = cfg.nightly.map(n => `          if [ "\${{ github.event.schedule }}" == "" ] || [ "\${{ github.event.schedule }}" == "${n.cron}" ]; then
            gh workflow run ${n.workflow} --repo "$REPO" --ref ${branch}
          fi`).join('\n')
    return `name: Nightly Dispatcher (${branch})

# Scheduled workflows only run from the default branch, so this dispatches the nightly
# workflows on the ${branch} branch. Delete this file when ${branch} is merged back to dev.

on:
  schedule:
${triggers}
  # This lets us trigger the workflow from a browser.
  workflow_dispatch:

permissions:
  contents: read

jobs:
  dispatch:
    runs-on: ${runner}
    permissions:
      actions: write
    steps:
      - name: Dispatch nightly workflows on ${branch}
        env:
          GH_TOKEN: \${{ github.token }}
          REPO: \${{ github.repository }}
        run: |
${dispatches}
`
}

// Files that legitimately mention the branch name after merge-back: the tool, its docs and tests,
// lock files. `verify` ignores them.
const VERIFY_EXCLUDES = ['release/dev_branch*.js', 'release/README.md', 'unittests/devBranchConfig.test.js',
                         'unittests/devBranchScript.test.js', '**/*.lock', '**/package-lock.json']

function dispatcherPath(branch) {
    return `.github/workflows/nightly-${branch}.yaml`
}

module.exports = {
    BASE_BRANCH,
    MAIN_ORG,
    REPO_KEYS,
    MANIFEST,
    VERIFY_EXCLUDES,
    applyRules,
    applyRulesOnDisk,
    dispatcherPath,
    dispatcherWorkflow,
    expandedRules,
    filesToRead,
    isGenerated,
    transformFile,
    swapBranch,
    swapLiteral
}
