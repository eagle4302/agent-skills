# 設備運轉監控頁 — 問題清單（第一輪／專家走查）

> 這一輪是啟發式檢查，不是可用性測試。問題等級代表「修正優先序」，不代表使用者實際受影響的程度（那要等真實受測者）。

## 統計

| 等級 | 數量 |
|---|---|
| Blocker | 1 |
| Major | 7 |
| Minor | 6 |

## 問題

| ID | 標題 | 維度 | 等級 | 任務／狀態 | 證據 | 觀察 | 預期 | 建議修正 | 路由 | 狀態 |
|---|---|---|---|---|---|---|---|---|---|---|
| I-01 | 趨勢圖上限線與標籤不一致 | Clarity／資料正確性 | Blocker | T1、所有狀態 | `evidence/issue-14-threshold.png` | 標籤寫「上限 1,800」，但線畫在約 1,400 的位置（依 0/1,000/2,000 刻度推算） | 線的位置與標籤一致 | 依刻度重算 y，或把標籤改成實際值；順便把閾值寫進 UI_SPEC | Design | Open |
| I-02 | 確認警報的對象不明 | Clarity | Major | T2 | `evidence/issue-01-header-actions.png` | 標題列「確認警報」與警報列「確認／靜音」都可按，沒有選取列或說明會確認哪一筆 | 明確指向選取的那一筆 | 只保留列內動作，或改成「確認選取警報」並要求先選列 | Design | Open |
| I-03 | 同一台設備的 OEE 不一致 | Clarity／Data | Major | T1 | 全圖（清單 62%、詳情 87.6%） | 清單 OEE 62%，詳情「本班稼動率」87.6%，沒有期間標籤 | 同一個數字或標明不同期間 | 統一期間，或清單加「上一班」、詳情加「本班」 | Design／Data | Open |
| I-04 | 未確認警報筆數對不上 | Clarity／Data | Major | T2 | 全圖（KPI 2、表頭「未確認 2 筆」、表內 1 筆） | 只看得到 1 筆未確認，但兩處都寫 2 | 筆數與可見列一致，或標「顯示 3／N 筆」 | Design／Data | Open |
| I-05 | 觸控目標低於 48px | A11y／Feel | Major | T2、T4、T5 | `evidence/issue-04-filter-chips.png` | 按鈕 40px、chips 32px；控制室觸控建議 48px | ≥48px | 控制項高度改 48，chips 加大或合併 | Design | Open |
| I-06 | 小字對比不足 | A11y | Major | 全畫面 | `evidence/issue-06-muted-text.png` | `#64748B` 用在 11–12px 的單位、標籤、狀態列；對 `#111A2B` 約 3.6:1 | ≥4.5:1 | 小字改用 secondary 或提高 muted 亮度；或放大字級 | Design（tokens） | Open |
| I-07 | 六種狀態沒有畫面 | Flow／Coverage | Major | T2、T3、T5、T6 | `flow-map.md` | 載入中、空資料、錯誤、離線、無權限、停用都沒有畫面 | 每種狀態都能看到並操作 | 高保真一張一狀態；先補錯誤、載入、離線 | Design | Open |
| I-08 | 警報中心入口未出現（規劃有、畫面沒有） | Flow／Coverage | Major | 警報表 | `notes.md` 畫面跳轉、`flow-map.md` | 規格寫了「查看全部警報」→ 警報中心，但中保真沒有這個入口 | 入口可見，或從規格移除 | 補入口並保留返回路徑 | Design | Open |
| I-09 | 狀態只用形狀點 | Clarity／A11y | Minor | 清單 | `evidence/issue-08-status-dots.png` | 四種狀態只有圓點形狀，沒有文字或 legend | 形狀＋文字或 legend | 加狀態文字或 hover/tooltip；高保真加 legend | Design | Open |
| I-10 | 「檢視趨勢」與現有圖重複 | Clarity | Minor | T1 | 全圖 | 畫面已有趨勢圖，按鈕目的（放大？新視窗？）不明 | 按鈕目的明確 | 改成「放大趨勢」或移除 | Design | Open |
| I-11 | 產線下拉缺少欄位標籤 | Clarity | Minor | T3 | 全圖 | 只有「產線 A」，與時間範圍相鄰，靠文字推測 | 一眼知道是產線切換 | 加 icon 或小標籤，或改成「產線：A」 | Design | Open |
| I-12 | 狀態列統計與 24 台不符 | Data | Minor | T7 | `evidence/issue-10-statusbar.png` | 10+1+2+1=14，其餘 10 台未分類 | 加總等於總台數或標明範圍 | 加「停機／其他」或標「僅統計有資料設備」 | Data／Design | Open |
| I-13 | 警報訊息與現值矛盾未說明 | Clarity／Data | Minor | T1、T2 | 全圖 | 14:30 水溫超過 72°C，14:32 顯示 68.4°C，未說明是否已回落 | 顯示峰值／目前值與處理狀態 | 加「已回落，待確認」或峰值欄位 | Design／Data | Open |
| I-14 | 篩選後詳情行為未定義 | Flow | Minor | T4 | `flow-map.md` | 若選取的 M-07 被「離線」篩選濾掉，右側詳情是否保留未定義 | 有明確規則（保留／清空／提示） | 定義並畫出 | Design | Open |

## 路由規則

| 路由 | 問題 |
|---|---|
| Design（改 SVG 與 UI_SPEC，重新核准） | I-01、I-02、I-03、I-04、I-05、I-07、I-08、I-09、I-10、I-11、I-13、I-14 |
| Data（修 fixture 或資料來源） | I-03、I-04、I-12、I-13 |
| Implementation | 本輪無（沒有平台實作） |
| Environment | 無 |

## 待決

- I-01 是 Blocker：修好前不建議進高保真，也不建議給現場看。
- I-02～I-07 是 Major：建議在 mid v2 一起修，修完重新核准。
- Minor 可帶進高保真一起處理，但要列在 UI_SPEC 的已知問題。
- 真實受測者場次需要 2–3 人與時段，等修正後再約。
