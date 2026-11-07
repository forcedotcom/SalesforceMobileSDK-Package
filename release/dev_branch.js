#!/usr/bin/env node
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
// Manages a parallel development branch (e.g. dev141) across the connected Mobile SDK repos.
// See release/README.md ("Parallel development branch") for the runbook.
//
//   dev_branch.js <command> --org <org> --branch <name> [options]
//
// Commands:
//   status     read-only: ahead/behind of origin/dev vs origin/<branch> per repo
//   setup      create <branch> off dev in each repo (dependency order), bump version, point, push
//   point      re-apply the pointer rewrites on <branch> (e.g. after a setversion.sh), commit, push
//   sync       merge dev into <branch> on a sync branch, point, push, open a PR to <branch>
//   mergeback  merge dev into <branch> on a mergeback branch, unpoint, push, open a PR to dev
//   verify     check that --ref (default origin/dev) has no <branch> pointers left
//   dispatcher write the nightly dispatcher workflows (to be committed on dev) - see README
//
// Options:
//   --org <org>            GitHub org owning the repos (required; forcedotcom needs --really)
//   --branch <name>        parallel branch name, e.g. dev141 (required)
//   --dir <path>           work directory (default: new tmp dir)
//   --repos a,b            subset of repo keys (default all, dependency order)
//   --version <v>          version set on <branch> by setup, e.g. 14.1.0 (required for setup)
//   --version-code <n>     Android versionCode for setup (default: current + 1)
//   --ref <ref>            verify: ref to check (default origin/dev)
//   --dry-run              do everything locally in the clones; no push, no PR, no update.sh
//   --auto-yes             do not prompt
//   --really               allow --org forcedotcom
//

const fs = require('fs'),
      childProcess = require('child_process'),
      path = require('path'),
      utils = require('../shared/utils'),
      COLOR = require('../shared/outputColors'),
      common = require('./common.js'),
      cfg = require('./dev_branch_config.js')

const BASE = cfg.BASE_BRANCH

//
// Helpers
//
function parseArgs(argv) {
    const args = {_: []}
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a.startsWith('--')) {
            const key = a.slice(2)
            const isFlag = ['dry-run', 'auto-yes', 'really', 'resume'].includes(key)
            args[key] = isFlag ? true : argv[++i]
        } else {
            args._.push(a)
        }
    }
    return args
}

function sh(cmd, dir, opts) {
    opts = opts || {}
    try {
        return utils.runProcessThrowError(cmd, dir, true) || ''
    } catch (e) {
        if (opts.ignoreError) return null
        throw new Error(`Command failed in ${dir}: ${cmd}\n${(e.stderr || e.message || '').toString()}`)
    }
}

const out = (cmd, dir) => sh(cmd, dir).trim()
const ok = (cmd, dir) => sh(cmd, dir, {ignoreError: true}) !== null
const info = (msg, color) => utils.logInfo(msg, color || COLOR.green)

function fail(msg) {
    utils.logError(msg)
    process.exit(1)
}

function stamp() {
    return new Date().toISOString().slice(0, 10)
}

//
// Context: paths + options for the run
//
function makeContext(args) {
    const org = args.org
    if (!org) fail('--org is required (use your fork, e.g. --org wmathurin, to test)')
    if (org === cfg.MAIN_ORG && !args.really) fail(`--org ${cfg.MAIN_ORG} requires --really`)

    const branch = args.branch
    if (!branch) fail('--branch is required (e.g. --branch dev141)')
    if (branch === BASE || branch === 'master') fail(`--branch can't be ${branch}`)

    const keys = args.repos ? args.repos.split(',') : cfg.REPO_KEYS.slice()
    keys.forEach(k => { if (!cfg.MANIFEST[k]) fail(`Unknown repo key ${k} (known: ${cfg.REPO_KEYS.join(',')})`) })

    const dir = args.dir ? (utils.mkDirIfNeeded(args.dir), path.resolve(args.dir)) : utils.mkTmpDir()
    return {
        org, branch, dir, keys,
        dryRun: !!args['dry-run'],
        version: args.version,
        versionCode: args['version-code'],
        ref: args.ref || `origin/${BASE}`,
        rewriteCtx: {org, branch}
    }
}

const repoDir = (ctx, key) => path.join(ctx.dir, cfg.MANIFEST[key].repo)

// Clones (or fetches) a repo; leaves it with a clean tree and up to date remotes
function prepareClone(ctx, key) {
    const repo = cfg.MANIFEST[key].repo
    const dir = repoDir(ctx, key)
    if (!fs.existsSync(dir)) {
        info(`Cloning ${ctx.org}/${repo}`)
        sh(`git clone ${common.urlForRepo(ctx.org, repo)} ${repo}`, ctx.dir)
    }
    sh('git reset --hard -q && git clean -fdq', dir)
    sh('git fetch origin --prune', dir)
    return dir
}

