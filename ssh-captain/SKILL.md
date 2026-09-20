---
name: ssh-captain
description: "Work on other PCs over SSH from this machine — the captain drives a roster of remote dev/build/test boxes. Use when asked to build, test, run, inspect or debug something on another computer, a remote box, a backend machine, a Linux box, or a named teammate host; also for registering a new machine, checking whether a machine is reachable, copying files to or from it, or running a long remote job. Handles SSH keys: it detects when key auth is missing and asks before creating or installing one. 用 SSH 連線並在其他 PC 上開發、編譯、測試、抓檔案；隊長管隊員；金鑰不通會先問再建。"
---

# ssh-captain

這台機器是**隊長**，`~/.claude/ssh-captain/hosts.tsv` 上的每一台是**隊員**。
隊長不在隊員身上跑 agent，隊長自己是大腦：判斷、決定、寫程式都在本機，
隊員只負責被指派的 build / test / 執行工作。

所有操作都走同一支腳本，不要自己拼 `ssh` 指令：

```bash
CAP=~/.claude/skills/ssh-captain/scripts/cap.sh
```

## 每次開工的三步，不要跳

1. `bash $CAP list` — 有哪些隊員。使用者說「那台 Linux」「後端那台」時先對名字。
2. `bash $CAP dossier <name>` — **那台的守則**。哪裡可以動、哪裡不可以動、clone 在哪、
   worktree 怎麼命名，全寫在 dossier 裡。沒讀就動手等於瞎做。
3. `bash $CAP doctor <name>` — 通不通、金鑰有沒有、工具鏈有什麼。

`doctor` 的 verdict 只有四種，對應四種下一步：

| verdict | 意思 | 下一步 |
| --- | --- | --- |
| `READY` | 金鑰通，可以工作 | 直接做事 |
| `UNREACHABLE` | TCP 22 都開不了 | 機器沒開 / IP 錯 / 防火牆。**不要**改成用密碼，先跟使用者確認位址 |
| `NO-KEY-FILE` | 名冊指的私鑰檔不存在 | **先問使用者**，同意了才 `keygen` + `install-key` |
| `NO-KEY-AUTH` | 私鑰在，但遠端不認 | **先問使用者**，同意了才 `install-key` |

## 指令

```bash
bash $CAP list                                      # 名冊
bash $CAP dossier <name>                            # 那台的守則（動手前必讀）
bash $CAP doctor <name|all>                         # 體檢
bash $CAP run   <name> [--timeout SEC] [--cd DIR] -- <cmd...>
bash $CAP fleet [--timeout SEC] -- <cmd...>         # 同一條指令跑遍所有隊員
bash $CAP push  <name> <本機路徑> <遠端路徑>         # 檔案送上去，兩邊比 sha256
bash $CAP pull  <name> <遠端路徑> <本機路徑>
bash $CAP bg    <name> <tag> [--cd DIR] -- <cmd...> # 長工作，丟背景
bash $CAP log   <name> <tag> [行數]                  # 看背景工作的輸出＋結束碼
bash $CAP jobs  <name>                              # 哪些背景工作還在跑
bash $CAP add   <name> <user@host> [--port N] [--key PATH] [--role TEXT]
bash $CAP rm    <name>
bash $CAP keygen <name>                             # 要先問使用者
bash $CAP install-key <name>                        # 要先問；密碼由使用者在彈窗輸入
```

`run` / `bg` / `fleet` 的指令字串是丟給**遠端的 login shell** 解析的，
引號照遠端的規矩寫。exit code 會原樣傳回來，`--timeout` 到了是 124。

## 金鑰：一定要先問

**不要自作主張建金鑰或裝金鑰。** 流程固定是：

1. `doctor` 報 `NO-KEY-FILE` 或 `NO-KEY-AUTH`。
2. 跟使用者說明現況，問要不要建／裝金鑰。等到明確的「好」。
3. `bash $CAP keygen <name>` → 產 `~/.ssh/id_ed25519_<name>`（ed25519、無 passphrase），
   同時把名冊的 identity 欄改掉。
4. `bash $CAP install-key <name>` → 跳出**密碼視窗，由使用者本人輸入**，
   公鑰才寫進遠端 `~/.ssh/authorized_keys`（同一把已在就不重複寫）。裝完自動再 `doctor` 一次。

