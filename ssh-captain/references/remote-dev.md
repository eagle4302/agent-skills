# 在隊員身上開發

`CAP=~/.claude/skills/ssh-captain/scripts/cap.sh`

## 指令字串的規矩

`run` / `bg` / `fleet` 把 `--` 後面的參數用空白接成一條字串，送給遠端的 `bash -lc`。
所以：

- 引號、`&&`、`|`、`$VAR` 都是**遠端**在解析。想讓本機先展開就自己插值。
- 本機的 `$HOME`、`~` 不會自動變成遠端的家目錄；要寫遠端家目錄就直接寫 `~` 或 `$HOME`
  （在字串裡，由遠端展開）。
- `--cd DIR` 等於在前面加 `cd DIR && { ...; }`，比自己接 `cd x && ` 不容易出錯。
- 走的是 login shell，所以 `nvm`、`~/.local/bin`、snap 的 `dotnet` 這些 PATH 才會在。

```bash
bash $CAP run box --cd '~/proj' -- 'git status --short | head'
bash $CAP run box -- 'echo $HOSTNAME; ls "$HOME/bin"'
```

### 複雜指令：交給 `--file` 或 `script`（預設做法）

`run`／`bg` 把 `--` 後面的參數**用空白接成一條字串**（`cmd="$*"`）。所以一趟指令裡只要
出現引號、`;`、`|`、`>`、`&&` 或多行，就會連續經過好幾層解析：
harness → PowerShell → Git Bash → ssh → 遠端的 `bash -lc`。
**任何一層吃掉一個引號，結果就是「跑得完但做錯事」** —— `bg` 會回 `done-ok` 而 log 是空的，
`run` 會安靜地少跑幾段。細節與診斷法見
[troubleshooting.md](troubleshooting.md) 的「`bg` 回 `done-ok`，但 log 是空的」。

**所以不要內嵌：把東西寫成檔案，交給 `--file`。** body 走 base64，指令列裡只剩一個檔名，
哪一層都切不動它。

```bash
# 先在本機用檔案工具寫一個 LF 的 run.sh，然後：
bash $CAP run box --file ./run.sh                  # 前景，輸出直接串回來
bash $CAP run box --cd '~/proj' --file ./run.sh    # 也可以配 --cd
bash $CAP bg  box t1 --file ./run.sh               # 長工作
bash $CAP log box t1

# 要連輸出一起帶回本機（怕輸出被吃掉、或想留檔）：
bash $CAP script box ./run.sh --out ./run.out      # 在遠端跑，stdout+stderr 拉回來
bash $CAP script box ./run.sh --tag t1 --quiet     # 只印 exit code 與存檔路徑
```

`script` 把遠端輸出留在 `/tmp/cap-script-<tag>.out`，本機預設存成 `./<tag>.out`
（`--tag` 沒給就用檔名去掉副檔名）。它會回傳腳本的 exit code。

**一句話的判準**：如果這條指令你會想用引號包起來，就把它寫成檔案 ——
多寫一個檔的成本遠低於猜錯一輪。

## git

```bash
bash $CAP run box --cd '~/proj' -- 'git rev-parse --abbrev-ref HEAD; git log --oneline -5; git status --short'
bash $CAP run box --cd '~/proj' -- 'git fetch --all --prune && git log --oneline -3 origin/main'
```

**不要在隊員身上 commit / push，除非使用者明講。** 那是別人的工作樹，可能有他們沒存完的東西。
要看未提交的變更用 `git diff`，要拿回來用 `cap.sh pull`。

### worktree：同一台上跑多個版本

隊員常常要同時測好幾個 branch。用 worktree，不要 clone 好幾份：

```bash
bash $CAP run box --cd '~/proj' -- 'git worktree list'
bash $CAP run box --cd '~/proj' -- 'git worktree add ~/w-abc1234 abc1234'
bash $CAP run box -- 'rm -rf ~/w-abc1234 && cd ~/proj && git worktree prune'
```

命名慣例每台不一樣，看該台的 dossier。

## build 與 test：一律丟背景

編譯、測試很少在兩分鐘內結束，而 `run` 綁在一條 SSH 上，連線斷了工作就沒了。

```bash
bash $CAP bg box build1 --cd '~/proj' -- 'cmake --build build -j$(nproc)'
bash $CAP jobs box                     # RUNNING / done-ok / exit-N / killed
bash $CAP log  box build1 80           # 尾端 80 行 + 結束碼
```

`tag` 就是這份工作的名字（`[A-Za-z0-9._-]`）。**同名會覆蓋**上一份的 log 與 rc，
所以重跑同一件事前先 `log` 把結果看完，或換一個 tag。

遠端那側只用到 `~/.ssh-captain/jobs/<tag>.{sh,log,rc}`，其它地方不碰。

### 兩個工作搶同一份資源

硬體、port、測試資料庫這種東西不能兩份同時跑。用遠端的 `flock`：

```bash
bash $CAP bg box test-a --cd '~/proj' -- 'flock ~/proj/.test.lock ctest --output-on-failure'
bash $CAP bg box test-b --cd '~/proj' -- 'flock ~/proj/.test.lock ctest -R Slow'
```

兩份都會跑，但會排隊。`doctor` 的 `have` 欄會告訴你那台有沒有 `flock`。

## 檔案往返

```bash
bash $CAP push box ./patch.diff '~/proj/patch.diff'      # 檔案：自動比對兩邊 sha256
bash $CAP push box ./scripts '~/proj/scripts'            # 目錄：自動 -r
bash $CAP pull box '~/proj/build/test-results.xml' ./out/
```

- **換行符**：Windows 隊長送上去的檔多半是 CRLF，Linux 隊員要 LF。送 shell script
  或原始碼之前先轉：`sed -i 's/\r$//' file`，或推上去之後在遠端 `dos2unix`。
  CRLF 的 `.sh` 在 Linux 會報 `bad interpreter: No such file or directory`。
- **大量檔案**用 `rsync` 比 scp 快得多（`doctor` 會列 `rsync` 有沒有）：

  ```bash
  rsync -az --delete -e "ssh -i ~/.ssh/id_ed25519_box" ./src/ user@host:~/proj/src/
  ```

- **不要 push 整個 repo**。讓遠端自己 `git fetch`，或只送真正要的那幾個檔。

## 一次問所有隊員

```bash
bash $CAP fleet -- 'hostname; uptime; df -h ~ | tail -1'
bash $CAP fleet --timeout 300 -- 'cd ~/proj && git fetch -q && git log --oneline -1 origin/main'
```

`fleet` 依名冊順序一台一台跑，逐台印出 exit code，回傳最後一個非零。
**只用來查狀態或做無害的同步動作**，不要拿來對所有機器做會改東西的事。

## 不要做的事

- `sudo`、裝套件、改系統設定、重啟服務 —— 要問。
- 殺不是自己起的程序。遠端常有使用者的 VS Code / Cursor Remote-SSH session
  （看起來像 `ssh -T -D <port> ... sh`）和他們自己的 tmux。
- `rm -rf` 家目錄以外的路徑。
- 在隊員上開 agent / 長駐服務。隊長是大腦，隊員只跑被指派的指令。

## 學到的東西寫回 dossier

clone 在哪、worktree 怎麼命名、哪個目錄碰不得、測試要不要鎖、工具鏈缺什麼 ——
寫進 `~/.claude/ssh-captain/hosts/<name>.md`。下一個 session 只會讀那份，
不會讀這次的對話。
