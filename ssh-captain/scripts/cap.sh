#!/usr/bin/env bash
# ssh-captain — one captain machine drives many remote dev boxes over SSH.
# Roster, dossiers and job records live under $CAP_HOME (default ~/.claude/ssh-captain).
# This script NEVER types a password: install-key hands that to a GUI prompt.
set -uo pipefail

CAP_DIR="$(cd "$(dirname "$0")" && pwd)"
CAP_HOME="${CAP_HOME:-$HOME/.claude/ssh-captain}"
ROSTER="$CAP_HOME/hosts.tsv"
DOSSIER_DIR="$CAP_HOME/hosts"
JOB_DIR="$CAP_HOME/jobs"

SSH_BASE=(-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new
          -o ServerAliveInterval=15 -o ServerAliveCountMax=4 -o LogLevel=ERROR)

die() { printf 'cap: %s\n' "$*" >&2; exit 2; }
note() { printf '%s\n' "$*" >&2; }

# ---- portability ----------------------------------------------------------
# GNU coreutils on Linux and Git Bash; BSD equivalents on macOS. Remote-side
# differences are handled inline in the command strings that need them.

# cap_timeout <seconds> <cmd...> — GNU timeout, then gtimeout (brew coreutils),
# then a pure-bash watchdog. Exits 124 when the limit is hit, like timeout(1).
if command -v timeout >/dev/null 2>&1; then
  cap_timeout() { timeout "$@"; }
elif command -v gtimeout >/dev/null 2>&1; then
  cap_timeout() { gtimeout "$@"; }
else
  cap_timeout() {
    local secs="$1"; shift
    "$@" &
    local job=$!
    ( sleep "$secs"; kill -TERM "$job" 2>/dev/null ) >/dev/null 2>&1 &
    local watchdog=$!
    local rc=0
    wait "$job" 2>/dev/null || rc=$?
    kill -TERM "$watchdog" 2>/dev/null
    wait "$watchdog" 2>/dev/null
    # 128+SIGTERM: the watchdog fired, so report it the way timeout(1) does.
    [ "$rc" = 143 ] && rc=124
    return $rc
  }
fi

# cap_sha256 <file> — bare hash, no filename.
if command -v sha256sum >/dev/null 2>&1; then
  cap_sha256() { sha256sum "$1" | cut -d' ' -f1; }
elif command -v shasum >/dev/null 2>&1; then
  cap_sha256() { shasum -a 256 "$1" | cut -d' ' -f1; }
elif command -v openssl >/dev/null 2>&1; then
  cap_sha256() { openssl dgst -sha256 "$1" | awk '{print $NF}'; }
else
  cap_sha256() { printf '(no sha256 tool on this captain)'; }
fi

# BSD mktemp needs a template; GNU is happy with one too.
cap_mktemp() { mktemp "${TMPDIR:-/tmp}/cap.XXXXXX"; }

# GNU base64 wraps at 76 columns, BSD does not: strip newlines either way.
cap_b64() { base64 | tr -d '\n'; }

# cap_display — the DISPLAY to hand a GUI password prompt, or empty.
# Empty is correct on macOS and Windows: those dialogs are native, not X11.
# On X11 an inherited DISPLAY wins; otherwise take the socket that is actually
# there (a desktop is often :1, so guessing :0 opens nothing).
cap_display() {
  case "$(uname -s)" in Darwin|MINGW*|MSYS*|CYGWIN*) return 0;; esac
  [ -n "${DISPLAY:-}" ] && { printf '%s' "$DISPLAY"; return 0; }
  local s
  for s in /tmp/.X11-unix/X*; do
    [ -e "$s" ] && { printf ':%s' "${s##*/X}"; return 0; }
  done
  return 0
}

# cap_has_gui — can this captain put a window on a screen at all?
cap_has_gui() {
  case "$(uname -s)" in Darwin|MINGW*|MSYS*|CYGWIN*) return 0;; esac
  [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ] && return 0
  local s
  for s in /tmp/.X11-unix/X*; do [ -e "$s" ] && return 0; done
  return 1
}

