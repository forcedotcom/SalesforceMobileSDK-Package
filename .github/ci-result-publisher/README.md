# Mobile SDK CI result publisher

This is an implementation candidate for Mobile SDK CI ruleset evaluation.
It is not deployed, and live trust-boundary evidence is still required.

A dedicated GitHub App reads Actions metadata and publishes one `CI result`
check on GitHub's current PR test-merge commit. Individual matrix job names are
never required checks. A result from GitHub Actions, even with the same name,
does not have this App's identity.

## Runtime and deployment

The worker uses Python 3.11+ standard-library modules and the host's OpenSSL
binary for App JWT signing. There are no pip dependencies in the worker.
The development-only patch generator is maintained with the internal design spec.

Deploy an explicitly reviewed commit of this directory and a reviewed policy on
an isolated host. Pin the Python/OpenSSL runtime through the hosting platform's
normal image/update policy. Do not run it in any of the SDK repositories' PR
jobs, use a PR checkout, or make its files writable by those jobs. The host's
operators, App managers, private-key holders and policy reviewers are trusted.

Register the App with the settings in `app-manifest.json`. Prefer ownership by
forcedotcom and a private App. Disable webhooks, OAuth authorization, user tokens,
and installation setup callbacks. No inbound HTTP endpoint is needed by this
worker. The manifest records settings; no registration handshake or credential
exchange is implemented here. Review/create the App in GitHub's settings UI.

Install on **Only select repositories**, selecting exactly the 11 repositories
in the spec. Do not grant Administration, Actions write, Contents write,
Pull requests write or organization permissions. Metadata read is implicit.
The worker further restricts each installation token to one repository and the
four declared permissions. Keep the App private key in a host secret mount;
never commit it or put it in a validation repository/organization Actions secret.
The worker does not need the App client secret.

Run these checks before deployment:

```sh
python3 -m unittest discover -s .github/ci-result-publisher -v
python3 -m compileall -q .github/ci-result-publisher
```

For a read-only run, set `GH_TOKEN` through the host's credential mechanism:

```sh
python3 .github/ci-result-publisher/publisher.py --policy /trusted/policy.json
```

For publishing, use the registered App's numeric ID and mounted key:

```sh
python3 .github/ci-result-publisher/publisher.py --policy /trusted/policy.json \
  --app-id APP_ID --key-file /run/secrets/msdk-ci-app.pem --write
```

The default host is `ci-result-publisher.yaml` in this repository. Before its
first run, create environment `mobile-sdk-ci-publisher` with selected-branch
deployment policy **branch `dev` only**. Set environment variables
`MSDK_CI_APP_ID` and `MSDK_CI_PUBLISHER_REVISION` (a reviewed 40-character
commit containing the worker and enrolled `policy.json`), plus environment
secret `MSDK_CI_APP_PRIVATE_KEY`. Keep these out of ordinary repository/
organization Actions secrets. The job also checks repository identity and
default ref, uses a SHA-pinned checkout action without persisted credentials,
and never accepts PR inputs. No environment, variable, key or App is created
by this code PR.

The workflow schedules **one non-overlapping process** every five minutes, with a process timeout,
centralized stdout/stderr, nonzero-exit alerts, and a freshness alert if no cycle
completes within fifteen minutes. Environment configuration and credentials are
installation work, not actions taken by this PR. Polling introduces a delay of
at least one cycle between a rerun and invalidating a previous successful check.
GitHub check results do not expire automatically when the worker is unavailable.
These are explicit limitations to evaluate before recommending activation.

## Workflow protocol and source policy

The reviewed branch-specific patches add
an unfiltered `PR integrity` workflow and a terminal `CI provenance` job to each
PR validation entrypoint. Existing tests, triggers, matrices and credentials are
preserved. The provenance job runs in a fresh job without checkout, caches,
PR artifacts or PR code. It receives GitHub context through environment
variables, serializes it as JSON, and uses an immutable upload-artifact action.
Its artifact name includes both run ID and attempt. Overwrite is disabled.

