#!/usr/bin/env bash
# check-skill-updates.sh — compare the skills installed in this directory against their upstream repos.
#
# The manifest of record is scripts/skill-sources.tsv. See ../README.md for the provenance tables
# and for the local edits that must be re-applied after any sync.
#
# Usage:
#   scripts/check-skill-updates.sh [--sources] [--offline] [--strict] [--cache DIR]
#
#   --sources    also list upstream skills that are not installed here, and local skills
#                that the manifest does not mention
#   --offline    use the cached upstream clones without fetching
#   --strict     exit 1 when anything needs attention
#   --cache DIR  where to keep upstream clones (default: $HOME/.cache/pi-skill-updates)
#
# Verdicts:
#   up-to-date      local tree matches the upstream default branch
#   upstream-ahead  local tree matches pinned_sha and upstream has moved  -> safe to copy over
#   local-drift     local tree differs from pinned_sha, upstream has not moved -> your edits only
#   conflict        local edits AND upstream moved                        -> merge by hand
#   unknown-pin     pinned_sha is not in the upstream clone                -> verify before trusting
#   missing-local   manifest row with no directory on disk
#   local-only      no upstream declared

set -uo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SRC_DIR/.." && pwd)"
MANIFEST="$SRC_DIR/skill-sources.tsv"

OFFLINE=0
SHOW_SOURCES=0
STRICT=0
CACHE="${PI_SKILLS_CACHE:-$HOME/.cache/pi-skill-updates}"

usage() {
  awk 'NR > 1 { if (/^#/) { sub(/^# ?/, ""); print } else exit }' "${BASH_SOURCE[0]}"
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --sources) SHOW_SOURCES=1 ;;
    --offline) OFFLINE=1 ;;
    --strict)  STRICT=1 ;;
    --cache)   CACHE="${2:?--cache needs a directory}"; shift ;;
    -h|--help) usage 0 ;;
    *) printf 'unknown option: %s\n\n' "$1" >&2; usage 2 ;;
  esac
  shift
done

manifest_row() { # returns "source<TAB>path<TAB>sha<TAB>state<TAB>note" for a local dir
  awk -F'\t' -v d="$1" '!/^#/ && $1==d {print $2"\t"$3"\t"$4"\t"$5"\t"$6}' "$MANIFEST"
}

repo_cache_dir() { echo "$CACHE/${1//\//__}"; }

ensure_repo() { # source -> echoes cache dir, or fails
  local source="$1" dir
  dir="$(repo_cache_dir "$source")"
  if [ -d "$dir/.git" ]; then
    if [ "$OFFLINE" -eq 0 ]; then
      git -C "$dir" fetch -q --prune origin >/dev/null 2>&1 \
        || echo "warning: fetch failed for $source, using the cached clone" >&2
    fi
  else
    if [ "$OFFLINE" -eq 1 ]; then
      echo "warning: no cached clone for $source (drop --offline)" >&2
      return 1
    fi
    mkdir -p "$CACHE"
    git clone -q "https://github.com/$source.git" "$dir" >/dev/null 2>&1 || {
      echo "warning: clone failed for $source" >&2
      return 1
    }
  fi
  printf '%s\n' "$dir"
}

default_branch() { # repo_dir -> branch name without the origin/ prefix
  local dir="$1" b
  b="$(git -C "$dir" symbolic-ref -q --short refs/remotes/origin/HEAD 2>/dev/null)" && { echo "${b#origin/}"; return 0; }
  for b in main master; do
    if git -C "$dir" rev-parse -q --verify "refs/remotes/origin/$b" >/dev/null 2>&1; then echo "$b"; return 0; fi
  done
  return 1
}

tree_at() { # repo_dir sha path destdir -> echoes destdir/path
  local dir="$1" sha="$2" path="$3" dest="$4"
  rm -rf "$dest"
  mkdir -p "$dest"
  if ! git -C "$dir" archive "$sha" "$path" 2>/dev/null | tar -x -C "$dest" 2>/dev/null; then
    return 1
  fi
  [ -e "$dest/$path" ] || return 1
  printf '%s\n' "$dest/$path"
}

same_tree() { diff -rq "$1" "$2" >/dev/null 2>&1; }

diff_detail() { # upstream_dir local_dir -> short human list of differences
  local u="$1" l="$2"
  diff -rq "$u" "$l" 2>/dev/null \
    | sed -e "s|^Files $u/|changed: |" -e "s| and .* differ\$||" \
          -e "s|^Only in $u/|upstream-only: |" \
          -e "s|^Only in $l/|local-only: |" \
    | head -8
}

verdict_width=14
counts_ok=0
counts_drift=0
counts_attention=0
attention_lines=""
seen_sources=""

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

record() { # status local_dir detail
  local status="$1" dir="$2" detail="${3:-}"
  printf '%-14s %s\n' "$status" "$dir"
  if [ -n "$detail" ]; then
    printf '%s\n' "$detail" | sed 's/^/               /'
  fi
  case "$status" in
    up-to-date|local-only) counts_ok=$((counts_ok + 1)) ;;
    local-drift) counts_drift=$((counts_drift + 1)) ;;
    *) counts_attention=$((counts_attention + 1)); attention_lines="$attention_lines
  $status  $dir" ;;
  esac
}