ensure_home() {
  mkdir -p "$CAP_HOME" "$DOSSIER_DIR" "$JOB_DIR"
  [ -f "$ROSTER" ] || printf '# name\ttarget\tport\tidentity\trole\tadded\n' > "$ROSTER"
}

# ---- roster ---------------------------------------------------------------
# Fields of the named host land in H_NAME H_TARGET H_PORT H_ID H_ROLE H_ADDED.
load_host() {
  local want="$1" line
  ensure_home
  line=$(awk -F'\t' -v n="$want" '$1==n {print; exit}' "$ROSTER")
  [ -n "$line" ] || die "no such teammate: $want  (cap.sh list)"
  IFS=$'\t' read -r H_NAME H_TARGET H_PORT H_ID H_ROLE H_ADDED <<< "$line"
  [ "$H_PORT" = "-" ] && H_PORT=22
  H_KEYPATH=""
  [ "$H_ID" != "-" ] && H_KEYPATH="${H_ID/#\~/$HOME}"
  return 0
}

ssh_args() {
  SSH_ARGS=("${SSH_BASE[@]}" -p "$H_PORT")
  [ -n "$H_KEYPATH" ] && SSH_ARGS+=(-i "$H_KEYPATH" -o IdentitiesOnly=yes)
  return 0
}

all_names() { ensure_home; awk -F'\t' '/^#/ {next} NF {print $1}' "$ROSTER"; }

# ---- roster commands ------------------------------------------------------
cmd_list() {
  ensure_home
  local n=0 name target port id role added
  printf '%-16s %-26s %-5s %-28s %s\n' NAME TARGET PORT IDENTITY ROLE
  while IFS=$'\t' read -r name target port id role added; do
    case "$name" in '#'*|'') continue;; esac
    printf '%-16s %-26s %-5s %-28s %s\n' "$name" "$target" "$port" "$id" "$role"
    n=$((n+1))
  done < "$ROSTER"
  [ "$n" = 0 ] && note "(roster empty — cap.sh add <name> <user@host>)"
  return 0
}

cmd_add() {
  ensure_home
  local name="${1:-}" target="${2:-}"
  [ -n "$name" ] && [ -n "$target" ] || die "usage: cap.sh add <name> <user@host> [--port N] [--key PATH] [--role TEXT]"
  shift 2
  case "$target" in *@*) :;; *) die "target must be user@host, got: $target";; esac
  case "$name" in *[!A-Za-z0-9._-]*) die "name must be [A-Za-z0-9._-]";; esac
  local port=22 key="-" role="-"
  while [ $# -gt 0 ]; do
    case "$1" in
      --port) port="$2"; shift 2;;
      --key)  key="$2";  shift 2;;
      --role) role="$2"; shift 2;;
      *) die "unknown flag: $1";;
    esac
  done
  if awk -F'\t' -v n="$name" '$1==n {found=1} END {exit !found}' "$ROSTER"; then
    die "$name is already on the roster (cap.sh rm $name first)"
  fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$name" "$target" "$port" "$key" "$role" "$(date +%F)" >> "$ROSTER"
  if [ ! -f "$DOSSIER_DIR/$name.md" ]; then
    {
      printf '# %s — %s\n\n' "$name" "$target"
      printf '**Role:** %s\n' "$role"
      printf '**Registered:** %s\n\n' "$(date +%F)"
      printf '## Guardrails\n- (none recorded yet — write down what this box may NOT be used for)\n\n'
      printf '## Where work goes\n- (clone path, worktree convention, build output)\n\n'
      printf '## Known toolchain\n- (fill in from `cap.sh doctor %s`)\n' "$name"
    } > "$DOSSIER_DIR/$name.md"
  fi
  printf 'added %s -> %s (port %s)\ndossier: %s\n' "$name" "$target" "$port" "$DOSSIER_DIR/$name.md"
}

cmd_rm() {
  local name="${1:-}"
  [ -n "$name" ] || die "usage: cap.sh rm <name>"
  load_host "$name"
  local tmp; tmp=$(cap_mktemp)
  awk -F'\t' -v n="$name" '$1!=n' "$ROSTER" > "$tmp" && mv "$tmp" "$ROSTER"
  printf 'removed %s from the roster (dossier kept at %s)\n' "$name" "$DOSSIER_DIR/$name.md"
}