The artifact is **not a cryptographic attestation of the workflow source**.
Trust depends on independently enforcing the approved workflow graph and
selectors, the immutable artifact protocol and a successful provenance job.
A hostile validation job must not be able to replace the provenance artifact
while leaving that job successful. This must be tested live, including with
stolen job-runtime credentials, before activation. Local tests do not prove
that GitHub runtime isolation property.

The worker independently verifies repository and fork IDs, workflow ID/path and
event, PR number, head/base/target, current run ID/attempt, execution commit,
all reported job conclusions, and the complete approved workflow/Danger source
inventory. A `pull_request` provenance commit must have the current base and
head as its two parents. A `pull_request_target` execution SHA must match the
current base. Every local reusable workflow's actual referenced revision must
also match the approved source policy. Untrusted source files are read as data;
no PR code is imported or executed by the worker. ZIP extraction is in memory,
size bounded, and limited to one fixed JSON member. Redirects for artifact
storage downloads do not receive the App Authorization header.

A new PR head or base produces a new test-merge commit. The worker re-reads the
PR immediately before writing and discards superseded snapshots. Old checks
remain associated with old commits. For the same head, the newest run and its
current attempt are authoritative; an earlier passing attempt is never used
as fallback. Missing/expired artifacts, incomplete pagination, unsupported
selectors and API failures produce a pending result rather than success.

All selected jobs must conclude `success`. Failure, cancellation, timeout,
neutral and unexpected skipped jobs fail, even if Actions reports workflow
success (for example with `continue-on-error`). No static list of matrix/job
names is used. Legitimate job skips currently fail conservatively; any exception
needs an independently reviewed selection policy, not a blanket skipped-job
allowance. Workflow-level path exclusions are evaluated from the trusted policy
against the full changed-file inventory, including both names of a rename.
The integrity workflow still runs for documentation-only changes, so an empty
set of validation workflows never becomes success.

The source policy pins Git blob IDs for all workflow and Danger files. Updating
these files requires an independently reviewed policy update admitting the
candidate blobs before that PR can pass this gate. Do not generate and deploy
policy changes automatically from PRs. The policy must include workflow IDs
queried from GitHub after each new workflow is registered; `0` is an explicit
onboarding placeholder and the worker refuses `--write` with any unenrolled ID.
The source revision/policy digest and run attempts are recorded in check output.

Pinning workflow files does not make existing test commands, npm/Ruby packages,
SDK downloads or remote branches immutable. Those validation supply-chain risks
remain part of the current CI trust model and need separate review. The App key
is isolated from all of them.

## Baseline onboarding

The new integrity workflow checks PR diff whitespace and parses top-level JSON
and plugin XML metadata when present. Shared also syntax-checks distributable
JavaScript; CordovaPlugin syntax-checks plugin JavaScript; iOS-Specs syntax-checks
changed Ruby podspecs; iOS-SPM evaluates the Swift package manifest and checks
XCFramework ZIP integrity and required Info.plist members on macOS.

These are initial packaging/syntax checks. They do not replace native SDK tests,
consumer installation tests, pod spec lint, Swift binary compatibility tests or
the existing platform CI. Review whether this baseline is sufficient for each
previously unvalidated distribution repository before activation.

## Evaluation, then ruleset configuration

Use a disposable fixture with the real App to test success, failed/cancelled/
timed-out/missing jobs, workflow-level exclusions, legitimate/unexpected skips,
reruns, same-head concurrent runs, superseded heads/bases, modified reporters,
artifact collisions/replacement and another workflow publishing `CI result`.
Record check/run/attempt IDs and exact reviewed revisions in the spec PR. A
fixture App can be separate from the private production App so that production
installation remains limited to the agreed 11 repositories.

Only after observing the actual App check in each repository should the CI
ruleset bind `context=CI result` to its actual numeric App ID. Never substitute
`15368` or an unbound context. Keep enforcement `evaluate`. The implementation
must not recommend activation while source isolation, artifact replacement,
base freshness, rerun latency, initial validation scope, release automation or
other required evidence remains unresolved.
