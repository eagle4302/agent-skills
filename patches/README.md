# Local-edit patches

One unified diff per `modified` skill: upstream at the pinned commit (left) to this tree (right).
The matching sentinels live in `scripts/local-edits.json`; these patches are what re-applies an
edit after a sync has copied upstream over it.

## Regenerate

```bash
node scripts/make-patches.mjs          # rewrite patches/<skill>.patch from the cached upstream clone
node scripts/make-patches.mjs --check  # write nothing; exit 1 when a patch is stale
```

Upstream trees come from the clones `scripts/check-skill-updates.sh` caches under
`$HOME/.cache/pi-skill-updates` (override with `PI_SKILLS_CACHE`). Run that script online at least
once so every pinned commit is present.

## Apply after a sync

From the repo root, after the upstream tree has been copied over:

```bash
git apply patches/<skill>.patch
node scripts/lint-skills.mjs --strict
```

Patches are stored with LF; `git apply` matches the CRLF working tree this Windows checkout uses,
and `git apply -R --check` verifies one against the current tree.

## Not covered

- `divergent` skills (`code-review-and-quality`): the body is rewritten, so README says to treat an
  upstream update as a source of ideas, not a patch to apply.
- `hold` skills: never synced.
- `reverse-engineer-anything`: byte-identical to the `rea-agents` package skill; there is no hand
  edit to re-apply, and a re-sync copies the package directory.