const remoteHas = (dir, branch) => ok(`git rev-parse --verify -q refs/remotes/origin/${branch}`, dir)

function commitIfChanged(dir, msg) {
    sh('git add -A', dir)
    if (out('git status --porcelain', dir) === '') {
        info('  nothing to commit')
        return false
    }
    sh(`git commit -q -m ${JSON.stringify(msg)}`, dir)
    return true
}

// True if HEAD adds nothing on top of origin/<base>
function noNewCommits(dir, base) {
    return out(`git rev-list --count origin/${base}..HEAD`, dir) === '0'
}

function push(ctx, dir, branch) {
    if (ctx.dryRun) return info(`  [dry-run] would push ${branch}`, COLOR.yellow)
    sh(`git push -u origin ${branch}`, dir)
}

// Opens the PR, or refreshes it if one is already open for the head (re-runs, --resume)
function openPr(ctx, key, head, base, title, body) {
    const repo = cfg.MANIFEST[key].repo
    if (ctx.dryRun) return info(`  [dry-run] would open PR ${head} -> ${base} on ${ctx.org}/${repo}`, COLOR.yellow)
    const dir = repoDir(ctx, key)
    const bodyFile = path.join(ctx.dir, `${repo}-pr-body.md`)
    fs.writeFileSync(bodyFile, body)
    const target = `--repo ${ctx.org}/${repo}`
    let lastError
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const existing = out(`gh pr list ${target} --base ${base} --head ${head} --state open --json url -q '.[0].url'`, dir)
            if (existing) {
                sh(`gh pr edit ${existing} --title ${JSON.stringify(title)} --body-file ${JSON.stringify(bodyFile)}`, dir)
                info(`  PR (updated): ${existing}`, COLOR.cyan)
                return existing
            }
            const url = out(`gh pr create ${target} --base ${base} --head ${head} --title ${JSON.stringify(title)} --body-file ${JSON.stringify(bodyFile)}`, dir)
            info(`  PR: ${url}`, COLOR.cyan)
            return url
        } catch (e) {
            lastError = e
            utils.logError(`PR attempt ${attempt} failed: ${e.message.split('\n')[0]}`)
        }
    }
    throw lastError
}

//
// Submodules: pinned to the head of the dependency's work branch in its local clone, so no
// ordering on pushes is needed (only that the dependency was processed first)
//
function repinSubmodules(ctx, key, workBranchOf) {
    const subs = cfg.MANIFEST[key].submodules || []
    if (!subs.length) return
    const dir = repoDir(ctx, key)
    sh('git submodule sync', dir)
    sh('git submodule update --init', dir)
    subs.forEach(sub => {
        const depDir = repoDir(ctx, sub.dep)
        const depBranch = workBranchOf(sub.dep)
        const subDir = path.join(dir, sub.path)
        info(`  repin ${sub.path} -> ${cfg.MANIFEST[sub.dep].repo}@${depBranch}`)
        sh(`git fetch -q ${JSON.stringify(depDir)} refs/heads/${depBranch}`, subDir)
        sh('git checkout -q FETCH_HEAD', subDir)
        sh(`git add ${sub.path}`, dir)
    })
}

function applyPointers(ctx, key, direction) {
    const dir = repoDir(ctx, key)
    const r = cfg.applyRulesOnDisk(key, dir, direction, ctx.rewriteCtx)
    if (r.problems.length) {
        r.problems.forEach(p => utils.logError(p))
        fail(`${direction} of ${key} failed: pointer rules no longer match the files`)
    }
    info(`  ${direction}: ${r.changedPaths.length ? r.changedPaths.join(', ') : 'no change'}`)
}

// CordovaPlugin src/ is generated by update.sh from the other repos' <branch>
function regenerateCordovaPlugin(ctx, key) {
    const gen = cfg.MANIFEST[key].generate
    if (!gen) return
    if (ctx.dryRun) return info('  [dry-run] would run tools/update.sh (needs pushed branches)', COLOR.yellow)
    const cmd = gen.map(a => a.replace('{branch}', ctx.branch).replace('{org}', ctx.org)).join(' ') + ' -o all'
    sh(cmd, repoDir(ctx, key))
}

