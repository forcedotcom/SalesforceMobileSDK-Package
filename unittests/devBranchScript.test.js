const fs = require('fs'),
      os = require('os'),
      path = require('path'),
      cp = require('child_process')

const script = require('../release/dev_branch.js')

const run = (cmd, cwd) => cp.execSync(cmd, {cwd, stdio: 'pipe'}).toString()
const GIT = 'git -c user.email=t@t -c user.name=t'
const REPO = 'SalesforceMobileSDK-ReactNative'
const PKG = 'androidTests/package.json'
const pkgJson = (ref, b = 'y') =>
    `{\n "a": "x",\n "react-native-force": "git+https://github.com/forcedotcom/SalesforceMobileSDK-ReactNative.git#${ref}",\n "b": "${b}",\n "c": "z"\n}\n`

// A work dir with a local "origin" and a clone named like the real repo, so no network is needed
function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'devbranch-'))
    const origin = path.join(root, 'origin.git'), seed = path.join(root, 'seed'), work = path.join(root, 'work')
    fs.mkdirSync(work)
    run(`git init -q --bare -b dev ${origin}`, root)
    run(`git clone -q ${origin} ${seed}`, root)
    fs.mkdirSync(path.join(seed, 'androidTests'))
    fs.mkdirSync(path.join(seed, 'iosTests'))
    ;['androidTests', 'iosTests'].forEach(d => fs.writeFileSync(path.join(seed, d, 'package.json'), pkgJson('dev')))
    fs.mkdirSync(path.join(seed, '.github/workflows'), {recursive: true})
    fs.writeFileSync(path.join(seed, '.github/workflows/pr.yaml'), 'on:\n  pull_request_target:\n    branches: [dev, master]\n')
    fs.writeFileSync(path.join(seed, 'src.txt'), 'one\n')
    run(`git checkout -q -B dev && git add -A && ${GIT} commit -qm base && git push -q origin dev`, seed)
    run(`git checkout -q -b dev141 && git push -q origin dev141`, seed)
    run(`git clone -q ${origin} ${path.join(work, REPO)}`, root)
    const ctx = {org: 'forcedotcom', branch: 'dev141', dir: work, keys: ['reactnative'], rewriteCtx: {org: 'forcedotcom', branch: 'dev141'}}
    return {root, seed, work, ctx, dir: path.join(work, REPO)}
}

const commitSeed = (f, file, content, branch, msg) => {
    run(`git checkout -q ${branch}`, f.seed)
    fs.writeFileSync(path.join(f.seed, file), content)
    run(`git add -A && ${GIT} commit -qm "${msg}" && git push -q origin ${branch}`, f.seed)
}

