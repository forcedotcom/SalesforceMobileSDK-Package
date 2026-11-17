const fs = require('fs'),
      os = require('os'),
      path = require('path'),
      cp = require('child_process'),
      cfg = require('../release/dev_branch_config'),
      ci = require('../release/dev_branch_ci'),
      script = require('../release/dev_branch')

const FILE = '.github/workflows/pr.yaml'
const workflow = (event = 'pull_request_target', branches = 'dev, master') =>
    `name: PR\non:\n  ${event}:\n    branches: [${branches}]\n    paths-ignore:\n      - '**/*.md'\npermissions:\n  contents: read\njobs: {}\n`

const exec = (args, cwd) => cp.execFileSync('git', args, {cwd, stdio: 'pipe'}).toString().trim()

function fixture({defaultBranch = 'dev', event = 'pull_request_target', ready = false,
    repoKey = event === 'pull_request' ? 'pkg' : 'ioshybrid'} = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-ci-'))
    const origin = path.join(root, 'origin.git'), seed = path.join(root, 'seed')
    exec(['init', '-q', '--bare', '-b', defaultBranch, origin], root)
    exec(['clone', '-q', origin, seed], root)
    exec(['config', 'user.name', 'Test'], seed)
    exec(['config', 'user.email', 'test@example.com'], seed)
    fs.mkdirSync(path.join(seed, '.github/workflows'), {recursive: true})
    fs.writeFileSync(path.join(seed, FILE), workflow(event, ready ? 'dev, dev141, master' : 'dev, master'))
    fs.writeFileSync(path.join(seed, 'pointers.txt'), 'Dependency#dev\n')
    exec(['add', '.'], seed)
    exec(['commit', '-qm', 'base'], seed)
    exec(['push', '-q', 'origin', defaultBranch], seed)
    exec(['checkout', '-qb', 'dev141'], seed)
    fs.writeFileSync(path.join(seed, FILE), workflow(event, 'dev, dev141, master'))
    exec(['add', '.'], seed)
    if (!ready) exec(['commit', '-qm', 'parallel'], seed)
    exec(['push', '-q', 'origin', 'dev141'], seed)
    const work = path.join(root, 'work'), key = repoKey
    fs.mkdirSync(work)
    const dir = path.join(work, cfg.MANIFEST[key].repo)
    exec(['clone', '-q', origin, dir], root)
    exec(['config', 'user.name', 'Test'], dir)
    exec(['config', 'user.email', 'test@example.com'], dir)
    const ghCalls = [], realSpawn = cp.spawnSync
    const responses = {prs: [], files: [], content: '', cloneURL: origin}
    jest.spyOn(cp, 'spawnSync').mockImplementation((command, args, options) => {
        if (command !== 'gh') return realSpawn(command, args, options)
        ghCalls.push(args)
        let response
        if (args[0] === 'pr' && args[1] === 'create') {
            const body = fs.readFileSync(args[args.indexOf('--body-file') + 1], 'utf8')
            responses.created = {args, body}
            responses.prs = [{number: 1, html_url: 'https://github.com/example/repo/pull/1', head: {sha: 'b'.repeat(40)}}]
            responses.files = [{filename: FILE, status: 'modified'}]
            responses.content = fs.readFileSync(path.join(dir, FILE), 'utf8')
            return {status: 0, stdout: 'https://github.com/example/repo/pull/1\n', stderr: ''}
        }
        const endpoint = args[args.length - 1]
        if (endpoint.includes('/pulls?')) response = [responses.prs]
        else if (endpoint.includes('/files?')) response = [responses.files]
        else if (endpoint.includes('/contents/')) response = {content: Buffer.from(responses.content).toString('base64')}
        else response = {default_branch: defaultBranch, clone_url: responses.cloneURL}
        return {status: 0, stdout: JSON.stringify(response), stderr: ''}
    })
    return {root, origin, seed, dir, key, ghCalls, responses,
        ctx: {org: 'example', branch: 'dev141', dir: work, keys: [key], dryRun: false}}
}

afterEach(() => jest.restoreAllMocks())

