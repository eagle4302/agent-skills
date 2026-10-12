#!/usr/bin/env bash
# 把「還沒結的事」一次倒出來，給 field-office-checklist skill 分類用。
# 用法：bash .claude/skills/field-office-checklist/scripts/scan-open-work.sh [現場 exe 的 commit]
# 不給 commit 就從最新一份 .scratch/field-report-*.md 抓第一個 1.0.0+<sha>。
# 只讀，不改任何檔。
set -u

root=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "不在 git repo 裡"; exit 1; }
cd "$root" || exit 1

latest() { ls -1 "$@" 2>/dev/null | sort -V | tail -1; }

report=$(latest .scratch/field-report-*.md)
since=${1:-}
if [ -z "$since" ] && [ -n "$report" ]; then
  since=$(grep -m1 -oE '1\.0\.0\+[0-9a-f]{7,40}' "$report" | sed 's/1\.0\.0+//')
fi
base_date=""
if [ -n "$since" ] && git cat-file -e "$since^{commit}" 2>/dev/null; then
  base_date=$(git log -1 --format=%ad --date=format:%Y-%m-%d "$since")
else
  since=""
fi

echo "# 1. 交接與現場文件"
echo "- 最新現場回報：${report:-（沒有）}"
if [ -n "$report" ]; then
  used=$(grep -m1 -oE 'handoff[^ ）`]*prompt[^ ）`]*\.md' "$report")
  echo "  它照哪一版做：${used:-（回報開頭沒寫，自己看）}"
fi
echo "- 現場交接提示詞（全部，新的在後；比現場回報新的那份是下一趟的草稿）："
ls -1 .scratch/handoff-field-agent-prompt*.md .scratch/handoff-*-field-agent-prompt*.md 2>/dev/null | sort -u | sed 's/^/  - /'
for pattern in ".scratch/HANDOFF-*-field-to-office.md" ".scratch/handoff-*-office-end.md" \
               ".scratch/handoff-*-field-visit.md"; do
  f=$(latest $pattern)
  [ -n "$f" ] && echo "- $f"
done
echo

echo "# 2. 票（.scratch/*/issues，依分類排序）"
echo "分類：FIELD 剩真機｜FIELD? 狀態不標準但看起來剩真機｜FIELD-WAIT 使用者決定等現象／先不查"
echo "      DONE-NEW 基準日（${base_date:-無}）當天或之後才 done，真機多半還沒驗｜ASK needs-info"
echo "      OFFICE｜BLOCKED｜LATER 以後再做｜NO-STATUS／OTHER 要讀票面"
echo "分類 | 檔案 | 標題 | Status 前 160 字"
# 一支 gawk 掃完全部票（逐檔開子程序在 Windows 上要一分多鐘）。
# 中文要按字元截，所以釘 UTF-8 locale。
LC_ALL=C.UTF-8 gawk -v base="$base_date" '
  function emit(   s, low, bucket, d, pending) {
    if (file == "") return
    s = status
    sub(/^\*{0,2}Status[^:]*:\*{0,2}[[:space:]]*/, "", s)
    gsub(/^[`*[:space:]]+/, "", s)
    low = tolower(s)
    pending = (s ~ /(未上真機|沒上真機|真機未驗|真機待驗|真機還沒|真機沒|真機.{0,6}未看|剩(真機|現場)|待現場|還沒在真機)/)
    d = ""
    if (match(s, /20[0-9][0-9]-[01][0-9]-[0-3][0-9]/)) d = substr(s, RSTART, RLENGTH)

    if (low ~ /^(done|resolved|implemented)/) {
      # 舊的 done 多半已由各功能的真機驗收票涵蓋，只計數；基準日以後的逐張列。
      if (base != "" && d >= base) bucket = "DONE-NEW"
      else { if (pending) old_pending++; return }
    }
    else if (low ~ /^(wontfix|closed|superseded|duplicate)/ || s ~ /^已部署、真機驗過/) return
    else if (low ~ /^ready-for-human/)
      bucket = (s ~ /(使用者決定(先不|等)|等現象)/) ? "FIELD-WAIT" : "FIELD"
    else if (low ~ /^needs-info/)                                          bucket = "ASK"
    else if (low ~ /^(ready-for-agent|needs-triage|in-progress|claimed)/ || s ~ /^進行中/)
      bucket = pending ? "FIELD?" : "OFFICE"
    else if (low ~ /^blocked/)                                             bucket = "BLOCKED"
    else if (s ~ /^以後再做/)                                              bucket = "LATER"
    else if (s == "")                                                      bucket = "NO-STATUS"
    else                                                                   bucket = (pending || low ~ /^open/) ? "FIELD?" : "OTHER"
    printf "%s | %s | %s | %s\n", bucket, substr(file, 10), title, substr(s, 1, 160)
  }
  FNR == 1 { emit(); file = FILENAME; title = $0; sub(/^#+[[:space:]]*/, "", title); status = "" }
  status == "" && /^\*{0,2}Status/ { status = $0 }
  END {
    emit()
    if (old_pending > 0)
      printf "~ （另有 %d 張基準日以前 done、票面寫著真機沒驗的舊票沒列：多半已由各功能的真機驗收票涵蓋，要查再 grep「未上真機」）\n", old_pending
  }
' .scratch/*/issues/*.md | sort -t'|' -k1,1 -s
echo

echo "# 3. 現場 exe 之後還沒上機的程式改動"
if [ -n "$since" ]; then
  echo "基準：$since（$(git log -1 --format='%ad %s' --date=format:'%m-%d %H:%M' "$since" | cut -c1-80)）"
  git log --no-merges --format='- %h %ad %s' --date=format:'%m-%d %H:%M' "$since"..HEAD \
    -- '*.cs' '*.xaml' '*.csproj' '*.slnx' 'Machine/*'
else
  echo "（找不到基準 commit：給參數，或在現場回報寫上 1.0.0+<sha>）"
fi
echo

echo "# 4. GitHub open issues"
if command -v gh >/dev/null 2>&1; then
  for repo in eagle4302/MetalAutoUQDwpf eagle4302/MaertinEtherCAT; do
    echo "## $repo"
    gh issue list -R "$repo" --state open --limit 100 --json number,title,labels \
      --jq '.[] | "#\(.number) [\(.labels | map(.name) | join(","))] \(.title)"' 2>&1 | head -100
  done
else
  echo "（這台沒有 gh，跳過）"
fi
