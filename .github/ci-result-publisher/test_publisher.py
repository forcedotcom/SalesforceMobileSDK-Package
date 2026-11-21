import copy
import io
import json
import unittest
import zipfile
from unittest.mock import patch

from publisher import (CONTEXT, GitHub, NotReady, PROVENANCE_JOB, applicable,
                       assess, fingerprint, publish, read_provenance)


class DecisionTests(unittest.TestCase):
    def setUp(self):
        self.pr = {'number': 7, 'state': 'open', 'merge_commit_sha': 'merge',
                   'head': {'sha': 'head', 'repo': {'id': 2}},
                   'base': {'sha': 'base', 'ref': 'dev', 'repo': {'id': 1}}}
        self.workflow = {'id': 9, 'path': '.github/workflows/pr.yaml', 'event': 'pull_request'}
        self.policy = {'repository': 'o/r', 'repository_id': 1,
                       'branches': {'dev': {'workflows': [self.workflow]}}}
        self.run = {'id': 10, 'run_attempt': 2, 'repository': {'id': 1},
                    'head_repository': {'id': 2}, 'head_sha': 'head', 'event': 'pull_request',
                    'path': self.workflow['path'], 'workflow_id': 9,
                    'status': 'completed', 'conclusion': 'success'}
        self.provenance = {'repository': 'o/r', 'repository_id': '1', 'pr': '7',
                           'head_repository_id': '2', 'head_sha': 'head',
                           'base_ref': 'dev', 'base_sha': 'base', 'run_id': '10',
                           'run_attempt': '2', 'event': 'pull_request',
                           'workflow_path': self.workflow['path']}
        self.jobs = [{'name': 'matrix / variable-name (SmartStore)', 'run_attempt': 2,
                      'status': 'completed', 'conclusion': 'success'},
                     {'name': PROVENANCE_JOB, 'run_attempt': 2, 'status': 'completed', 'conclusion': 'success'}]
        self.item = {'run': self.run, 'jobs': self.jobs, 'provenance': self.provenance,
                     'trusted_source': True, 'valid_commit_binding': True}
        self.evidence = {self.workflow['path']: self.item}

    def result(self):
        return assess(self.pr, self.policy, ['src/file.js'], self.evidence)

    def test_success_dynamic_job_names(self):
        self.assertEqual('success', self.result().status)
        self.jobs[0]['name'] = 'matrix / entirely different name (MobileSync, iOS 27)'
        self.assertEqual('success', self.result().status)

    def test_workflow_bad_conclusions(self):
        for conclusion in ('failure', 'cancelled', 'timed_out', 'neutral', 'skipped', 'action_required', 'startup_failure', None):
            with self.subTest(conclusion=conclusion):
                self.run['conclusion'] = conclusion
                self.assertEqual('failure', self.result().status)

    def test_bad_job_even_when_workflow_success(self):
        for conclusion in ('failure', 'cancelled', 'timed_out', 'neutral', 'skipped', None):
            with self.subTest(conclusion=conclusion):
                self.jobs[0]['conclusion'] = conclusion
                self.assertEqual('failure', self.result().status)

    def test_pending_and_rerun(self):
        self.run['status'] = 'queued'
        self.assertEqual('pending', self.result().status)
        self.run['status'] = 'completed'
        self.run['run_attempt'] = 3
        self.assertEqual('pending', self.result().status)

    def test_wrong_repository_head_workflow_or_event(self):
        for field, value in [('head_sha', 'old'), ('event', 'push'), ('workflow_id', 999),
                             ('path', '.github/workflows/spoof.yaml'), ('head_repository', {'id': 99}),
                             ('repository', {'id': 99})]:
            original = self.run[field]
            with self.subTest(field=field):
                self.run[field] = value
                self.assertEqual('pending', self.result().status)
            self.run[field] = original

    def test_stale_or_cross_pr_provenance(self):
        for field in self.provenance:
            original = self.provenance[field]
            with self.subTest(field=field):
                self.provenance[field] = 'wrong'
                self.assertEqual('pending', self.result().status)
            self.provenance[field] = original

    def test_untrusted_source_and_bad_commit_binding(self):
        for field in ('trusted_source', 'valid_commit_binding'):
            self.item[field] = False
            self.assertEqual('pending', self.result().status)
            self.item[field] = True

    def test_missing_provenance_workflow_jobs_and_branch(self):
        for field in ('provenance', 'jobs'):
            value = self.item.pop(field)
            self.assertEqual('pending', self.result().status)
            self.item[field] = value
        self.evidence.clear()
        self.assertEqual('pending', self.result().status)
        self.policy['branches'].clear()
        self.assertEqual('pending', self.result().status)

    def test_reporter_alone_or_failed_does_not_suffice(self):
        self.jobs.pop(0)
        self.assertEqual('pending', self.result().status)
        self.jobs[0]['conclusion'] = 'failure'
        self.assertEqual('pending', self.result().status)

    def test_waits_for_supplemental_workflow(self):
        self.policy['branches']['dev']['workflows'].append(dict(self.workflow, path='supplemental.yaml'))
        self.assertEqual('pending', self.result().status)

    def test_no_applicable_validation_does_not_pass(self):
        self.workflow['paths'] = ['unrelated/**']
        self.assertEqual('pending', self.result().status)

    def test_only_reviewed_unselected_job_can_skip(self):
        self.workflow['unselected_jobs'] = ['nightly-only']
        self.jobs.insert(0, {'name': 'nightly-only', 'run_attempt': 2,
                             'status': 'completed', 'conclusion': 'skipped'})
        self.assertEqual('success', self.result().status)
        self.jobs[0]['name'] = 'selected-library-tests'
        self.assertEqual('failure', self.result().status)

    def test_template_skip_requires_independent_no_template_selection(self):
        self.workflow['selection'] = {'type': 'templates', 'template_paths': ['NativeTemplate']}
        self.jobs.insert(0, {'name': 'ios-pr', 'run_attempt': 2,
                             'status': 'completed', 'conclusion': 'skipped'})
        self.assertEqual('success', self.result().status)
        for change in ['NativeTemplate/App.swift', 'templates.json', 'test_template.sh']:
            with self.subTest(change=change):
                result = assess(self.pr, self.policy, [change], self.evidence)
                self.assertEqual('failure', result.status)

    def test_base_head_or_target_change_invalidates_snapshot(self):
        original = fingerprint(self.pr)
        for part, key in [('head', 'sha'), ('base', 'sha'), ('base', 'ref')]:
            changed = copy.deepcopy(self.pr)
            changed[part][key] = 'changed'
            self.assertNotEqual(original, fingerprint(changed))


