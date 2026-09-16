# 金鑰

## 規矩先講

1. **建金鑰、裝金鑰之前一定要問使用者。** 這是改別人機器的信任設定，不是技術細節。
2. **密碼永遠由使用者自己輸入。** 不要把密碼寫進指令、不要用 `sshpass`、
   不要因為使用者把密碼貼在對話裡就拿去用。唯一的密碼路徑是 `cap.sh install-key`
   跳出來的那個視窗。
3. 金鑰檔命名固定 `~/.ssh/id_ed25519_<name>`，`<name>` 就是名冊上的隊員名字。
   一台一把，不要共用，出事時可以只撤掉一台。

## 正常流程

```bash
CAP=~/.claude/skills/ssh-captain/scripts/cap.sh
bash $CAP doctor mybox          # NO-KEY-FILE / NO-KEY-AUTH
# ↓ 問過使用者、得到「好」之後
bash $CAP keygen mybox          # 產 ~/.ssh/id_ed25519_mybox，並更新名冊 identity 欄
bash $CAP install-key mybox     # 彈窗要密碼 → 使用者輸入 → 公鑰進遠端 authorized_keys
```

`keygen` 產的是 **ed25519、沒有 passphrase** 的金鑰。沒有 passphrase 是刻意的：
agent 要能在無人看著的時候用它。代價是拿到這台電腦的人就能登入隊員，
所以金鑰只發給實驗室／內網的機器，不要對外網主機這樣做。

`install-key` 做的事（冪等，重跑不會重複寫）：

```
umask 077
mkdir -p ~/.ssh; touch ~/.ssh/authorized_keys
chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys
公鑰不在檔裡才 append
```

## 彈窗是怎麼來的

關鍵是 `SSH_ASKPASS_REQUIRE=force`：它讓 ssh **不管有沒有 tty 都走 askpass**，
密碼因此落在 GUI 視窗裡，不經過 stdin、不經過 log、不進對話紀錄。
（這個選項要 OpenSSH 8.4+。）

askpass 的規格只有一句話：**提示字串從 `$1` 進來，使用者打的密碼印到 stdout。**

`cap.sh install-key` 的挑選順序：

1. **`$SSH_ASKPASS`** —— 你自己指定的優先，想換成別支就 `export` 它。
2. **平台內建的**：Windows 的 `git-askpass.exe`（Git for Windows 附的）、
   Linux 的 `/usr/bin/ssh-askpass`、`/usr/lib/openssh/gnome-ssh-askpass` 等。
3. **本 skill 自帶的 `scripts/askpass.sh`** —— 給那些什麼都沒有的平台。

### 自帶的 askpass.sh

macOS 不內建 askpass，很多 Linux 安裝也沒有，所以 skill 自己帶一支：

| 平台 | 它用什麼開視窗 |
| --- | --- |
| macOS | `osascript` 的 `display dialog ... with hidden answer`（系統內建，不用裝東西） |
| Linux | `zenity` → `kdialog` → `yad`，哪個在用哪個 |

`askpass.sh --probe` 只回答「這裡跳不跳得出來」，不會真的開視窗。`cap.sh` 用它
決定要走彈窗還是走下面的手動路線。

實測 2026-09-16：Ubuntu 24.04 的 `martin-DeskOne-T1` 有 `zenity`，probe 通過，
**不用 `apt install` 任何東西**就能跳。

### DISPLAY

macOS 與 Windows 的視窗是原生的，不吃 `DISPLAY`，`cap.sh` 不會去設它。
X11 才需要，而且**不能硬猜 `:0`** —— 非互動 SSH 進去時 `DISPLAY` 是空的，
而桌面常常在 `:1`。`cap.sh` 的 `cap_display` 會：繼承的 `DISPLAY` 優先，
沒有就掃 `/tmp/.X11-unix/X*` 挑真正存在的那個。
（`martin-DeskOne-T1` 就是 `:1`。）

### 跳不出來的時候

`cap.sh` **不會退回去用終端機問，也不會用參數帶密碼**。它會印出你可以自己跑的那一行：

```
  ssh-copy-id -i ~/.ssh/id_ed25519_<name>.pub -p 22 user@host
```

在**你自己的終端機**跑，密碼從頭到尾在你的 shell 裡。跑完回來 `cap.sh doctor <name>`
確認。headless 伺服器沒有桌面，這條是唯一的路，不是退路。

## `~/.ssh/config` 要不要一起寫

`cap.sh` 每次都帶 `-i <key> -o IdentitiesOnly=yes`，所以**不寫 config 也會通**。
但使用者自己 `ssh` 或 VS Code Remote-SSH 會讀 config，寫上去他們才方便：

```
Host 192.168.177.1
  HostName 192.168.177.1
  User martin
  IdentityFile ~/.ssh/id_ed25519_martin
  IdentitiesOnly yes
```

改 config 前先 `cat`，用 append 不要整檔覆寫 —— 裡面常有使用者自己的 Host 區塊。

## 遠端是 Windows 的時候

`cap.sh install-key` 寫的是 POSIX 路徑，**Windows 遠端不適用**，會失敗。
遇到 Windows 隊員，把公鑰內容交給使用者，請他們在那台上自己跑：

```powershell
# 一般使用者
Add-Content -Path "$env:USERPROFILE\.ssh\authorized_keys" -Value "<公鑰那一行>"
# 管理員帳號要放這裡（OpenSSH Server 的規定）
Add-Content -Path "$env:ProgramData\ssh\administrators_authorized_keys" -Value "<公鑰那一行>"
icacls "$env:ProgramData\ssh\administrators_authorized_keys" /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F"
```

之後 `cap.sh run`／`push`／`pull` 照常可用，只是遠端指令要寫成該機器預設 shell
看得懂的樣子（`cap.sh run` 送的是 `bash -lc`，Windows 遠端沒有 bash 就會失敗；
那種機器要嘛裝 Git for Windows 並把預設 shell 設成 bash，要嘛改用互動方式處理）。

## 金鑰通了卻還是 Permission denied

依序查：

```bash
# 1. 本機私鑰權限（Git Bash 下 chmod 有時無效，改看 Windows ACL）
ls -l ~/.ssh/id_ed25519_<name>
# 2. 遠端的目錄／檔案權限，sshd 對鬆權限會直接無視 authorized_keys
bash $CAP run <name> -- 'ls -ld ~ ~/.ssh; ls -l ~/.ssh/authorized_keys'   # 要 700 / 600，家目錄不能 group-writable
# 3. 遠端 sshd 到底看到什麼
ssh -vv -i ~/.ssh/id_ed25519_<name> user@host true 2>&1 | grep -iE 'offering|authentications|denied'
```

家目錄 `drwxrwxr-x` 這種 group-writable 的權限是最常見的元兇，`chmod g-w ~` 就好。

## 撤銷

```bash
bash $CAP run <name> -- "grep -v 'ssh-captain/<name>@' ~/.ssh/authorized_keys > /tmp/ak && mv /tmp/ak ~/.ssh/authorized_keys"
rm ~/.ssh/id_ed25519_<name> ~/.ssh/id_ed25519_<name>.pub
bash $CAP rm <name>
```

`keygen` 給的 comment 就是 `ssh-captain/<name>@<captain 主機名>`，所以認得出是哪一把。
這是破壞性操作，**做之前要問**。