describe('parallel branch PR CI preparation', () => {
    test('a pointed release workflow is not enough for PR-target readiness', () => {
        const f = fixture()
        const head = exec(['rev-parse', 'HEAD'], f.dir)
        expect(script.verifyPrCI(f.ctx)).toBe(false)
        expect(exec(['rev-parse', 'HEAD'], f.dir)).toBe(head)
        expect(f.responses.created).toBeUndefined()
    })

    test('prepares only the default workflow filter, pushes a separate branch and targets the actual default', () => {
        const f = fixture({defaultBranch: 'master'})
        const oldDefault = exec(['rev-parse', 'origin/master'], f.dir)
        script.prCI(f.ctx)
        expect(exec(['diff', '--name-only', 'origin/master..HEAD'], f.dir)).toBe(FILE)
        expect(exec(['rev-parse', 'origin/master'], f.dir)).toBe(oldDefault)
        expect(fs.readFileSync(path.join(f.dir, 'pointers.txt'), 'utf8')).toBe('Dependency#dev\n')
        expect(f.responses.created.args).toEqual(expect.arrayContaining(['--base', 'master']))
        expect(f.responses.created.body).toContain('dev141')
        const createdHead = exec(['rev-parse', 'HEAD'], f.dir)
        script.prCI(f.ctx)
        expect(exec(['rev-parse', 'HEAD'], f.dir)).toBe(createdHead)
        expect(f.ghCalls.filter(args => args[0] === 'pr').length).toBe(1)
        expect(script.verifyPrCI(f.ctx)).toBe(false)
    })

    test('uses an existing compatible default-branch PR without changing its branch or metadata', () => {
        const f = fixture()
        f.responses.prs = [{number: 9, html_url: 'https://github.com/example/repo/pull/9', head: {sha: 'a'.repeat(40)}}]
        f.responses.files = [{filename: FILE, status: 'modified'}]
        f.responses.content = workflow('pull_request_target', 'dev, dev141, master')
        const head = exec(['rev-parse', 'HEAD'], f.dir)
        script.prCI(f.ctx)
        script.prCI(f.ctx)
        expect(exec(['rev-parse', 'HEAD'], f.dir)).toBe(head)
        expect(f.responses.created).toBeUndefined()
        expect(f.ghCalls.every(args => args[0] === 'api')).toBe(true)
    })

    test('does not silently duplicate a different open workflow PR', () => {
        const f = fixture()
        f.responses.prs = [{number: 9, html_url: 'https://github.com/example/repo/pull/9', head: {sha: 'a'.repeat(40)}}]
        f.responses.files = [{filename: FILE, status: 'modified'}]
        f.responses.content = workflow('pull_request_target', 'dev, release, master')
        expect(() => script.prCI(f.ctx)).toThrow(/existing workflow PR/i)
        expect(f.responses.created).toBeUndefined()
    })

    test('ready defaults are a no-op, including repeated preparation', () => {
        const f = fixture({ready: true})
        script.prCI(f.ctx)
        script.prCI(f.ctx)
        expect(script.verifyPrCI(f.ctx)).toBe(true)
        expect(f.responses.created).toBeUndefined()
        expect(exec(['branch', '--list', 'pr-ci-*'], f.dir)).toBe('')
    })

    test('ordinary PR workflows are checked on the parallel branch without a default-branch PR', () => {
        const original = cfg.MANIFEST.pkg.pr
        cfg.MANIFEST.pkg.pr = {...original, event: 'pull_request'}
        try {
            const f = fixture({event: 'pull_request'})
            script.prCI(f.ctx)
            expect(script.verifyPrCI(f.ctx)).toBe(true)
            expect(f.responses.created).toBeUndefined()
            expect(f.ghCalls.some(args => args[args.length - 1].includes('/pulls?'))).toBe(false)
        } finally {
            cfg.MANIFEST.pkg.pr = original
        }
    })

    test('Package PR-target CI needs the default workflow even when the parallel copy is ready', () => {
        const f = fixture({repoKey: 'pkg'})
        expect(script.verifyPrCI(f.ctx)).toBe(false)
        script.prCI(f.ctx)
        expect(f.responses.created).toBeDefined()
        expect(f.responses.created.args).toEqual(expect.arrayContaining(['--base', 'dev']))
        expect(script.verifyPrCI(f.ctx)).toBe(false)
    })

    test('an undeclared workflow is unassessed, not a readiness pass', () => {
        expect(script.verifyPrCI({keys: ['cordovaplugin']})).toBe(false)
    })

    test('dry run does not checkout, commit, push or create a PR', () => {
        const f = fixture()
        const head = exec(['rev-parse', 'HEAD'], f.dir)
        script.prCI({...f.ctx, dryRun: true})
        expect(exec(['rev-parse', 'HEAD'], f.dir)).toBe(head)
        expect(exec(['branch', '--list', 'pr-ci-*'], f.dir)).toBe('')
        expect(exec(['ls-remote', '--heads', 'origin', 'pr-ci-*'], f.dir)).toBe('')
        expect(f.responses.created).toBeUndefined()
    })

    test('preparation preserves and refuses a dirty worktree', () => {
        const f = fixture()
        fs.writeFileSync(path.join(f.dir, 'notes.txt'), 'keep me')
        expect(() => script.prCI(f.ctx)).toThrow(/clean worktree/i)
        expect(fs.readFileSync(path.join(f.dir, 'notes.txt'), 'utf8')).toBe('keep me')
        expect(f.responses.created).toBeUndefined()
    })

    test('rejects a clone from a different repository before any write', () => {
        const f = fixture()
        f.responses.cloneURL = 'https://github.com/another/repo.git'
        expect(() => script.prCI(f.ctx)).toThrow(/origin does not match/)
        expect(f.responses.created).toBeUndefined()
        expect(exec(['branch', '--list', 'pr-ci-*'], f.dir)).toBe('')
    })

    test.each(['separate', 'multiple'])('rejects a different push destination (%s push URLs) before any write', mode => {
        const f = fixture()
        const other = path.join(f.root, 'other.git')
        exec(['init', '-q', '--bare', '-b', 'dev', other], f.root)
        if (mode === 'multiple') exec(['config', '--add', 'remote.origin.pushurl', f.origin], f.dir)
        exec(['config', '--add', 'remote.origin.pushurl', other], f.dir)
        const head = exec(['rev-parse', 'HEAD'], f.dir)
        expect(() => script.prCI(f.ctx)).toThrow(/push destination does not match/)
        expect(exec(['rev-parse', 'HEAD'], f.dir)).toBe(head)
        expect(exec(['branch', '--list', 'pr-ci-*'], f.dir)).toBe('')
        expect(exec(['--git-dir', other, 'for-each-ref', '--format=%(refname)', 'refs/heads/pr-ci-dev141'], f.root)).toBe('')
        expect(exec(['--git-dir', f.origin, 'for-each-ref', '--format=%(refname)', 'refs/heads/pr-ci-dev141'], f.root)).toBe('')
        expect(f.responses.created).toBeUndefined()
    })

    test('checkout does not overwrite an ignored local file', () => {
        const f = fixture()
        exec(['checkout', '-q', 'dev'], f.seed)
        fs.writeFileSync(path.join(f.seed, 'local.txt'), 'tracked on default')
        exec(['add', '.'], f.seed)
        exec(['commit', '-qm', 'default file'], f.seed)
        exec(['push', '-q', 'origin', 'dev'], f.seed)
        const gitDir = exec(['rev-parse', '--absolute-git-dir'], f.dir)
        fs.appendFileSync(path.join(gitDir, 'info/exclude'), '\nlocal.txt\n')
        fs.writeFileSync(path.join(f.dir, 'local.txt'), 'ignored evidence')
        expect(() => script.prCI(f.ctx)).toThrow(/checkout/)
        expect(fs.readFileSync(path.join(f.dir, 'local.txt'), 'utf8')).toBe('ignored evidence')
        expect(f.responses.created).toBeUndefined()
    })

    test.each([false, true])('CLI verification exit status reflects filter readiness: %s', ready => {
        const f = fixture({ready})
        const bin = path.join(f.root, 'bin')
        fs.mkdirSync(bin)
        fs.writeFileSync(path.join(bin, 'gh'), '#!/usr/bin/env node\nprocess.stdout.write(' +
            JSON.stringify(JSON.stringify({default_branch: 'dev', clone_url: f.origin})) + ')\n', {mode: 0o755})
        const head = exec(['rev-parse', 'HEAD'], f.dir)
        const result = cp.spawnSync(process.execPath, [path.resolve(__dirname, '../release/dev_branch.js'),
            'verify-pr-ci', '--org', 'example', '--branch', 'dev141', '--dir', f.ctx.dir, '--repos', f.key],
        {encoding: 'utf8', env: {...process.env, PATH: bin + path.delimiter + process.env.PATH}})
        expect(result.status).toBe(ready ? 0 : 1)
        expect(result.stdout).toContain('Filter verification only')
        expect(exec(['rev-parse', 'HEAD'], f.dir)).toBe(head)
    })
})