class BoundaryTests(unittest.TestCase):
    def test_trusted_branch_selectors_preserve_applicable_workflow_scope(self):
        workflow = {'configured_branches': ['dev[0-9]*']}
        self.assertTrue(applicable(workflow, ['src/a.js'], 'dev141'))
        self.assertFalse(applicable(workflow, ['src/a.js'], 'dev'))
        self.assertFalse(applicable(workflow, ['src/a.js'], 'master'))
        with self.assertRaises(NotReady):
            applicable({'configured_branches': ['release/**']}, ['src/a.js'], 'release/a')

    def test_glob_filters_and_renamed_paths(self):
        ignored = {'paths_ignore': ['**/*.md', 'LICENSE']}
        self.assertFalse(applicable(ignored, ['README.md', 'docs/a/b.md']))
        self.assertTrue(applicable(ignored, ['README.md', 'src/a.js']))
        selected = {'paths': ['**/*.js', 'tools/**']}
        self.assertTrue(applicable(selected, ['old.js', 'README.md']))
        self.assertTrue(applicable(selected, ['tools/sub/test.sh']))
        self.assertFalse(applicable(selected, ['toolshed.sh']))
        with self.assertRaises(NotReady):
            applicable({'paths': ['!(docs)/**']}, ['a.js'])
        with self.assertRaises(NotReady):
            applicable({}, [])

    def archive(self, files):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as z:
            for name, content in files.items():
                z.writestr(name, content)
        return buffer.getvalue()

    def test_archive_handling(self):
        self.assertEqual({'run_id': '1'}, read_provenance(self.archive({'provenance.json': '{"run_id":"1"}'})))
        for files in ({'../provenance.json': '{}'}, {'provenance.json': '{}', 'evil.py': 'x'},
                      {'provenance.json': 'x'*20000}, {'provenance.json': '[]'}, {'provenance.json': 'not json'}):
            with self.subTest(files=list(files)):
                with self.assertRaises(NotReady):
                    read_provenance(self.archive(files))

    def test_added_or_changed_workflow_is_rejected(self):
        api = GitHub('not-a-token')
        prefix = '.github/workflows/'
        approved = {prefix+'pr.yaml': ['approved']}
        api.trees[('o/r', 'sha')] = {'tree': [{'path': prefix+'pr.yaml', 'sha': 'approved', 'type': 'blob'}]}
        self.assertTrue(api.trusted_tree('o/r', 'sha', approved))
        api.trees[('o/r', 'sha')]['tree'].append({'path': prefix+'spoof.yaml', 'sha': 'new', 'type': 'blob'})
        self.assertFalse(api.trusted_tree('o/r', 'sha', approved))
        api.trees[('o/r', 'sha')]['truncated'] = True
        with self.assertRaises(NotReady):
            api.trusted_tree('o/r', 'sha', approved)

    def test_same_context_from_other_app_cannot_replace_our_check(self):
        class FakeAPI:
            def __init__(self): self.writes = []
            def pages(self, *args): return [{'name': CONTEXT, 'app': {'id': 15368}, 'id': 44}]
            def request(self, path, data, **kwargs): self.writes.append((path, data, kwargs))
        api = FakeAPI()
        from publisher import Result
        pr = {'number': 1, 'merge_commit_sha': 'm', 'head': {'sha': 'h'}, 'base': {'sha': 'b'}, 'html_url': 'https://github.com/o/r/pull/1'}
        publish(api, 9876, {'repository': 'o/r', 'repository_id': 1}, pr, Result('success', 'OK'), 'digest')
        self.assertEqual('/repos/o/r/check-runs', api.writes[0][0])
        self.assertEqual('m', api.writes[0][1]['head_sha'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
