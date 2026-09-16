# 出事的時候

`CAP=~/.claude/skills/ssh-captain/scripts/cap.sh`。第一步永遠是 `bash $CAP doctor <name>`，
它會把問題縮到下面其中一格。

## `verdict UNREACHABLE`

TCP 22 連不上。可能是機器沒開、IP 變了、防火牆、或走了不同的網段。

```bash
ping -n 2 <ip>                                    # PowerShell / cmd
bash $CAP list                                    # 名冊上記的位址對不對
```

多網卡的機器（工控電腦很常見）在不同網段上有不同 IP，名冊記的那個未必是現在通的那個。
**不要自己猜新位址去試**，問使用者。確認後：

```bash
bash $CAP rm <name> && bash $CAP add <name> user@<新位址> --key '~/.ssh/id_ed25519_<name>' --role '...'
```

（dossier 不會被刪，`add` 會沿用原本那份。）

## `verdict NO-KEY-FILE` / `NO-KEY-AUTH`

見 [keys.md](keys.md)。重點只有一句：**先問使用者，不要自己建、不要打密碼。**

## `Permission denied (publickey)` 但金鑰檔明明在

九成是權限。sshd 對太鬆的權限會直接無視 `authorized_keys`：

```bash
bash $CAP run <name> -- 'ls -ld ~ ~/.ssh; ls -l ~/.ssh/authorized_keys'
```

家目錄不能 group/other writable（`chmod g-w,o-w ~`），`~/.ssh` 要 700，
`authorized_keys` 要 600。

## 指令被引號吃掉 / 遠端說 `command not found`

`run` 的字串是**遠端** shell 解析的。常見狀況：

- 本機 Git Bash 在送出前就把 `$VAR` 展開了 → 用單引號包整條指令。
- 路徑有空白 → 在遠端的引號裡再包一層：`-- 'ls "$HOME/My Docs"'`。
- 指令其實在 PATH 上但找不到 → `run` 走 `bash -lc`，login shell 應該有讀
  `.bashrc`／`.profile`；若該工具靠 `nvm` 或只在互動 shell 才載入，就寫絕對路徑。

要看實際送出去的東西，把指令換成 `echo`：

```bash
bash $CAP run <name> -- 'echo "$0 saw: $*"'
```

## `bad interpreter: No such file or directory`

推上去的 script 是 CRLF。轉成 LF 再推：

```bash
sed -i 's/\r$//' script.sh && bash $CAP push <name> script.sh '~/script.sh'
```

## `exit 124`

`run` 的 `--timeout` 到了（預設 120 秒）。**不要單純把 timeout 調大**：
SSH 一斷工作就死。改丟背景：

```bash
bash $CAP bg <name> <tag> --cd '~/proj' -- '<原本那條指令>'
bash $CAP log <name> <tag>
```

## 背景工作不見了 / `jobs` 顯示 `killed`

`killed` 的意思是：process 不在了，而且沒留下 `.rc`。可能是 OOM、機器重開、
或有人 `kill` 了它。log 還在：

```bash
bash $CAP log <name> <tag> 200
bash $CAP run <name> -- 'ls -l ~/.ssh-captain/jobs/'
bash $CAP run <name> -- 'dmesg -T 2>/dev/null | grep -i "killed process" | tail -3'   # OOM?
```

`jobs` 的其他狀態：`RUNNING` 還在跑、`done-ok` 結束碼 0、`exit-N` 結束碼 N。

## 同一個 tag 重跑，舊結果沒了

會。`bg` 會清掉同名的 log 與 rc。先 `log` 看完，或換 tag。

## 遠端磁碟滿了

```bash
bash $CAP run <name> -- 'df -h ~; du -sh ~/.ssh-captain/jobs 2>/dev/null; du -sh ~/* 2>/dev/null | sort -h | tail -10'
```

清自己的東西可以（`~/.ssh-captain/jobs/*.log`、自己建的 worktree）；
清別人的東西要問。

## 連線很慢／每條指令都卡好幾秒

每次 `run` 都是一條新的 SSH（Windows 上不用 ControlMaster，msys 的 unix socket
不可靠）。想少一點往返就把多條指令接成一條：

```bash
bash $CAP run <name> --cd '~/proj' -- 'git fetch -q && git log --oneline -3 && git status --short'
```

遠端 load 很高時 `doctor` 的 `load average` 會看得出來 —— 那不是網路問題，
是機器在忙，可能是使用者自己在跑東西，先問再搶資源。

## 換一台電腦當隊長

複製 `~/.claude/skills/ssh-captain/` 就好，沒有安裝步驟。但：

- **不要複製私鑰。** 新隊長自己 `keygen` + `install-key`，一台一把才撤得乾淨。
- 名冊 `~/.claude/ssh-captain/hosts.tsv` 是狀態，不在 skill 資料夾裡，不會跟著走。
  `hosts/*.md`（dossier）是知識，值得複製。
- **`cap.sh` 要保持 LF。** 被轉成 CRLF 會報 `bad interpreter`：
  `file ~/.claude/skills/ssh-captain/scripts/cap.sh` 看到 CRLF 就 `sed -i 's/\r$//'`。

### 隊長是 macOS

腳本自己會挑：沒有 `timeout` 就用純 bash 的 watchdog（一樣回 124）、
`sha256sum` 沒有就換 `shasum -a 256` 再換 `openssl dgst`。裝了
`brew install coreutils` 會被認出 `gtimeout`，但不裝也能跑。

密碼彈窗走 skill 自帶的 `scripts/askpass.sh`，它用系統內建的 `osascript`，
**不用 brew 裝 askpass**。

`/bin/bash` 3.2 就夠，不需要 brew 的 bash 5。

### 密碼視窗跳不出來

先確認這台到底有沒有能開視窗的東西：

```bash
sh ~/.claude/skills/ssh-captain/scripts/askpass.sh --probe; echo "probe=$?"   # 0 = 跳得出來
command -v zenity kdialog yad osascript
echo "DISPLAY=${DISPLAY:-unset}  WAYLAND=${WAYLAND_DISPLAY:-unset}"; ls /tmp/.X11-unix/ 2>/dev/null
```

- probe 回 1、又沒有任何 GUI 工具 → Linux 裝 `zenity`（或 `apt install ssh-askpass-gnome`）。
- probe 回 0 但視窗沒出現 → `DISPLAY` 指錯。`cap.sh` 會掃 `/tmp/.X11-unix/X*`，
  但你若在 SSH 裡跑而桌面在另一個 session，就自己 `export DISPLAY=:1`（看上面掃到什麼）。
- 機器根本沒有桌面 → 不可能有視窗。`install-key` 會印一行 `ssh-copy-id` 給你自己跑。

### 隊員是 macOS

`bg` 的 `base64 -d` 會退到 `base64 -D -i -o`，沒有 `setsid` 就只用 `nohup`
（一樣活得過 SSH 斷線），`jobs` 的 `stat -c` 會退到 `stat -f %Sm`。
真的遇到怪狀況，先確認是不是這三個之一：

```bash
bash $CAP run <name> -- 'base64 --help 2>&1 | head -3; command -v setsid || echo "no setsid"; stat -c %y /etc/hosts 2>&1 | head -1'
```

## 我改壞了名冊

`~/.claude/ssh-captain/hosts.tsv` 是純文字 TSV，欄位是
`name  target  port  identity  role  added`，開頭 `#` 的是註解。直接編輯就好。
dossier 在 `~/.claude/ssh-captain/hosts/<name>.md`，刪掉名冊那行不會動到它。