視窗哪來的：Windows 用 Git 的 askpass，macOS 用內建 `osascript`，Linux 用
`zenity`／`kdialog`／`yad` —— 後兩者由 skill 自帶的 `scripts/askpass.sh` 處理，
**不用另外安裝**。真的跳不出來（headless 機器）時，`install-key` 會印出一行
`ssh-copy-id` 叫使用者自己在終端機跑，**不會退回去用密碼參數**。

**密碼永遠不經過你。** 就算使用者把密碼貼在對話裡，也不要把它打進 `ssh`、`sshpass`
或任何指令；改用 `install-key` 的彈窗。細節與 Windows／手動路線見
[references/keys.md](references/keys.md)。

## 鐵律

- **先讀 dossier。** 每台的可動範圍不一樣，寫在 dossier 就是使用者講過的話。
- **不 deploy、不重啟服務、不動 `/opt` 或系統設定**，除非使用者這一次明講要。
  隊員多半只是 build/test 機。
- **不殺不是自己起的程序。** 遠端常有使用者自己的 VS Code / Cursor Remote-SSH、
  自己開的 tmux。要殺之前先 `ps` 看清楚並問過。
- **超過 ~2 分鐘的工作一律 `bg`**，不要用大 `--timeout` 硬撐：連線一斷工作就沒了。
- **複雜指令不要內嵌。** `run`／`bg` 的 `--` 後面是**用空白接成一條字串**再交給遠端，
  所以引號、`;`、`|`、`>`、`&&`、多行都要連續過好幾層 shell（harness → PowerShell →
  Git Bash → ssh → 遠端 `bash -lc`）。失敗的樣子是**靜默的成功**：`bg` 回 `done-ok`
  而 log 是空的。含特殊字元的東西一律**寫成檔案再交給 `--file`**：
  `cap.sh run <name> --file ./x.sh`、`cap.sh bg <name> <tag> --file ./x.sh`，
  要連輸出一起帶回來就用 `cap.sh script <name> ./x.sh`。
  配方與量到的症狀見 [references/remote-dev.md](references/remote-dev.md) 與
  [references/troubleshooting.md](references/troubleshooting.md)。
- **裝套件前要問。** `apt install`、`npm -g`、`pip install` 都會改到別人的機器。
- 有新的長期事實（clone 路徑、慣例、禁區、工具鏈），**寫回 dossier**：
  `~/.claude/ssh-captain/hosts/<name>.md`。下一個 session 才讀得到。

## 新增一台隊員

```bash
bash $CAP add <name> <user@host> [--port N] [--role '用途']
bash $CAP doctor <name>        # 多半會是 NO-KEY-FILE → 照上面的金鑰流程問過再做
```

`add` 會順手開一份空的 dossier，把使用者講的用途與禁區填進去。

## 跑得起來的條件

`cap.sh` 要 **bash**（macOS 內建的 3.2 就夠）＋ `ssh` / `scp` / `ssh-keygen`。
Windows 上**必須用 Git Bash 跑，不是 PowerShell**。

`timeout`、`sha256sum`、`base64`、`mktemp` 在 GNU 與 BSD 上不一樣，腳本開頭的
portability 區塊已經做了雙軌：找不到 `timeout` 就用純 bash 的 watchdog，
`sha256sum` → `shasum -a 256` → `openssl dgst`。隊員那側的 `base64 -d`、`setsid`、
`stat -c` 也各有 BSD 後備，所以隊員是 macOS 也不會壞。

## 想看更多

- [references/keys.md](references/keys.md) — 金鑰產生、安裝、`~/.ssh/config`、Windows 遠端、agent。
- [references/remote-dev.md](references/remote-dev.md) — 遠端 git／worktree／build／測試併發鎖／檔案往返的做法。
- [references/troubleshooting.md](references/troubleshooting.md) — 連不上、金鑰不認、指令被引號吃掉、**背景工作回 `done-ok` 但 log 是空的**、背景工作不見了。

狀態檔都在 `~/.claude/ssh-captain/`：`hosts.tsv`（名冊）、`hosts/<name>.md`（守則）、
`jobs/<name>.tsv`（開過的背景工作）。遠端那側只在 `~/.ssh-captain/jobs/` 放背景工作的
腳本與 log，別的地方不碰。