function lifecycleFixture(branch) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'devbranch-lifecycle-'))
    const origin = path.join(root, 'origin.git'), seed = path.join(root, 'seed'), work = path.join(root, 'work')
    fs.mkdirSync(work)
    run(`git init -q --bare -b dev ${origin}`, root)
    run(`git clone -q ${origin} ${seed}`, root)
    fs.mkdirSync(path.join(seed, '.github/workflows'), {recursive: true})
    fs.writeFileSync(path.join(seed, '.github/workflows/pr.yaml'),
        "on:\n  pull_request_target:\n    branches: [dev, 'dev[0-9]*', master]\n")
    fs.mkdirSync(path.join(seed, 'unittests'))
    fs.writeFileSync(path.join(seed, 'unittests/devBranchScript.test.js'), `// Tool fixture for ${branch}\n`)
    ;['androidTests', 'iosTests'].forEach(name => {
        fs.mkdirSync(path.join(seed, name))
        fs.writeFileSync(path.join(seed, name, 'package.json'), pkgJson('dev'))
    })
    run(`git add -A && ${GIT} commit -qm base && git push -q origin dev`, seed)
    const dir = path.join(work, REPO)
    run(`git clone -q ${origin} ${dir}`, root)
    run('git config user.name Test && git config user.email test@example.com', dir)
    const bin = path.join(root, 'bin')
    fs.mkdirSync(bin)
    const gh = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === 'api') {
    process.stdout.write(args[args.length - 1].includes('/pulls?') ? '[[]]' :
        ${JSON.stringify(JSON.stringify({default_branch: 'dev', clone_url: origin}))});
} else if (args[0] === 'pr' && args[1] === 'create') {
    process.stdout.write('https://example.invalid/pull/1');
} else if (!(args[0] === 'pr' && args[1] === 'list')) {
    process.exit(1);
}
`
    fs.writeFileSync(path.join(bin, 'gh'), gh, {mode: 0o755})
    const cli = (command, expectedStatus = 0) => {
        const r = cp.spawnSync(process.execPath, [path.resolve(__dirname, '../release/dev_branch.js'), command,
            '--org', 'example', '--branch', branch, '--dir', work, '--repos', 'reactnative', '--version', '14.1.0'],
        {encoding: 'utf8', env: {...process.env, PATH: bin + path.delimiter + process.env.PATH}})
        if (r.status !== expectedStatus) throw new Error(`${command} exited ${r.status}: ${r.stdout}\n${r.stderr}`)
    }
    const land = (head, base) => {
        run('git fetch -q origin', seed)
        run(`git checkout -q -B ${base} origin/${base}`, seed)
        run(`${GIT} merge -q --no-ff --no-edit origin/${head} && git push -q origin ${base}`, seed)
    }
    return {root, seed, dir, cli, land}
}

describe('dev_branch.js', () => {
    test.each(['dev141', 'dev150'])('complete glob-filter CLI lifecycle for %s', branch => {
        const f = lifecycleFixture(branch)
        f.cli('setup')
        f.cli('point')
        fs.writeFileSync(path.join(f.seed, 'src.txt'), 'dev advances\n')
        run(`git checkout -q dev && git add -A && ${GIT} commit -qm advance && git push -q origin dev`, f.seed)
        f.cli('sync')
        const syncBranch = run('git branch --list --format="%(refname:short)" "sync-dev-into-*"', f.dir).trim()
        f.land(syncBranch, branch)
        f.cli('mergeback')
        f.land(`${branch}-merge-back`, 'dev')
        f.cli('verify')
        expect(run('git show origin/dev:.github/workflows/pr.yaml', f.dir)).toContain("branches: [dev, 'dev[0-9]*', master]")
        expect(run('git show origin/dev:androidTests/package.json', f.dir)).toContain('#dev"')
    })

    test('rejects unsafe CLI values', () => {
        const exit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })
        jest.spyOn(console, 'error').mockImplementation(() => {})
        expect(() => script.makeContext({org: 'wmathurin', branch: 'dev141;touch x', dir: os.tmpdir()})).toThrow('exit')
        expect(() => script.makeContext({org: 'wmathurin', branch: 'dev141', version: '14.1.0 $(x)', dir: os.tmpdir()})).toThrow('exit')
        exit.mockRestore()
    })

    test('conflicting file names with shell metacharacters are not executed', () => {
        const f = fixture()
        const evil = 'Template$(touch${IFS}MARKER)'
        const dirName = path.join(f.seed, evil)
        run('git checkout -q dev', f.seed)
        fs.mkdirSync(dirName)
        fs.writeFileSync(path.join(dirName, 'package.json'), pkgJson('dev'))
        run(`git add -A && ${GIT} commit -qm evil && git push -q origin dev`, f.seed)
        run('git checkout -q dev141 && git merge -q --ff-only dev && git push -q origin dev141', f.seed)
        // both sides edit the file: dev141 points it, dev changes another line
        const file = path.join(evil, 'package.json')
        commitSeed(f, file, pkgJson('dev141'), 'dev141', 'point')
        commitSeed(f, file, pkgJson('dev', 'Y2'), 'dev', 'edit')
        const tf = {...f, ctx: {...f.ctx, keys: ['templates']}}
        const tdir = path.join(f.work, 'SalesforceMobileSDK-Templates')
        fs.renameSync(f.dir, tdir)
        run('git fetch -q origin', tdir)
        run('git checkout -q -B w origin/dev141', tdir)
        try { run(`${GIT} merge --no-ff --no-edit origin/dev`, tdir) } catch (e) { /* conflict expected */ }
        const r = script.resolveConflicts(tf.ctx, 'templates', tdir)
        expect(r.remaining).toEqual([])
        expect(fs.existsSync(path.join(tdir, 'MARKER'))).toBe(false)
        expect(fs.existsSync(path.join(process.cwd(), 'MARKER'))).toBe(false)
        expect(fs.readFileSync(path.join(tdir, file), 'utf8')).toBe(pkgJson('dev141', 'Y2'))
    })

    test('fetchClone keeps an interrupted merge and untracked files', () => {
        const f = fixture()
        commitSeed(f, 'src.txt', 'branch\n', 'dev141', 'b')
        commitSeed(f, 'src.txt', 'dev\n', 'dev', 'd')
        run('git fetch -q origin && git checkout -q -B w origin/dev141', f.dir)
        try { run(`${GIT} merge --no-ff --no-edit origin/dev`, f.dir) } catch (e) { /* conflict expected */ }
        fs.writeFileSync(path.join(f.dir, 'note.txt'), 'mine')
        script.fetchClone(f.ctx, 'reactnative')
        expect(fs.existsSync(path.join(f.dir, 'note.txt'))).toBe(true)
        expect(run('git diff --name-only --diff-filter=U', f.dir).trim()).toBe('src.txt')
    })

    test('second run after dev advances extends the pushed work branch', () => {
        const f = fixture()
        commitSeed(f, 'a.txt', 'a\n', 'dev', 'dev1')
        script.mergeDevInto(f.ctx, 'reactnative', 'sync-test', false)
        run('git push -q origin sync-test', f.dir)
        const first = run('git rev-parse HEAD', f.dir).trim()
        commitSeed(f, 'b.txt', 'b\n', 'dev', 'dev2')
        script.mergeDevInto(f.ctx, 'reactnative', 'sync-test', false)
        run('git push origin sync-test', f.dir)          // would be rejected if history were rebuilt
        expect(run(`git merge-base --is-ancestor ${first} HEAD && echo yes`, f.dir).trim()).toBe('yes')
        expect(fs.existsSync(path.join(f.dir, 'b.txt'))).toBe(true)
    })

    test('--resume also merges a dev that advanced', () => {
        const f = fixture()
        commitSeed(f, 'a.txt', 'a\n', 'dev', 'dev1')
        script.mergeDevInto(f.ctx, 'reactnative', 'sync-test', false)
        commitSeed(f, 'b.txt', 'b\n', 'dev', 'dev2')
        script.mergeDevInto(f.ctx, 'reactnative', 'sync-test', true)
        expect(fs.existsSync(path.join(f.dir, 'b.txt'))).toBe(true)
    })

    test('grepRef: finds hits, ignores the tool files, fails on a missing ref', () => {
        const f = fixture()
        run('git checkout -q dev', f.seed)
        fs.mkdirSync(path.join(f.seed, 'release'))
        fs.writeFileSync(path.join(f.seed, 'release/README.md'), 'use dev141\n')
        fs.mkdirSync(path.join(f.seed, 'unittests'))
        fs.writeFileSync(path.join(f.seed, 'unittests/devBranchScript.test.js'), '// Tool fixture for dev141\n')
        run(`git add -A && ${GIT} commit -qm doc && git push -q origin dev`, f.seed)
        commitSeed(f, 'androidTests/package.json', pkgJson('dev141'), 'dev141', 'point')
        run('git fetch -q origin', f.dir)
        expect(script.grepRef(f.dir, 'origin/dev', 'dev141')).toBe('')
        expect(script.grepRef(f.dir, 'origin/dev141', 'dev141')).not.toBe('')
        run('git checkout -q dev', f.seed)
        fs.writeFileSync(path.join(f.seed, 'unittests/runtimeDependency.test.js'), 'const dependency = "SDK#dev141"\n')
        run(`git add -A && ${GIT} commit -qm dependency && git push -q origin dev`, f.seed)
        run('git fetch -q origin', f.dir)
        const remaining = script.grepRef(f.dir, 'origin/dev', 'dev141')
        expect(remaining).toContain('unittests/runtimeDependency.test.js')
        expect(remaining).not.toContain('unittests/devBranchScript.test.js')
        expect(() => script.grepRef(f.dir, 'origin/does-not-exist', 'dev141')).toThrow()
    })
})