cmd_dossier() {
  local name="${1:-}"
  [ -n "$name" ] || die "usage: cap.sh dossier <name>"
  load_host "$name"
  local f="$DOSSIER_DIR/$name.md"
  [ -f "$f" ] || { note "no dossier yet: $f"; return 0; }
  cat "$f"
}

# ---- doctor ---------------------------------------------------------------
# reachability -> key auth -> identity -> toolchain. Reports, never repairs.
doctor_one() {
  local name="$1"
  load_host "$name"; ssh_args
  printf '=== %s  (%s port %s) ===\n' "$name" "$H_TARGET" "$H_PORT"
  local host="${H_TARGET#*@}" out rc
  if cap_timeout 8 bash -c "exec 3<>/dev/tcp/$host/$H_PORT" 2>/dev/null; then
    printf '  tcp      OK\n'
  else
    printf '  tcp      FAIL  cannot open %s:%s — box off, wrong address, or firewall\n' "$host" "$H_PORT"
    printf '  verdict  UNREACHABLE\n'
    return 1
  fi
  out=$(cap_timeout 20 ssh "${SSH_ARGS[@]}" -o BatchMode=yes "$H_TARGET" 'echo __CAP_AUTH_OK__' 2>&1); rc=$?
  if [ $rc -ne 0 ] || [ "${out#*__CAP_AUTH_OK__}" = "$out" ]; then
    printf '  key auth FAIL  %s\n' "$(printf '%s' "$out" | tr '\n' ' ' | cut -c1-170)"
    if [ -n "$H_KEYPATH" ] && [ ! -f "$H_KEYPATH" ]; then
      printf '  verdict  NO-KEY-FILE  %s is missing\n' "$H_KEYPATH"
      printf '           ASK THE USER, then: cap.sh keygen %s && cap.sh install-key %s\n' "$name" "$name"
    else
      printf '  verdict  NO-KEY-AUTH  a key exists but the remote does not trust it\n'
      printf '           ASK THE USER, then: cap.sh install-key %s\n' "$name"
    fi
    return 1
  fi
  printf '  key auth OK   %s\n' "${H_KEYPATH:-(default identity)}"
  cap_timeout 30 ssh "${SSH_ARGS[@]}" -o BatchMode=yes "$H_TARGET" '
    printf "  host     %s\n" "$(hostname)"
    if [ -r /etc/os-release ]; then . /etc/os-release
      printf "  os       %s  (kernel %s)\n" "$PRETTY_NAME" "$(uname -r)"
    else printf "  os       %s\n" "$(uname -sr 2>/dev/null || echo unknown)"; fi
    printf "  %s\n" "$(uptime | sed "s/^ *//")"
    printf "  disk     %s free on %s\n" "$(df -h "$HOME" 2>/dev/null | awk "NR==2{print \$4}")" "$HOME"
    have=""; miss=""
    for t in git node npm python3 dotnet cmake gcc make docker tmux rsync flock; do
      if command -v "$t" >/dev/null 2>&1; then have="$have $t"; else miss="$miss $t"; fi
    done
    printf "  have    %s\n" "$have"
    printf "  missing %s\n" "$miss"
  ' 2>&1
  printf '  verdict  READY\n'
  [ -s "$DOSSIER_DIR/$name.md" ] && printf '  dossier  %s  <- read this before working\n' "$DOSSIER_DIR/$name.md"
  return 0
}

cmd_doctor() {
  local who="${1:-all}" bad=0 n any=0
  if [ "$who" = all ]; then
    while read -r n; do
      [ -n "$n" ] || continue
      any=1
      doctor_one "$n" || bad=1
      echo
    done < <(all_names)
    [ "$any" = 0 ] && note "(roster empty — cap.sh add <name> <user@host>)"
  else
    doctor_one "$who" || bad=1
  fi
  return $bad
}