describe('PR event filter planning', () => {
    test('changes only the selected event filter and preserves other branches, paths, jobs and comments', () => {
        const original = workflow('pull_request_target', "'dev', release/*, 'master'")
            .replace("    branches: ['dev', release/*, 'master']", "    branches: ['dev', release/*, 'master'] # keep")
            .replace('permissions:', '  push:\n    branches: [master]\npermissions:')
        const result = ci.planPrWorkflow(original, 'pull_request_target', 'dev141')
        expect(result.ready).toBe(false)
        expect(result.content).toBe(original.replace("['dev', release/*, 'master']", "['dev', release/*, \"dev141\", 'master']"))
        expect(ci.planPrWorkflow(result.content, 'pull_request_target', 'dev141')).toEqual({ready: true, content: result.content})
    })

    test('an event without a branch filter already accepts any target', () => {
        const original = workflow().replace('    branches: [dev, master]\n', '')
        expect(ci.planPrWorkflow(original, 'pull_request_target', 'dev141')).toEqual({ready: true, content: original})
    })

    test.each([
        '    branches-ignore: [master]',
        '    branches:\n      - dev',
        '      branches: [dev, master]',
        '    branches: [dev, "!dev141"]',
        '    "branches": [dev, master]',
        '    branches: *allowed',
        '    branches: [*allowed, dev141]',
        '    <<: *filters',
        '    branches : [dev, master]',
        '    ? branches\n    : [dev, master]'
    ])('rejects unsupported filters instead of reporting readiness: %s', filter => {
        expect(() => ci.planPrWorkflow(workflow().replace('    branches: [dev, master]', filter),
            'pull_request_target', 'dev141')).toThrow(/Unsupported PR trigger/)
    })

    test('a manifest event that differs from the source is not assumed ready', () => {
        expect(() => ci.planPrWorkflow(workflow('pull_request'), 'pull_request_target', 'dev141')).toThrow()
    })

    test.each([
        '      branches : [dev, master]',
        '      "branches" : [dev, master]',
        '      branches-ignore : [dev141]'
    ])('rejects alternate mapping before reporting readiness: %s', filter => {
        const content = workflow().replace('    branches: [dev, master]', filter)
        expect(() => ci.planPrWorkflow(content, 'pull_request_target', 'dev141')).toThrow(/Unsupported PR trigger/)
    })

    test.each(['1.0', '00141', 'True', 'null', '0x10'])('preserves the exact branch scalar %s', branch => {
        exec(['check-ref-format', '--branch', branch], process.cwd())
        const result = ci.planPrWorkflow(workflow(), 'pull_request_target', branch)
        const line = result.content.split('\n').find(value => value.includes('branches:'))
        const inserted = line.match(/\[dev, (.+), master\]/)[1]
        expect(JSON.parse(inserted)).toBe(branch)
        expect(ci.planPrWorkflow(result.content, 'pull_request_target', branch).ready).toBe(true)
    })

    test.each(['1.0', '00141', 'True', 'null', '0x10'])('rejects an existing non-string branch scalar %s', branch => {
        expect(() => ci.planPrWorkflow(workflow('pull_request_target', `dev, ${branch}, master`),
            'pull_request_target', branch)).toThrow(/Unsupported PR trigger/)
    })

    test.each(['dev141', '1.0'])('CI-generated filters compose with pointer add/remove for %s', branch => {
        const original = workflow()
        const generated = ci.planPrWorkflow(original, 'pull_request_target', branch).content
        const ctx = {org: 'forcedotcom', branch}
        const pointed = cfg.applyRules('ioshybrid', {[FILE]: generated}, 'point', ctx)
        expect(pointed.problems).toEqual([])
        expect(pointed.files[FILE]).toBe(generated)
        const back = cfg.applyRules('ioshybrid', pointed.files, 'unpoint', ctx)
        expect(back.problems).toEqual([])
        expect(back.files[FILE]).toBe(original)
        expect(cfg.applyRules('ioshybrid', back.files, 'unpoint', ctx).problems).toEqual([])
    })
})