function runSetVersion(ctx, key, dir) {
    if (!fs.existsSync(path.join(dir, 'setversion.sh'))) return
    let cmd = `./setversion.sh -v ${ctx.version} -d yes`
    const manifest = cfg.MANIFEST[key].versionManifest
    if (manifest) {
        let code = ctx.versionCode
        if (!code) {
            const m = fs.readFileSync(path.join(dir, manifest), 'utf8').match(/android:versionCode="(\d+)"/)
            if (!m) fail(`Can't read versionCode in ${manifest}; pass --version-code`)
            code = parseInt(m[1], 10) + 1
        }
        cmd += ` -c ${code}`
    }
    sh(cmd, dir)
}

//
// Commands
//
function status(ctx) {
    ctx.keys.forEach(key => {
        const dir = prepareClone(ctx, key)
        if (!remoteHas(dir, ctx.branch)) return info(`${cfg.MANIFEST[key].repo}: no origin/${ctx.branch}`, COLOR.yellow)
        const [behind, ahead] = out(`git rev-list --left-right --count origin/${BASE}...origin/${ctx.branch}`, dir).split(/\s+/)
        info(`${cfg.MANIFEST[key].repo}: ${ctx.branch} is ${ahead} ahead and ${behind} behind ${BASE}`,
             behind === '0' ? COLOR.green : COLOR.yellow)
    })
}

function setup(ctx) {
    ctx.keys.forEach(key => {
        const repo = cfg.MANIFEST[key].repo
        info(`\n=== setup ${repo} ===`, COLOR.magenta)
        const dir = prepareClone(ctx, key)
        if (remoteHas(dir, ctx.branch)) {
            info(`  origin/${ctx.branch} exists - skipping creation (use 'point' to re-apply pointers)`, COLOR.yellow)
            sh(`git checkout -q -B ${ctx.branch} origin/${ctx.branch}`, dir)
            return
        }
        sh(`git checkout -q -B ${ctx.branch} origin/${BASE}`, dir)
        runSetVersion(ctx, key, dir)
        applyPointers(ctx, key, 'point')
        repinSubmodules(ctx, key, () => ctx.branch)
        regenerateCordovaPlugin(ctx, key)
        commitIfChanged(dir, `Setting up ${ctx.branch}: version ${ctx.version}, pointing to ${ctx.branch}`)
        push(ctx, dir, ctx.branch)
    })
}

function point(ctx) {
    ctx.keys.forEach(key => {
        info(`\n=== point ${cfg.MANIFEST[key].repo} ===`, COLOR.magenta)
        const dir = prepareClone(ctx, key)
        if (!remoteHas(dir, ctx.branch)) fail(`No origin/${ctx.branch} in ${cfg.MANIFEST[key].repo}`)
        sh(`git checkout -q -B ${ctx.branch} origin/${ctx.branch}`, dir)
        applyPointers(ctx, key, 'point')
        repinSubmodules(ctx, key, () => ctx.branch)
        regenerateCordovaPlugin(ctx, key)
        if (commitIfChanged(dir, `Re-applying ${ctx.branch} pointers`)) push(ctx, dir, ctx.branch)
    })
}

// Three-way merges a pointer file on its dev form, so that a pointer rewrite on one side
// does not conflict with real edits on the other. Returns merged (pointed) content, or null if
// the two sides really changed the same lines.
function mergePointerFile(ctx, key, dir, file) {
    // raw bytes: sh() output may be trimmed
    const stage = n => {
        const r = childProcess.spawnSync('git', ['show', `:${n}:${file}`], {cwd: dir, maxBuffer: 64 * 1024 * 1024})
        return r.status === 0 ? r.stdout.toString() : null
    }
    const base = stage(1), ours = stage(2), theirs = stage(3)
    if (ours === null || theirs === null) return null      // deleted on one side
    const norm = c => cfg.transformFile(key, dir, file, c, 'unpoint', ctx.rewriteCtx)
    const tmp = fs.mkdtempSync(path.join(ctx.dir, 'merge-'))
    try {
        const paths = {ours: norm(ours), base: norm(base || ''), theirs: norm(theirs)}
        Object.keys(paths).forEach(k => fs.writeFileSync(path.join(tmp, k), paths[k]))
        const r = childProcess.spawnSync('git', ['merge-file', '-p', 'ours', 'base', 'theirs'], {cwd: tmp})
        if (r.status !== 0) return null
        return cfg.transformFile(key, dir, file, r.stdout.toString(), 'point', ctx.rewriteCtx)
    } finally {
        fs.rmSync(tmp, {recursive: true, force: true})
    }
}