# ---- remote execution -----------------------------------------------------
# The joined argv is evaluated by the remote login shell: quote as you would there.
cmd_run() {
  local name="${1:-}"
  [ -n "$name" ] || die "usage: cap.sh run <name> [--timeout SEC] [--cd DIR] -- <command...>"
  shift
  local to=120 wd=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --timeout) to="$2"; shift 2;;
      --cd) wd="$2"; shift 2;;
      --) shift; break;;
      *) break;;
    esac
  done
  [ $# -gt 0 ] || die "no command given"
  load_host "$name"; ssh_args
  local cmd="$*"
  [ -n "$wd" ] && cmd="cd $wd && { $cmd; }"
  cap_timeout "$to" ssh "${SSH_ARGS[@]}" -o BatchMode=yes -T "$H_TARGET" "bash -lc $(printf %q "$cmd")"
  local rc=$?
  [ $rc -eq 124 ] && note "cap: TIMEOUT after ${to}s on $name — raise --timeout, or use 'cap.sh bg' for long work"
  return $rc
}

cmd_fleet() {
  local to=120
  while [ $# -gt 0 ]; do
    case "$1" in --timeout) to="$2"; shift 2;; --) shift; break;; *) break;; esac
  done
  [ $# -gt 0 ] || die "usage: cap.sh fleet [--timeout SEC] -- <command...>"
  local worst=0 n rc
  while read -r n; do
    [ -n "$n" ] || continue
    printf '=== %s ===\n' "$n"
    cmd_run "$n" --timeout "$to" -- "$@"; rc=$?
    printf -- '--- exit %s ---\n\n' "$rc"
    [ $rc -ne 0 ] && worst=$rc
  done < <(all_names)
  return $worst
}

# ---- file transfer --------------------------------------------------------
cmd_push() {
  local name="${1:-}" src="${2:-}" dst="${3:-}"
  [ -n "$name" ] && [ -n "$src" ] && [ -n "$dst" ] || die "usage: cap.sh push <name> <local> <remote>"
  [ -e "$src" ] || die "no such local path: $src"
  load_host "$name"; ssh_args
  local sc=(scp "${SSH_BASE[@]}" -P "$H_PORT" -o BatchMode=yes)
  [ -n "$H_KEYPATH" ] && sc+=(-i "$H_KEYPATH" -o IdentitiesOnly=yes)
  [ -d "$src" ] && sc+=(-r)
  "${sc[@]}" "$src" "$H_TARGET:$dst" || return $?
  if [ -f "$src" ]; then
    local q; q=$(printf %q "$dst")
    printf 'local  %s  %s\n' "$(cap_sha256 "$src")" "$src"
    printf 'remote %s\n' "$(cap_timeout 30 ssh "${SSH_ARGS[@]}" -o BatchMode=yes "$H_TARGET" \
      "sha256sum $q 2>/dev/null || shasum -a 256 $q 2>/dev/null" | awk '{print $1}')"
  else
    printf 'pushed directory %s -> %s:%s\n' "$src" "$name" "$dst"
  fi
}

cmd_pull() {
  local name="${1:-}" src="${2:-}" dst="${3:-}"
  [ -n "$name" ] && [ -n "$src" ] && [ -n "$dst" ] || die "usage: cap.sh pull <name> <remote> <local>"
  load_host "$name"; ssh_args
  local sc=(scp "${SSH_BASE[@]}" -P "$H_PORT" -o BatchMode=yes -r)
  [ -n "$H_KEYPATH" ] && sc+=(-i "$H_KEYPATH" -o IdentitiesOnly=yes)
  "${sc[@]}" "$H_TARGET:$src" "$dst" && printf 'pulled %s:%s -> %s\n' "$name" "$src" "$dst"
}

