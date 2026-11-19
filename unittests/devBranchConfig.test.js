const cfg = require('../release/dev_branch_config.js')

const FORCE = {org: 'forcedotcom', branch: 'dev141'}
const FORK = {org: 'wmathurin', branch: 'dev141'}

const FIXTURES = {
    templates: {
        '.github/workflows/pr.yaml': 'on:\n  pull_request_target:\n    branches: [dev, master]\n',
        'test_template.sh': [
            'PLUGIN_REPO_URI="https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#dev"',
            'IOS="${MSDK_IOS_BRANCH:-dev}"',
            'ANDROID="${MSDK_ANDROID_BRANCH:-dev}"',
            'RN="${RN_FORCE_BRANCH:-dev}"',
            ''
        ].join('\n')
    },
    cordovaplugin: {
        'plugin.xml': '<pod name="SalesforceSDKCore" git="https://github.com/forcedotcom/SalesforceMobileSDK-iOS-Specs.git" branch="dev" />\n<pod name="X" branch="dev"/>\n',
        'tools/update.sh': [
            'update_repo "${IOS_SDK_FOLDER}" "${IOS_SDK_REPO}" "dev"',
            'update_repo "${SHARED_SDK_FOLDER}" "${SHARED_SDK_REPO}" "dev"',
            'git clone https://github.com/forcedotcom/SalesforceMobileSDK-Shared',
            ''
        ].join('\n')
    },
    ios: {
        '.github/workflows/pr.yaml': 'on:\n  pull_request_target:\n    branches: [dev, master]\n',
        '.github/DangerFiles/TestOrchestrator.rb': 'fail("x") if github.branch_for_base != "dev"\n'
    },
    android: {
        '.github/workflows/pr.yaml': 'on:\n  pull_request_target:\n    branches: [dev, master]\n',
        '.github/DangerFiles/TestOrchestrator.rb': 'fail("x") if !["dev", "dpop"].include?(github.branch_for_base)\n',
        '.gitmodules': '[submodule "external/shared"]\n\turl = https://github.com/forcedotcom/SalesforceMobileSDK-Shared\n'
    },
    pkg: {
        '.github/workflows/pr.yaml': 'on:\n  pull_request_target:\n    branches: [dev, master]\n',
        'shared/constants.js': "pluginRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-CordovaPlugin#dev',\ntemplatesRepoUri: 'https://github.com/forcedotcom/SalesforceMobileSDK-Templates#dev',\n"
    },
    reactnative: {
        '.github/workflows/pr.yaml': 'on:\n  pull_request_target:\n    branches: [dev, master]\n',
        'androidTests/package.json': '{"dependencies": {"react-native-force": "git+https://github.com/forcedotcom/SalesforceMobileSDK-ReactNative.git#dev"}}',
        'iosTests/package.json': '{"dependencies": {"react-native-force": "git+https://github.com/forcedotcom/SalesforceMobileSDK-ReactNative.git#dev"}}'
    }
}

function run(key, files, direction, ctx) {
    return cfg.applyRules(key, files, direction, ctx)
}

