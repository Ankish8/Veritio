# Public-history sanitization runbook

Do not change repository visibility until every gate in this runbook is complete. A normal branch merge cannot remove objects from old commits, pull-request refs, Actions logs, artifacts, forks, caches, or existing clones.

## Audited scope (2026-09-13)

- Canonical repository: `Ankish8/Veritio` (private)
- Removed path: `security_best_practices_report.md`
- Reachable blob before rewrite: `fe98619259be2e4959b66e7e1692a81a1b3af6be`
- Pull-request refs containing the affected history: 78 of 78
- Branch refs containing the affected history: 45
- Tag refs containing the affected history: 0
- Personal/placeholder author identities to remap: two email values, kept outside this repository

The private recovery bundle created before the dry run is intentionally not stored in this repository. Keep it encrypted or permission-restricted, and never attach it to an issue, release, or Actions artifact.

## Isolated rewrite

1. Freeze merges and pushes for the coordinated maintenance window.
2. Make a fresh authenticated mirror clone from GitHub.
3. Fetch the reviewed private release branch into the mirror before rewriting it. Never merge or push an old-history checkout after the rewrite:

   ```bash
   git fetch /absolute/path/to/reviewed/checkout \
     codex/open-source-readiness:refs/heads/codex/open-source-readiness
   ```

4. Create a mailmap outside the mirror. Each old identity gets a line in this form:

   ```text
   Ankish8 <Ankish8@users.noreply.github.com> <OLD_EMAIL>
   ```

5. Rewrite every advertised ref, including GitHub pull-request refs:

   ```bash
   git filter-repo --force \
     --invert-paths \
     --path security_best_practices_report.md \
     --mailmap ../private-author-mailmap
   ```

6. Verify before adding the remote back:

   ```bash
   git rev-list --objects --all | rg 'security_best_practices_report\.md$'
   git cat-file -e fe98619259be2e4959b66e7e1692a81a1b3af6be
   git log --all --format='%ae%n%ce' | sort -u
   git fsck --full --no-reflogs --unreachable
   ```

   The first, second, and fourth commands must produce no reachable object. The author list must contain only approved public or bot identities.

The 2026-09-13 isolated dry run met those object and identity checks while retaining all 78 rewritten PR refs. It did not update GitHub.

## GitHub coordination gate

Before a force update, open a GitHub Support request using GitHub's sensitive-data-removal process. Provide the affected commit and blob identifiers, state that all 78 PR refs are affected, and request pull-request dereferencing plus cached-view cleanup after the rewrite. Confirm how closed PR diffs, cached commits, Actions references, and forks will be handled.

Do not force-update the canonical repository until GitHub confirms the cleanup procedure and every collaborator has acknowledged the maintenance window. When approved:

1. Remove or disable branch rules only for the minimum force-update window.
2. Force-update the reviewed branch and tag set from the sanitized mirror. GitHub-owned `refs/pull/*` cannot be pushed directly; Support must handle those references.
3. Immediately restore branch protection/rulesets and required checks.
4. Require every collaborator and deployment checkout to delete the old clone and reclone. Do not merge an old branch after the rewrite.
5. Re-run the object, identity, Gitleaks, dependency, authorization, test, type-check, and build gates against the fresh canonical clone.
6. Ask GitHub Support to confirm garbage collection/dereferencing, then test old commit, blob, and PR URLs from a signed-out browser.

If GitHub cannot make the historical report unreachable, keep the repository private.

## Other publication surfaces

Before visibility changes, separately inspect and remove or rotate sensitive values in:

- Actions logs and downloadable artifacts
- release assets and source archives
- package and container registries, image labels, and build provenance
- deployment logs and cached build output
- issue/PR text, comments, review suggestions, and attachments
- forks and collaborator clones

Deleting an artifact or log is not a substitute for rotating a credential. Any confirmed credential must be rotated first and treated as compromised.