// Resolves what is mechanical in a conflicted merge; returns {remaining, notes}
//   submodule pins     -> ours; repinned afterwards to the dependency's work branch
//   generated files    -> ours; regenerated later by 'point' (update.sh reads pushed branches)
//   pointer files      -> three-way merge on the dev form, then re-pointed
//   anything else      -> left for a human, including pointer files where both sides edited the same lines
function resolveConflicts(ctx, key, dir) {
    const conflicts = out('git diff --name-only --diff-filter=U', dir).split('\n').filter(Boolean)
    const subPaths = (cfg.MANIFEST[key].submodules || []).map(s => s.path)
    const pointerFiles = new Set(cfg.filesToRead(key, dir))
    const notes = []
    let generated = 0
    conflicts.forEach(f => {
        if (subPaths.includes(f)) {
            sh(`git checkout --ours -- ${f} && git add ${f}`, dir)
        } else if (cfg.isGenerated(key, f)) {
            sh(`git checkout --ours -- ${JSON.stringify(f)} && git add ${JSON.stringify(f)}`, dir)
            generated++
        } else if (pointerFiles.has(f)) {
            const merged = mergePointerFile(ctx, key, dir, f)
            if (merged === null) return
            fs.writeFileSync(path.join(dir, f), merged)
            sh(`git add ${JSON.stringify(f)}`, dir)
            notes.push(`merged ${f} on its dev form (both sides edited it)`)
        }
    })
    if (generated) notes.push(`${generated} generated file(s) kept as on ${ctx.branch}: once the dependency PRs are merged, run 'point --repos ${key}' to regenerate`)
    const remaining = out('git diff --name-only --diff-filter=U', dir).split('\n').filter(Boolean)
    return {remaining, notes}
}

// Shared by sync and mergeback: merge dev into a work branch cut from <branch>
function mergeDevInto(ctx, key, workBranch) {
    const dir = prepareClone(ctx, key)
    sh(`git checkout -q -B ${workBranch} origin/${ctx.branch}`, dir)
    try {
        sh(`git merge --no-ff --no-edit -m "Merge ${BASE} into ${ctx.branch}" origin/${BASE}`, dir)
    } catch (e) {
        const {remaining, notes} = resolveConflicts(ctx, key, dir)
        notes.forEach(n => info(`  ${n}`, COLOR.yellow))
        if (remaining.length) {
            fail(`Merge conflicts in ${cfg.MANIFEST[key].repo} (${dir}, branch ${workBranch}): ${BASE} and ${ctx.branch} changed the same lines of:\n  ${remaining.join('\n  ')}\n` +
                 `Resolve them, 'git add', 'git commit', then re-run with --resume --repos ${key}` +
                 (cfg.MANIFEST[key].submodules || cfg.MANIFEST[key].generated ? ' (repos listed before this one are already done)' : ''))
        }
        sh('git commit -q --no-edit', dir)
        ctx.notes = (ctx.notes || []).concat(notes.map(n => `${cfg.MANIFEST[key].repo}: ${n}`))
    }
    return dir
}

// --resume continues on the existing work branch; repos that never got one start from scratch
function resumeOrMerge(ctx, key, workBranch, args) {
    const dir = repoDir(ctx, key)
    if (args.resume && fs.existsSync(dir) && ok(`git rev-parse --verify -q refs/heads/${workBranch}`, dir)) {
        sh(`git checkout -q ${workBranch}`, dir)
        return dir
    }
    return mergeDevInto(ctx, key, workBranch)
}

function sync(ctx, args) {
    const workBranch = `sync-${BASE}-into-${ctx.branch}-${stamp()}`
    ctx.keys.forEach(key => {
        const repo = cfg.MANIFEST[key].repo
        info(`\n=== sync ${repo} ===`, COLOR.magenta)
        const dir = resumeOrMerge(ctx, key, workBranch, args)
        // Merging dev may have brought back dev refs (setversion on dev, new files...)
        applyPointers(ctx, key, 'point')
        repinSubmodules(ctx, key, () => workBranch)
        commitIfChanged(dir, `Re-applying ${ctx.branch} pointers after merging ${BASE}`)
        if (noNewCommits(dir, ctx.branch)) return info(`  ${ctx.branch} already contains ${BASE} - nothing to sync`)
        push(ctx, dir, workBranch)
        openPr(ctx, key, workBranch, ctx.branch,
               `Sync ${BASE} into ${ctx.branch} (${stamp()})`,
               `Merges ${BASE} into ${ctx.branch} and re-applies the ${ctx.branch} pointers.\n\n**Merge with a merge commit (not squash), in dependency order: ${cfg.REPO_KEYS.join(', ')}.**`)
    })
}