printf 'Skill update check — %s\n' "$ROOT"
printf 'Manifest: %s\n' "$MANIFEST"
[ "$OFFLINE" -eq 1 ] && printf 'Mode: offline (no fetch)\n'
printf '\n'

while IFS=$'\t' read -r local_dir source upstream_path pinned local_state note; do
  case "$local_dir" in ''|'#'*) continue ;; esac
  local_path="$ROOT/$local_dir"

  if [ ! -d "$local_path" ]; then
    record "missing-local" "$local_dir" "manifest lists this skill, but $local_path does not exist"
    continue
  fi

  if [ "$source" = "-" ]; then
    record "local-only" "$local_dir" "${note:-authored here}"
    continue
  fi

  repo="$(ensure_repo "$source")" || { record "unknown-pin" "$local_dir" "no upstream clone available for $source"; continue; }
  branch="$(default_branch "$repo")" || { record "unknown-pin" "$local_dir" "cannot determine the default branch of $source"; continue; }
  head_sha="$(git -C "$repo" rev-parse -q --verify "refs/remotes/origin/$branch")" || { record "unknown-pin" "$local_dir" "cannot resolve origin/$branch"; continue; }

  head_tree="$(tree_at "$repo" "$head_sha" "$upstream_path" "$WORK/$local_dir/head")" \
    || { record "unknown-pin" "$local_dir" "$upstream_path does not exist at $source@origin/$branch (moved or renamed upstream)"; continue; }

  if same_tree "$head_tree" "$local_path"; then
    record "up-to-date" "$local_dir" "$source@${head_sha:0:7} ($branch)"
    continue
  fi

  if pin_tree="$(tree_at "$repo" "$pinned" "$upstream_path" "$WORK/$local_dir/pin")"; then
    if same_tree "$pin_tree" "$head_tree"; then
      record "local-drift" "$local_dir" "upstream unchanged at ${pinned:0:7}; this copy has local edits
$(diff_detail "$head_tree" "$local_path")"
    elif same_tree "$pin_tree" "$local_path"; then
      record "upstream-ahead" "$local_dir" "$source moved ${pinned:0:7} -> ${head_sha:0:7} ($branch)
$(diff_detail "$head_tree" "$local_path")"
    else
      record "conflict" "$local_dir" "local edits AND upstream moved from ${pinned:0:7} to ${head_sha:0:7} ($branch)
$(diff_detail "$head_tree" "$local_path")"
    fi
  else
    record "unknown-pin" "$local_dir" "local tree differs from origin/$branch ($head_sha) and pinned $pinned is not in the clone; verify by hand
$(diff_detail "$head_tree" "$local_path")"
  fi
done < "$MANIFEST"

# Local directories the manifest does not mention.
unlisted=""
for d in "$ROOT"/*/; do
  name="$(basename "$d")"
  [ -f "$d/SKILL.md" ] || continue   # not a skill directory (e.g. scripts/)
  if [ -z "$(manifest_row "$name")" ]; then
    unlisted="$unlisted $name"
    counts_attention=$((counts_attention + 1))
  fi
done

if [ "$SHOW_SOURCES" -eq 1 ]; then
  printf '\nUpstream skills not installed here\n'
  while IFS=$'\t' read -r local_dir source upstream_path pinned local_state note; do
    case "$local_dir" in ''|'#'*) continue ;; esac
    [ "$source" = "-" ] && continue
    case " $seen_sources " in *" $source "*) continue ;; esac
    seen_sources="$seen_sources $source"
    repo="$(ensure_repo "$source")" || continue
    branch="$(default_branch "$repo")" || continue
    head_sha="$(git -C "$repo" rev-parse -q --verify "refs/remotes/origin/$branch")" || continue
    case "$source" in
      mattpocock/skills)        pattern='^skills/[^/]+/[^/]+/SKILL\.md$' ;;
      addyosmani/agent-skills)  pattern='^skills/[^/]+/SKILL\.md$' ;;
      humanlayer/skills)        pattern='^plugins/[^/]+/skills/[^/]+/SKILL\.md$' ;;
      kepano/obsidian-skills)   pattern='^skills/[^/]+/SKILL\.md$' ;;
      *)                        pattern='SKILL\.md$' ;;
    esac
    printf '  %s\n' "$source"
    git -C "$repo" ls-tree -r --name-only "$head_sha" \
      | grep -E "$pattern" \
      | while read -r f; do basename "$(dirname "$f")"; done \
      | sort -u \
      | while read -r up_name; do
          if [ -z "$(manifest_row "$up_name")" ]; then
            printf '    not installed: %s\n' "$up_name"
          fi
        done
  done < "$MANIFEST"
fi

printf '\n%d skills checked: %d need no action (%d up-to-date or local-only, %d with local edits), %d need attention\n' \
  "$((counts_ok + counts_drift + counts_attention))" "$((counts_ok + counts_drift))" "$counts_ok" "$counts_drift" "$counts_attention"
if [ -n "$attention_lines" ]; then
  printf 'Needs attention:%s\n' "$attention_lines"
fi
if [ -n "$unlisted" ]; then
  printf 'Not in the manifest:%s\n' "$unlisted"
fi
printf '\nRe-apply the local edits listed in README.md ("Local edits that a re-sync would clobber") after any sync.\n'

if [ "$STRICT" -eq 1 ] && [ "$counts_attention" -gt 0 ]; then
  exit 1
fi
exit 0
