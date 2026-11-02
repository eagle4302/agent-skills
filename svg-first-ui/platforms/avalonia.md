# Avalonia 轉換要點

> 前提：`UI_SPEC.md` 已存在、高保真已核准。這份只講「怎麼把核准的 SVG 變成乾淨的 Avalonia 版面」。
> 適用 Avalonia 11+。Avalonia 也是 XAML，但樣式、主題、資源機制與 WPF 不同，不要整份搬 `wpf.md` 的寫法。

## 1. 尺寸與 DPI

- Avalonia 的版面單位是邏輯像素（DIP），縮放由 `TopLevel.RenderScaling` 處理。
- 視窗尺寸直接對應 `viewBox`：`Width="1920" Height="1080"`。
- 截圖比對固定 100% 縮放（RenderScaling = 1）、同視窗尺寸、關閉動畫。
- 觸控目標 44–48 DIP 寫成資源，不因縮放改變。

## 2. 版面

| SVG 結構 | Avalonia 寫法 |
|---|---|
| 固定頂部工具列 | `Grid`：`RowDefinitions="Auto,*"`；或 `DockPanel.Dock="Top"` |
| 左右分欄 | `Grid`：`ColumnDefinitions="360,*"`（可加 `GridSplitter`） |
| KPI 四欄等寬 | `UniformGrid Columns="4"` 或 `Grid` 四欄 `*` |
| 卡片內堆疊 | `StackPanel` + `Spacing`（Avalonia 11） |
| 清單 / 表格 | `ListBox`／`ItemsControl` + `DataTemplate`；表格用 `DataGrid`（套件）或自訂列 |
| 浮層 | 同一 `Grid` 最上層 `Border` + 遮罩，或用 `Popup`；不要用 `Canvas` 拼版面 |

規則：

- 外距用 `Margin`、內距用 `Padding`；`StackPanel` 用 `Spacing` 取代逐項 Margin。
- 讓內容隨視窗延展：`HorizontalAlignment="Stretch"`、`Grid` 星號欄位；固定尺寸只給真正固定的區塊。
- 8px 網格照 token 寫，不硬編 `16`。
- 長字用 `TextBlock.TextTrimming="CharacterEllipsis"`，設計稿要先畫出截斷樣子。
- `Canvas` 只留給真正的自由畫布（機台配置圖）。

## 3. 設計變數 → 主題

- token 放 `ResourceDictionary`（`Colors.axaml`、`Typography.axaml`、`Spacing.axaml`、`Radii.axaml`），在 `App.axaml` 合併。
- 顏色／筆刷用 `DynamicResource` 綁，主題切換才會即時生效。
- 深淺主題用 `ThemeVariant`：`Application.RequestedThemeVariant` 或 `ThemeVariantScope`；token 的 `ResourceDictionary` 用 `ThemeDictionaries` 分別放 `Light`／`Dark` 值。
- 控制項外觀用 `ControlTheme`（Avalonia 11）或 keyed `Style`；`Application.Styles` 放全域樣式，不要寫在每個 view。
- 不要直接改內建主題的資源；定義自己的 `ControlTheme` 並 `BasedOn` 內建主題。

## 4. 元件與重用

| SVG | Avalonia |
|---|---|
| `<g id="header">` | `UserControl`（`.axaml` + code-behind），檔名 PascalCase |
| `<use href="#icon-search">` | 可重用 `UserControl` 或 `PathIcon`（幾何路徑） |
| 重複卡片 | `DataTemplate` + `ItemsControl`／`ListBox` |
| 清單列 | `ItemsControl` + `DataTemplate`，不手動貼 N 份 XAML |
| 條件面板 | `ContentControl` + `DataTemplate` |

- 元件名稱＝`g id` 轉 PascalCase；共用樣式放 `Styles/`。
- 清單一律 `ObservableCollection<T>` + `DataTemplate`；排序／篩選放 ViewModel。
- 不要用 code-behind 直接操作視覺樹來組版面。

## 5. 狀態

- 狀態用 ViewModel 的 enum 屬性，不要一串 bool。
- 切換外觀優先用 `Classes` 綁定（Avalonia 的樣式選擇器）：`Classes.loading="{Binding IsLoading}"`，樣式寫 `Button.loading`、`Border.error`。
- 面板級切換用 `ContentControl` + `DataTemplate`（依狀態物件型別選模板），或 `IsVisible` 綁定；同一容器換內容，外框尺寸不變。
- 載入中：骨架 `Border` 撐住原尺寸。
- 空／錯誤／離線／無權限：同一個 slot 換模板，不要各做一份頁面。
- 動效用 `Transitions`（`Opacity`、`RenderTransform`），時長用 token；不要用觸發式 WPF `DataTrigger` 的寫法（Avalonia 11 沒有）。

## 6. 資料與假資料

- 繫結用 `ObservableCollection<T>`；編譯式繫結要設 `x:DataType`（專案開啟 `AvaloniaUseCompiledBindingsByDefault` 時必填）。
- 假資料放 `Design/` 或 `fixtures/`；設計時預覽用 `Design.DataContext`（若專案支援）或 dev 參數。
- 開發期切狀態：`--state=error` 參數或 dev 選單；每個狀態都要能直接開。
- 使用者可見字串集中管理，為多語系預留（Avalonia 沒有內建 i18n，需自訂資源或套件）。

## 7. 字型與圖示

- `FontFamily` 明確指定中文字型（例 `Microsoft JhengHei UI`）；跨平台要確認目標系統有該字型，否則內嵌字型。
- 數值用等寬字（`Cascadia Mono`／`Consolas`）。
- Avalonia 的 `Image` 預設不支援 SVG：用 `Avalonia.Svg.Skia` 套件，或把核准 SVG 的 `<path>` 轉成 `StreamGeometry`／`PathIcon`。
- 圖示顏色用 `DynamicResource` 綁 token，主题切換才跟著換。

## 8. 截圖與比對

- 用 `RenderTargetBitmap` 渲染目標控制項後 `Save(path)`：不受螢幕縮放與視窗位置影響，適合逐狀態截圖。
- 或在測試用 `Avalonia.Headless` 套件渲染並取幀；注意它走無頭後端，字型可能與實機不同，需另做一次實機抽查。
- 固定視窗 1920×1080、RenderScaling = 1、關閉動畫、固定假資料；每個狀態各一張。
- 與核准 PNG 同尺寸並排，輸出 `design/<screen>/compare/`，差異用腳本算。

## 9. 常見坑

- WPF 的 `DataTrigger`、`Style.Triggers` 在 Avalonia 11 不適用：改用 `Classes` 綁定＋選擇器，或 `ContentControl` 換模板。
- `ControlTheme` 與 `Style` 是兩套機制：範本化控制項（Button、TextBox）用 `ControlTheme`，一般屬性用 `Style`。
- 資源沒合併進 `App.axaml` 時，`DynamicResource` 找不到值，畫面會變透明／預設色。
- 在 `Grid` 內直接設 `Width` 會破壞伸縮；固定寬度用欄位定義。
- `Image` 不支援 SVG：要嘛套件，要嘛預先轉檔。
- 中文字型沒指定時會落到系統預設，行高與設計稿差 2–4px。
- `StackPanel.Spacing` 是 Avalonia 11 才有的；舊版要逐項 `Margin`。
- 無頭截圖的字型渲染與實機不同：Phase 5 以實機截圖為準。
