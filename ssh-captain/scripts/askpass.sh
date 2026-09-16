#!/bin/sh
# ssh-captain askpass — asks the USER for a password in a GUI dialog and prints
# it on stdout. That is the whole SSH_ASKPASS contract: prompt in $1, secret out.
#
# Used only by `cap.sh install-key`, and only when the platform has no askpass of
# its own (macOS never does; many Linux installs do not either). The password
# goes straight from the dialog to ssh — never through cap.sh, a log, a command
# line, or the agent's transcript.
#
# `askpass.sh --probe` exits 0 when a dialog could actually be shown here, so
# cap.sh can fail with useful advice instead of a broken pipe.

prompt="${1:-Password:}"

probe=0
[ "$prompt" = "--probe" ] && { probe=1; prompt="probe"; }

case "$(uname -s)" in
  Darwin)
    command -v osascript >/dev/null 2>&1 || exit 1
    [ "$probe" = 1 ] && exit 0
    # One line, no AppleScript continuation character, so the file stays ASCII.
    osascript - "$prompt" <<'APPLESCRIPT' 2>/dev/null
on run argv
  display dialog (item 1 of argv) default answer "" with hidden answer with title "ssh-captain" with icon caution
  return text returned of result
end run
APPLESCRIPT
    ;;
  *)
    if command -v zenity >/dev/null 2>&1; then
      [ "$probe" = 1 ] && exit 0
      zenity --entry --hide-text --title="ssh-captain" --text="$prompt" 2>/dev/null
    elif command -v kdialog >/dev/null 2>&1; then
      [ "$probe" = 1 ] && exit 0
      kdialog --title "ssh-captain" --password "$prompt" 2>/dev/null
    elif command -v yad >/dev/null 2>&1; then
      [ "$probe" = 1 ] && exit 0
      yad --entry --hide-text --title="ssh-captain" --text="$prompt" 2>/dev/null
    else
      exit 1
    fi
    ;;
esac
