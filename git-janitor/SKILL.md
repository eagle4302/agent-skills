---
name: git-janitor
description: Sweep a messy working tree — every entry triaged into commit, push, .gitignore, or delete. Use when `git status` has accumulated untracked or stray files, before wrapping up a task or ending a session, when the user says "commit", "push", "clean up", "tidy this repo", or "what do I do with these files".
---

# Git Janitor: Sweep the Working Tree

## Overview

One pass over a dirty working tree. Every entry — modified, staged, untracked, or newly ignorable — is **triaged** into exactly one of four bins, and each bin gets its own action: **commit**, **push**, **ignore**, **delete**.

A **sweep** leaves the tree clean without losing work. The four decisions the user wants — commit when it should, push when it should, delete when it should, gitignore when it should — fall out of the triage, not from four separate passes.

## The four bins

| Bin | Goes here | Action |
|---|---|---|
| **Commit** | Source, config, docs, tests the work actually changed | Stage by name, commit (atomic, in the repo's style) |
| **Ignore** | Build output, deps, caches, editor/OS files, secrets | Add a pattern to `.gitignore` — never commit, never delete |
| **Delete** | Proven junk only (see rule below) | Show it, get one **yes**, remove |
| **Flag** | Anything ambiguous or possibly valuable | Report it and leave the tree untouched |

Two bins act on their own (commit, ignore), one acts after a single confirmation (delete), one only reports (flag).

## Rule: delete only what cannot be missed

A file is **delete**-safe only when a file of its kind could be rebuilt or was never meant to exist:

- Build output, dependencies and caches (`node_modules/`, `dist/`, `build/`, `target/`, `.venv/`, `__pycache__/`) belong to the **Ignore** bin, never this one — deleting a cache buys a rebuild for nothing.
- Zero-byte stray files with code-fragment names (`!ids.has(e.source)`, `.slice(0`) — safe to delete.
- A file the user explicitly named as junk — safe to delete.

Everything else is **flag**. A file with content, a plausible name, or unknown provenance is never auto-deleted: report it and let the user decide. **Chesterton's Fence** — a file you cannot explain is a file you cannot delete.

## Steps

### 1. Survey

Read the whole tree before touching anything:

```bash
git status --porcelain=v1 -uall     # every changed + untracked entry
git log --oneline -10               # the commit style to match
git remote -v                       # where a push would go
git branch -vv                      # does this branch track an upstream?
```

**Done when** you can list every entry and its state (modified / staged / untracked / tracked-but-should-be-ignored).

### 2. Triage every entry

Walk the survey list and assign each entry exactly one bin from the table above. Two overrides:

- A file that looks like a secret (`.env`, `*.pem`, `id_rsa`, `credentials.*`, key-shaped strings) → **ignore** or **flag**. A tracked secret is a leak, not a commit.
- Anything you cannot classify with confidence → **flag**.

**Done when** every entry has one bin — no entry left unassigned.

### 3. Apply the ignore bin

For each ignore entry, add the smallest matching pattern to `.gitignore` (create the file at the repo root if missing; use the package root's `.gitignore` in a monorepo). Preserve existing lines and structure.

If the file is **already tracked**, `.gitignore` alone will not stop it — run `git rm --cached <path>` to untrack it while keeping it on disk, and say so in the report. Untracking does not remove the blob from history: for a secret, say plainly that it is still in every past commit, that rotating the key is the real fix, and that rewriting history is the user's decision.

**Done when** every ignore entry is covered by a pattern, and every previously-tracked one is untracked.

### 4. Apply the delete bin

Present the delete list with sizes, then ask once for a single yes/no confirmation covering the whole list. On yes, remove the files. On no, move them to **flag**.

**Done when** each delete candidate is either removed or re-binned to flag.

### 5. Commit the commit bin

Group the commit-bin entries into atomic commits — one logical change each, no generated files riding along, no formatting mixed with behavior:

```bash
git add <path> <path>          # stage by name
git commit -m "<type>: <why>"  # match the style from step 1
```

Match the repo's existing convention (Conventional Commits, ticket-prefixed, or plain prose — whichever `git log` shows). Stage by name; the keys to the repo are not yours to hand out.

**Done when** every commit-bin entry is committed and `git status` shows nothing left staged.

### 6. Decide the push

Push when the branch has an upstream and the new commits are ready to leave the machine:

```bash
git push            # branch already tracks an upstream
```

Push only a fast-forward update to the branch you own. No upstream yet → `git push -u origin HEAD`. Remote diverged, or the branch is the default branch (`main`/`master`) → stop and ask before pushing.

**Done when** the commits are pushed, or the push is declined with a reason.

### 7. Report

Close the sweep with one line per bin, so nothing was changed silently:

```
COMMITTED:  3 files → 2 commits (feat(auth): …, chore: …)
IGNORED:    node_modules/, dist/, .env  (+ .gitignore updated, .env untracked)
DELETED:    !ids.has(e.source)  (0 B stray)
FLAGGED:    scratch-notes.md (2.1 KB — kept, decide later)
PUSHED:     origin/feat/idle-timeout
```

The **flag** list is the point of the report: it is the sweep's residue of human judgment, not a failure.

## Hard guardrails

- **Deletion needs a yes.** The delete bin never runs on its own.
- **No force-push, ever.** Diverged remote → report, don't `--force`.
- **A fast-forward to your own upstream only.** Default branch and untracked-remote pushes ask first.
- **Hooks stay on.** Commits run hooks and signing as configured; skipping them is not the janitor's call.
- **Secrets never commit.** A secret goes to ignore or flag.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It's untracked, so `git add -A` is fine." | `-A` sweeps in `.env` and build output. Stage by name from the bins. |
| "This stale file is obviously junk, delete it." | "Obviously" is the failure mode. Name the rebuild path or the bug signature, or flag it. |
| "I'll commit the whole tree in one go." | One giant commit hides the four decisions. Triage first, then commit per bin. |
| "The remote diverged, I'll force-push." | Force-push is how other people's work disappears. Report the divergence. |
| "It's a tiny secret, I'll add it and fix later." | History keeps it forever. Ignore it now. |
| "`gitignore` it without `rm --cached`, it's fine." | A tracked file stays tracked. Untrack it or the pattern does nothing. |
