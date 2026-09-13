# GitHub Support request draft

Submit this through GitHub Support **before** rewriting the canonical repository. Do not attach the recovery bundle, mailmap, removed report, or any credential scan output containing sensitive values.

## Subject

Coordinate sensitive-history cleanup for Ankish8/Veritio

## Body

We are preparing the private repository `https://github.com/Ankish8/Veritio` for a future public release and need GitHub Support to coordinate removal of sensitive historical material before any visibility change.

The path to remove from all reachable history is `security_best_practices_report.md`. The known blob is `fe98619259be2e4959b66e7e1692a81a1b3af6be`. Relevant commits include:

- `89e917da7be42292e19ab856127a645227609224`
- `27dd6a9a24b494df515b6d0d2ea43e20323ad3bf`

Our inventory found that 45 branch refs and all 78 pull-request refs contain the affected ancestry; no tag refs are affected. We have completed an isolated `git filter-repo` dry run that removes the path and remaps private author/committer email identities. The dry run retains rewritten PR refs, but we understand GitHub-owned `refs/pull/*` cannot be force-pushed by repository owners.

Before we update canonical branches, please confirm the exact coordinated procedure and what identifiers you need from us. After the rewrite, we need GitHub to dereference and purge cached access to:

- the removed blob and its old commit/diff pages;
- open and closed pull-request refs, diffs, and cached views;
- Actions references, logs, and artifacts that retain old commit links;
- server-side caches and any GitHub-controlled references; and
- forks, if any exist or were created while the repository was private.

Please also confirm how we should verify completion from a signed-out session before changing repository visibility. We will keep the repository private if the removed material cannot be made unreachable.

A full-history Gitleaks scan found no confirmed credentials in the repository history; this request is still required because the deleted security report and private identity values must not become public.

We will not force-update the canonical repository until GitHub confirms the procedure and our collaborators have acknowledged the maintenance window.