# ---- background jobs ------------------------------------------------------
# Long work (builds, test suites) must outlive one SSH round trip.
cmd_bg() {
  local name="${1:-}" tag="${2:-}"
  [ -n "$name" ] && [ -n "$tag" ] || die "usage: cap.sh bg <name> <tag> [--cd DIR] -- <command...>"
  shift 2
  case "$tag" in *[!A-Za-z0-9._-]*) die "tag must be [A-Za-z0-9._-]";; esac
  local wd=""
  while [ $# -gt 0 ]; do
    case "$1" in --cd) wd="$2"; shift 2;; --) shift; break;; *) break;; esac
  done
  [ $# -gt 0 ] || die "no command given"
  load_host "$name"; ssh_args
  local body="$*" script enc pid
  [ -n "$wd" ] && body="cd $wd || exit 1
$body"
  # The trap records the exit code even when the body calls exit itself.
  script="#!/usr/bin/env bash
set -o pipefail
__cap_rc=\"\$HOME/.ssh-captain/jobs/$tag.rc\"
rm -f \"\$__cap_rc\"
trap '__e=\$?; printf %s \"\$__e\" > \"\$__cap_rc\"' EXIT
$body"
  enc=$(printf '%s\n' "$script" | cap_b64)
  # base64 -d is GNU, -D -i -o is BSD; setsid does not exist on macOS, where
  # nohup alone is enough to survive the SSH disconnect.
  pid=$(cap_timeout 30 ssh "${SSH_ARGS[@]}" -o BatchMode=yes "$H_TARGET" \
    "d=\"\$HOME/.ssh-captain/jobs\"; mkdir -p \"\$d\" || exit 1; \
     printf %s '$enc' > \"\$d/$tag.b64\" || exit 1; \
     { base64 -d \"\$d/$tag.b64\" > \"\$d/$tag.sh\" 2>/dev/null \
       || base64 -D -i \"\$d/$tag.b64\" -o \"\$d/$tag.sh\"; } || exit 1; \
     rm -f \"\$d/$tag.b64\" \"\$d/$tag.rc\"; chmod +x \"\$d/$tag.sh\"; : > \"\$d/$tag.log\"; \
     if command -v setsid >/dev/null 2>&1; then \
       nohup setsid bash \"\$d/$tag.sh\" >> \"\$d/$tag.log\" 2>&1 < /dev/null & \
     else \
       nohup bash \"\$d/$tag.sh\" >> \"\$d/$tag.log\" 2>&1 < /dev/null & \
     fi; echo \$!" 2>&1)
  case "$pid" in
    ''|*[!0-9]*) printf '%s\n' "$pid" >&2; die "could not start job '$tag' on $name";;
  esac
  ensure_home
  printf '%s\t%s\t%s\t%s\n' "$tag" "$pid" "$(date +%FT%T)" "$*" >> "$JOB_DIR/$name.tsv"
  printf 'started %s on %s (remote pid %s)\n  tail:  cap.sh log %s %s\n  state: cap.sh jobs %s\n' \
    "$tag" "$name" "$pid" "$name" "$tag" "$name"
}