describe('dev_branch_config', () => {
    Object.keys(FIXTURES).forEach(key => {
        [FORCE, FORK].forEach(ctx => {
            describe(`${key} (${ctx.org})`, () => {
                const original = FIXTURES[key]
                const pointed = run(key, original, 'point', ctx)

                test('point changes files and reports no problem', () => {
                    expect(pointed.problems).toEqual([])
                    expect(pointed.changedPaths.length).toBeGreaterThan(0)
                    pointed.changedPaths.forEach(p => expect(pointed.files[p]).not.toEqual(original[p]))
                })

                test('point is idempotent', () => {
                    const again = run(key, pointed.files, 'point', ctx)
                    expect(again.changedPaths).toEqual([])
                    expect(again.problems).toEqual([])
                    expect(again.files).toEqual(pointed.files)
                })

                test('unpoint(point(x)) === x', () => {
                    const back = run(key, pointed.files, 'unpoint', ctx)
                    expect(back.problems).toEqual([])
                    expect(back.files).toEqual(original)
                })

                test('unpoint is idempotent on unpointed files', () => {
                    const noop = run(key, original, 'unpoint', ctx)
                    expect(noop.changedPaths).toEqual([])
                    expect(noop.files).toEqual(original)
                })
            })
        })
    })

    test('point rewrites every dev ref in templates test_template.sh and nothing else', () => {
        const r = run('templates', FIXTURES.templates, 'point', FORCE)
        expect(r.files['test_template.sh']).toContain('SalesforceMobileSDK-CordovaPlugin#dev141"')
        expect(r.files['test_template.sh']).toContain('${MSDK_IOS_BRANCH:-dev141}')
        expect(r.files['test_template.sh']).toContain('${MSDK_ANDROID_BRANCH:-dev141}')
        expect(r.files['test_template.sh']).toContain('${RN_FORCE_BRANCH:-dev141}')
        expect(r.files['.github/workflows/pr.yaml']).toContain('branches: [dev, "dev141", master]')
    })

    test('point leaves #master and similar refs alone', () => {
        const files = {'androidTests/package.json': '"a": "SalesforceMobileSDK-ReactNative#master", "b": "SalesforceMobileSDK-X#developer", "c": "SalesforceMobileSDK-Y#dev"',
                       'iosTests/package.json': '"c": "SalesforceMobileSDK-Y#dev"',
                       '.github/workflows/pr.yaml': 'on:\n  pull_request_target:\n    branches: [dev, master]\n'}
        const r = run('reactnative', files, 'point', FORCE)
        expect(r.files['androidTests/package.json']).toBe('"a": "SalesforceMobileSDK-ReactNative#master", "b": "SalesforceMobileSDK-X#developer", "c": "SalesforceMobileSDK-Y#dev141"')
    })

    test('point swaps the org on a fork only', () => {
        const fork = run('cordovaplugin', FIXTURES.cordovaplugin, 'point', FORK)
        expect(fork.files['tools/update.sh']).toContain('github.com/wmathurin/SalesforceMobileSDK-Shared')
        const main = run('cordovaplugin', FIXTURES.cordovaplugin, 'point', FORCE)
        expect(main.files['tools/update.sh']).toContain('github.com/forcedotcom/SalesforceMobileSDK-Shared')
    })

    test('android danger keeps dpop', () => {
        const r = run('android', FIXTURES.android, 'point', FORCE)
        expect(r.files['.github/DangerFiles/TestOrchestrator.rb']).toContain('["dev", "dpop", "dev141"]')
    })

    test('a file that no longer matches is reported', () => {
        const r = run('ios', {
            '.github/workflows/pr.yaml': 'branches: [main]\n',
            '.github/DangerFiles/TestOrchestrator.rb': 'nothing\n'
        }, 'point', FORCE)
        expect(r.problems.length).toBe(2)
    })

    test('a missing file is reported', () => {
        const r = run('pkg', {}, 'point', FORCE)
        expect(r.problems.length).toBe(2)
    })

    test('dispatcher dispatches every nightly on the branch', () => {
        const wf = cfg.dispatcherWorkflow('ios', 'dev141', 'wmathurin')
        expect(wf).toContain('gh workflow run nightly.yaml --repo "$REPO" --ref dev141')
        expect(wf).toContain('gh workflow run ui-test-nightly.yaml --repo "$REPO" --ref dev141')
        expect(wf).toContain('actions: write')
        expect(wf).toContain('runs-on: ubuntu-latest')
        expect(cfg.dispatcherWorkflow('ios', 'dev141', 'forcedotcom')).toContain('runs-on: forcedotcom-ubuntu')
    })

    test('manifest covers repos in dependency order', () => {
        const order = cfg.REPO_KEYS
        Object.keys(cfg.MANIFEST).forEach(k => {
            ;(cfg.MANIFEST[k].submodules || []).forEach(s => expect(order.indexOf(s.dep)).toBeLessThan(order.indexOf(k)))
        })
    })

    test('transformFile applies the rules of one file only', () => {
        const f = 'androidTests/package.json'
        const c = FIXTURES.reactnative[f]
        const p = cfg.transformFile('reactnative', '.', f, c, 'point', FORCE)
        expect(p).toContain('#dev141')
        expect(cfg.transformFile('reactnative', '.', f, p, 'unpoint', FORCE)).toBe(c)
        expect(cfg.transformFile('reactnative', '.', 'other.txt', 'x#dev', 'point', FORCE)).toBe('x#dev')
    })

    test('generated paths of cordovaplugin', () => {
        expect(cfg.isGenerated('cordovaplugin', 'src/ios/A.m')).toBe(true)
        expect(cfg.isGenerated('cordovaplugin', 'gradlew')).toBe(true)
        expect(cfg.isGenerated('cordovaplugin', 'plugin.xml')).toBe(false)
        expect(cfg.isGenerated('ios', 'src/x')).toBe(false)
    })

    test('iOS-SPM gets a branch but has no pointers', () => {
        expect(cfg.REPO_KEYS.indexOf('iosspm')).toBeGreaterThan(cfg.REPO_KEYS.indexOf('ios'))
        expect(cfg.MANIFEST.iosspm.repo).toBe('SalesforceMobileSDK-iOS-SPM')
        expect(cfg.MANIFEST.iosspm.rules).toEqual([])
        expect(run('iosspm', {}, 'point', FORCE).problems).toEqual([])
    })
    test.each(['ios', 'android', 'ioshybrid', 'reactnative', 'templates', 'pkg'])(
        '%s keeps the persistent release glob while pointing and unpointing dependencies', key => {
            const file = '.github/workflows/pr.yaml'
            const workflow = "on:\n  pull_request_target:\n    branches: [dev, 'dev[0-9]*', master]\n"
            const original = {...FIXTURES[key], [file]: workflow}
            const pointed = run(key, original, 'point', FORCE)
            expect(pointed.problems).toEqual([])
            expect(pointed.files[file]).toBe(workflow)
            const back = run(key, pointed.files, 'unpoint', FORCE)
            expect(back.problems).toEqual([])
            expect(back.files).toEqual(original)
        })

    test.each(['devops', 'dev/141', '1.0'])(
        'a release glob does not silently accept an uncovered branch %s', branch => {
            const file = '.github/workflows/pr.yaml'
            const workflow = "on:\n  pull_request_target:\n    branches: [dev, 'dev[0-9]*', master]\n"
            const result = run('ioshybrid', {[file]: workflow}, 'point', {...FORCE, branch})
            expect(result.problems).toHaveLength(1)
            expect(result.files[file]).toBe(workflow)
        })

    test.each([
        "on:\n  push:\n    branches: [dev, 'dev[0-9]*', master]\n  pull_request_target:\n    branches: [main]\n",
        "on:\n  pull_request_target:\n    branches-ignore: [dev141]\n",
        "on:\n  pull_request_target:\n    branches: [dev, 'dev[0-9]*', master]\n    branches-ignore: [dev141]\n",
        "on:\n  pull_request_target:\n    branches: [dev, 'dev[0-9]*', master]\n  pull_request:\n    branches: [main]\n"
    ])('unsupported or unrelated filters still require review', workflow => {
        const file = '.github/workflows/pr.yaml'
        const result = run('ioshybrid', {[file]: workflow}, 'point', FORCE)
        expect(result.problems).toHaveLength(1)
        expect(result.files[file]).toBe(workflow)
    })

    test('an unrestricted PR event remains unchanged during both lifecycle directions', () => {
        const file = '.github/workflows/pr.yaml', workflow = 'on:\n  pull_request_target:\n'
        for (const direction of ['point', 'unpoint']) {
            const result = run('ioshybrid', {[file]: workflow}, direction, FORCE)
            expect(result.problems).toEqual([])
            expect(result.files[file]).toBe(workflow)
        }
    })

    test.each(['1.0', '00141', 'True'])('legacy filters preserve branch %s as a string', branch => {
        const file = '.github/workflows/pr.yaml'
        const original = {[file]: 'on:\n  pull_request_target:\n    branches: [dev, master]\n'}
        const ctx = {...FORCE, branch}
        const pointed = run('ioshybrid', original, 'point', ctx)
        expect(pointed.problems).toEqual([])
        const value = pointed.files[file].match(/branches: \[dev, (.+), master\]/)[1]
        expect(JSON.parse(value)).toBe(branch)
        expect(run('ioshybrid', pointed.files, 'unpoint', ctx).files).toEqual(original)
    })

    test('the PR rule leaves an unrelated push filter alone', () => {
        const file = '.github/workflows/pr.yaml'
        const original = {[file]: "on:\n  push:\n    branches: [dev, master]\n  pull_request_target:\n    branches: [dev, 'dev[0-9]*', master]\n"}
        const pointed = run('ioshybrid', original, 'point', FORCE)
        expect(pointed.problems).toEqual([])
        expect(pointed.files).toEqual(original)
        expect(run('ioshybrid', original, 'point', {...FORCE, branch: 'devops'}).problems).toHaveLength(1)
    })

    test.each(["'branches'", '"branches"', ' branches'])(
        'an unsupported %s key is not mistaken for an unrestricted event', key => {
            const file = '.github/workflows/pr.yaml'
            const original = {[file]: `on:\n  pull_request_target:\n    ${key}: [main]\n`}
            const result = run('ioshybrid', original, 'point', FORCE)
            expect(result.problems).toHaveLength(1)
            expect(result.files).toEqual(original)
        })

    test('CRLF and comments survive a scoped legacy rewrite and cleanup', () => {
        const file = '.github/workflows/pr.yaml'
        const original = {[file]: 'on:\r\n  pull_request_target: # retained\r\n    branches: [dev, master] # retained\r\n'}
        const pointed = run('ioshybrid', original, 'point', FORCE)
        expect(pointed.problems).toEqual([])
        expect(pointed.files[file]).toContain('"dev141"')
        expect(run('ioshybrid', pointed.files, 'unpoint', FORCE).files).toEqual(original)
    })

    test('ordinary pull_request filters use the same persistent branch policy', () => {
        const file = '.github/workflows/pr.yaml'
        const original = {...FIXTURES.pkg, [file]: "on:\n  pull_request:\n    branches: [dev, 'dev[0-9]*', master]\n"}
        const result = run('pkg', original, 'point', FORCE)
        expect(result.problems).toEqual([])
        expect(result.files[file]).toBe(original[file])
        expect(result.files['shared/constants.js']).toContain('#dev141')
        expect(run('pkg', result.files, 'unpoint', FORCE).files).toEqual(original)
    })

})