function mergeback(ctx, args) {
    const workBranch = `${ctx.branch}-merge-back`
    ctx.keys.forEach(key => {
        const repo = cfg.MANIFEST[key].repo
        info(`\n=== mergeback ${repo} ===`, COLOR.magenta)
        const dir = resumeOrMerge(ctx, key, workBranch, args)
        applyPointers(ctx, key, 'unpoint')
        // The nightly dispatcher only exists for the life of the branch
        sh(`git rm -q -f --ignore-unmatch ${cfg.dispatcherPath(ctx.branch)}`, dir)
        // Submodules go to the dependency's merge-back head: it lands on dev with a merge commit
        repinSubmodules(ctx, key, () => workBranch)
        commitIfChanged(dir, `Removing ${ctx.branch} pointers`)
        if (noNewCommits(dir, BASE)) return info(`  nothing to merge back`)
        push(ctx, dir, workBranch)
        openPr(ctx, key, workBranch, BASE,
               `Merge ${ctx.branch} into ${BASE}`,
               `Brings the ${ctx.branch} work into ${BASE} and removes the ${ctx.branch} pointers.\n\n**Merge with a merge commit (not squash), in dependency order: ${cfg.REPO_KEYS.join(', ')}.** Then run \`dev_branch.js verify\`.`)
    })
}

function verify(ctx) {
    let bad = 0
    ctx.keys.forEach(key => {
        const before = bad
        const repo = cfg.MANIFEST[key].repo
        const dir = prepareClone(ctx, key)
        const hits = out(`git grep -n -I -e ${JSON.stringify(ctx.branch)} ${ctx.ref} -- . ':!*.lock' ':!package-lock.json' || true`, dir)
        if (hits) {
            bad++
            utils.logError(`${repo}: ${ctx.branch} still referenced at ${ctx.ref}:\n${hits.split('\n').slice(0, 20).join('\n')}`)
        }
        // Every submodule pin must be reachable from the dependency's dev
        const refForPins = ctx.ref
        ;(cfg.MANIFEST[key].submodules || []).forEach(sub => {
            const pin = out(`git ls-tree ${refForPins} ${sub.path}`, dir).split(/\s+/)[2]
            const depDir = prepareClone(ctx, sub.dep)
            if (!ok(`git merge-base --is-ancestor ${pin} origin/${BASE}`, depDir)) {
                bad++
                utils.logError(`${repo}: ${sub.path} pin ${pin} is not reachable from ${cfg.MANIFEST[sub.dep].repo} origin/${BASE}`)
            }
        })
        if (bad === before) info(`${repo}: ok`)
    })
    if (bad) process.exit(1)
}

// Writes the dispatcher workflows in each clone's working tree on a branch off dev (to be PR'd to dev)
function dispatcher(ctx) {
    const workBranch = `nightly-dispatcher-${ctx.branch}`
    ctx.keys.filter(k => cfg.MANIFEST[k].nightly).forEach(key => {
        info(`\n=== dispatcher ${cfg.MANIFEST[key].repo} ===`, COLOR.magenta)
        const dir = prepareClone(ctx, key)
        sh(`git checkout -q -B ${workBranch} origin/${BASE}`, dir)
        const file = path.join(dir, cfg.dispatcherPath(ctx.branch))
        fs.writeFileSync(file, cfg.dispatcherWorkflow(key, ctx.branch, ctx.org))
        if (commitIfChanged(dir, `Dispatch nightly workflows on ${ctx.branch}`)) {
            push(ctx, dir, workBranch)
            openPr(ctx, key, workBranch, BASE, `Run nightly workflows on ${ctx.branch}`,
                   `Scheduled workflows only run from the default branch. This dispatches them on ${ctx.branch}. Remove at merge-back.`)
        }
    })
}

//
// Main
//
function main() {
    const args = parseArgs(process.argv.slice(2))
    const command = args._[0]
    const commands = {status, setup, point, sync, mergeback, verify, dispatcher}
    if (!commands[command]) {
        console.error(`Usage: dev_branch.js <${Object.keys(commands).join('|')}> --org <org> --branch <name> [options] (see header of this file)`)
        process.exit(1)
    }
    utils.setLogLevel(utils.LOG_LEVELS.INFO)
    common.setAutoYesForPrompts(!!args['auto-yes'])
    const ctx = makeContext(args)
    if (command === 'setup' && !ctx.version) fail('--version is required for setup (e.g. --version 14.1.0)')
    info(`${command} on ${ctx.org} (${ctx.branch}) in ${ctx.dir}${ctx.dryRun ? ' [dry-run]' : ''}`, COLOR.cyan)
    commands[command](ctx, args)
}

if (require.main === module) {
    main()
}

module.exports = {parseArgs, resolveConflicts, mergePointerFile}