cmd_log() {
  local name="${1:-}" tag="${2:-}" n="${3:-60}"
  [ -n "$name" ] && [ -n "$tag" ] || die "usage: cap.sh log <name> <tag> [lines]"
  load_host "$name"; ssh_args
  cap_timeout 30 ssh "${SSH_ARGS[@]}" -o BatchMode=yes "$H_TARGET" \
    "d=\"\$HOME/.ssh-captain/jobs\"
     tail -n $n \"\$d/$tag.log\" 2>/dev/null || { echo '(no log yet for $tag)'; exit 0; }
     if [ -f \"\$d/$tag.rc\" ]; then printf -- '--- job %s finished, exit %s ---\n' '$tag' \"\$(cat \"\$d/$tag.rc\")\"
     else printf -- '--- job %s still running ---\n' '$tag'; fi"
}

cmd_jobs() {
  local name="${1:-}"
  [ -n "$name" ] || die "usage: cap.sh jobs <name>"
  load_host "$name"; ssh_args
  cap_timeout 30 ssh "${SSH_ARGS[@]}" -o BatchMode=yes "$H_TARGET" '
    d="$HOME/.ssh-captain/jobs"
    [ -d "$d" ] || { echo "(no jobs)"; exit 0; }
    found=0
    for s in "$d"/*.sh; do
      [ -e "$s" ] || continue
      found=1
      t=$(basename "$s" .sh)
      if pgrep -f "[j]obs/$t\.sh" >/dev/null 2>&1; then st=RUNNING
      elif [ ! -f "$d/$t.rc" ]; then st=killed
      elif [ "$(cat "$d/$t.rc")" = 0 ]; then st=done-ok
      else st="exit-$(cat "$d/$t.rc")"; fi
      ts=$(stat -c %y "$d/$t.log" 2>/dev/null) || ts=$(stat -f %Sm -t "%Y-%m-%d %H:%M:%S" "$d/$t.log" 2>/dev/null)
      printf "%-24s %-9s last write %s\n" "$t" "$st" "${ts%%.*}"
    done
    [ "$found" = 0 ] && echo "(no jobs)"
    exit 0'
}

# ---- keys -----------------------------------------------------------------
# Never run either of these without asking the user first (see SKILL.md).
cmd_keygen() {
  local name="${1:-}"
  [ -n "$name" ] || die "usage: cap.sh keygen <name> [--comment TEXT]"
  shift
  local comment="ssh-captain/$name@$(hostname)"
  while [ $# -gt 0 ]; do
    case "$1" in --comment) comment="$2"; shift 2;; *) die "unknown flag: $1";; esac
  done
  ensure_home
  local key="$HOME/.ssh/id_ed25519_$name"
  mkdir -p "$HOME/.ssh"; chmod 700 "$HOME/.ssh" 2>/dev/null
  [ -f "$key" ] && die "key already exists: $key — reuse it, or have the user delete it first"
  ssh-keygen -t ed25519 -f "$key" -N '' -C "$comment" >/dev/null || die "ssh-keygen failed"
  chmod 600 "$key" 2>/dev/null
  printf 'created %s\npublic key:\n%s\n' "$key" "$(cat "$key.pub")"
  if awk -F'\t' -v n="$name" '$1==n {found=1} END {exit !found}' "$ROSTER" 2>/dev/null; then
    local tmp; tmp=$(cap_mktemp)
    awk -F'\t' -v OFS='\t' -v n="$name" -v k="~/.ssh/id_ed25519_$name" '$1==n {$4=k} {print}' "$ROSTER" > "$tmp" && mv "$tmp" "$ROSTER"
    printf 'roster updated: %s now uses ~/.ssh/id_ed25519_%s\n' "$name" "$name"
  fi
  printf '\nNext (needs the remote password — the USER types it in a popup):\n  cap.sh install-key %s\n' "$name"
}

# install-key is the ONLY password path. A GUI askpass window asks the user;
# the password never passes through this script, the agent, or the transcript.
cmd_install_key() {
  local name="${1:-}"
  [ -n "$name" ] || die "usage: cap.sh install-key <name>"
  load_host "$name"
  local key="${H_KEYPATH:-$HOME/.ssh/id_ed25519_$name}"
  [ -f "$key.pub" ] || die "no public key at $key.pub — ask the user, then: cap.sh keygen $name"
  # $SSH_ASKPASS first (the user's own choice), then whatever the platform ships,
  # then the helper bundled with this skill for the platforms that ship nothing.
  local askpass="" c
  for c in "${SSH_ASKPASS:-}" \
           /mingw64/bin/git-askpass.exe /mingw32/bin/git-askpass.exe \
           "/c/Program Files/Git/mingw64/bin/git-askpass.exe" \
           /usr/lib/ssh/ssh-askpass /usr/bin/ssh-askpass \
           /usr/lib/openssh/gnome-ssh-askpass /usr/libexec/openssh/ssh-askpass; do
    [ -n "$c" ] && [ -x "$c" ] && { askpass="$c"; break; }
  done
  if [ -z "$askpass" ] && [ -x "$CAP_DIR/askpass.sh" ] && "$CAP_DIR/askpass.sh" --probe 2>/dev/null; then
    askpass="$CAP_DIR/askpass.sh"
  fi
  # No window is possible here. Hand the user the one-liner to run themselves —
  # never fall back to typing the password into a command.
  if [ -z "$askpass" ] || ! cap_has_gui; then
    local why="no askpass helper on this captain"
    cap_has_gui || why="this captain has no display (headless), so no window can open"
    printf 'cap: %s.\n\n' "$why" >&2
    printf 'Do NOT type the password here. Install the key yourself, from YOUR OWN terminal\n' >&2
    printf 'on this machine — the password then never leaves your shell:\n\n' >&2
    printf '  ssh-copy-id -i %s -p %s %s\n\n' "$key.pub" "$H_PORT" "$H_TARGET" >&2
    printf 'Then come back and confirm it took:\n\n  %s doctor %s\n\n' "$0" "$name" >&2
    printf 'To get a popup instead, see references/keys.md (zenity/kdialog on Linux,\nosascript on macOS) and re-run this.\n' >&2
    exit 2
  fi
  local -a askenv=(SSH_ASKPASS="$askpass" SSH_ASKPASS_REQUIRE=force)
  local disp; disp="$(cap_display)"
  [ -n "$disp" ] && askenv+=(DISPLAY="$disp")
  note "A password window is opening (${askpass##*/}${disp:+ on $disp})."
  note "Type the password for $H_TARGET there — the agent never sees it."
  cat "$key.pub" | env "${askenv[@]}" \
    ssh "${SSH_BASE[@]}" -p "$H_PORT" -T \
        -o PubkeyAuthentication=no \
        -o PreferredAuthentications=keyboard-interactive,password \
        -o NumberOfPasswordPrompts=1 "$H_TARGET" '
      umask 077
      mkdir -p "$HOME/.ssh"; touch "$HOME/.ssh/authorized_keys"
      chmod 700 "$HOME/.ssh"; chmod 600 "$HOME/.ssh/authorized_keys"
      k=$(cat)
      grep -qxF "$k" "$HOME/.ssh/authorized_keys" || printf "%s\n" "$k" >> "$HOME/.ssh/authorized_keys"
      echo __CAP_KEY_INSTALLED__' || die "install failed — see references/troubleshooting.md"
  printf '\nverifying key auth...\n'
  cmd_doctor "$name"
}

# ---- dispatch -------------------------------------------------------------
usage() {
  cat <<'USAGE'
ssh-captain — one captain machine, many remote dev boxes.

  cap.sh list                                     the roster
  cap.sh add <name> <user@host> [--port N] [--key PATH] [--role TEXT]
  cap.sh rm <name>
  cap.sh dossier <name>                           per-host guardrails — READ BEFORE WORKING
  cap.sh doctor [name|all]                        reachable? key auth? toolchain?
  cap.sh run <name> [--timeout SEC] [--cd DIR] -- <cmd...>
  cap.sh fleet [--timeout SEC] -- <cmd...>        the same command on every teammate
  cap.sh push <name> <local> <remote>             scp up, then sha256 on both sides
  cap.sh pull <name> <remote> <local>             scp down
  cap.sh bg <name> <tag> [--cd DIR] -- <cmd...>   long job, outlives the SSH round trip
  cap.sh log <name> <tag> [lines]                 tail that job's log
  cap.sh jobs <name>                              which jobs run / finished / failed
  cap.sh keygen <name> [--comment TEXT]           ASK THE USER FIRST
  cap.sh install-key <name>                       ASK FIRST; the user types the password

Remote command strings are evaluated by the remote login shell.
State lives in $CAP_HOME (default ~/.claude/ssh-captain).
USAGE
}

main() {
  local sub="${1:-}"
  [ $# -gt 0 ] && shift
  case "$sub" in
    list)        cmd_list "$@";;
    add)         cmd_add "$@";;
    rm)          cmd_rm "$@";;
    dossier)     cmd_dossier "$@";;
    doctor)      cmd_doctor "$@";;
    run)         cmd_run "$@";;
    fleet)       cmd_fleet "$@";;
    push)        cmd_push "$@";;
    pull)        cmd_pull "$@";;
    bg)          cmd_bg "$@";;
    log)         cmd_log "$@";;
    jobs)        cmd_jobs "$@";;
    keygen)      cmd_keygen "$@";;
    install-key) cmd_install_key "$@";;
    ''|-h|--help|help) usage;;
    *) die "unknown command: $sub  (cap.sh --help)";;
  esac
}
main "$@"
