# WPF／XAML 轉換要點

> 前提：`UI_SPEC.md` 已存在、高保真已核准。這份只講「怎麼把核准的 SVG 變成乾淨的 WPF 版面」。
> 適用 .NET 8+ 的 WPF；.NET Framework 4.8 只差在 Fluent 主題與部分 API。

## 1. 尺寸換算

- SVG 的 1 設計 px＝WPF 的 1 DIP（`1/96` 吋，100% 縮放時 1:1）。
- 視窗尺寸直接對應 `viewBox`：`Width="1920" Height="1080"`、`WindowState` 依需求。
- 開 `UseLayoutRounding="True"` 與 `SnapsToDevicePixels="True"`，避免 1px 誤差。
- 125%／150% 縮放時 DIP 不變、像素變多，這是預期行為；截圖比對要固定 100%。
- 小字（≤14px）可設 `TextOptions.TextFormattingMode="Display"`，正文保持預設 `Ideal`。

## 2. 版面

| SVG 結構 | WPF 寫法 |
|---|---|
| 固定頂部工具列 | `Grid.RowDefinitions`：`Auto` + `*`；或 `DockPanel` 的 `DockPanel.Dock="Top"` |
| 左右分欄（清單＋詳情） | `Grid.ColumnDefinitions`：`360` + `*`；分隔可用 `GridSplitter` |
| KPI 四欄等寬 | `UniformGrid Columns="4"` 或 `Grid` 四欄 `*` |
| 卡片內垂直堆疊 | `StackPanel`／`Grid` row `Auto` |
| 表格 | `DataGrid`（可排序／捲動）或 `ItemsControl`＋`Grid` template |
| 浮層（modal／drawer） | 同一 `Grid` 最上層 `Border`＋半透明遮罩；**不要用 `Canvas` 定位** |
| 自由畫布（流程圖、機台配置圖） | 只有這種才用 `Canvas`／`Canvas`＋`Thickness` |

- 外距用 `Margin`、內距用 `Padding`，值取 `--space-*` 對應的 `Thickness` 資源。
- 讓內容隨視窗延展：`HorizontalAlignment="Stretch"`、`Grid` 星號欄位；固定寬高只給真的固定的東西（左側欄、按鈕）。
- 8px 網格＝資源值，不是硬寫 `Margin="16"`；全部走 `{StaticResource Space4}`。

## 3. 設計變數 → ResourceDictionary

```
Styles/
├─ Colors.xaml      # Color：PrimaryColor、BgColor…
├─ Brushes.xaml     # SolidColorBrush：PrimaryBrush、BgBrush…
├─ Typography.xaml  # sys:Double FontSizeMd…、FontFamily、FontWeight
├─ Spacing.xaml     # Thickness：Space2、Space4…
├─ Radii.xaml       # CornerRadius：RadiusMd…
└─ Motion.xaml      # Duration：DurationNormal…
```

```xml
<!-- App.xaml -->
<Application.Resources>
  <ResourceDictionary>
    <ResourceDictionary.MergedDictionaries>
      <ResourceDictionary Source="Styles/Colors.xaml"/>
      <ResourceDictionary Source="Styles/Brushes.xaml"/>
      <ResourceDictionary Source="Styles/Typography.xaml"/>
      <ResourceDictionary Source="Styles/Spacing.xaml"/>
      <ResourceDictionary Source="Styles/Radii.xaml"/>
      <ResourceDictionary Source="Styles/Motion.xaml"/>
    </ResourceDictionary.MergedDictionaries>
  </ResourceDictionary>
</Application.Resources>
```

```xml
<!-- Spacing.xaml -->
<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:sys="clr-namespace:System;assembly=System.Runtime">
  <Thickness x:Key="Space4">16</Thickness>
  <sys:Double x:Key="FontSizeMd">16</sys:Double>
  <CornerRadius x:Key="RadiusMd">8</CornerRadius>
  <Duration x:Key="DurationNormal">0:0:0.2</Duration>
</ResourceDictionary>
```

- .NET 8 的 `sys:Double` 用 `assembly=System.Runtime`；.NET Framework 4.8 用 `assembly=mscorlib`。
- 主題切換用 `DynamicResource`（`Background="{DynamicResource BgBrush}"`）；固定樣式用 `StaticResource` 較快。
- 不要把 hex 寫進 view；顏色只出現在 `Colors.xaml`。

## 4. 元件與重用

| SVG | WPF |
|---|---|
| `<g id="header">` | `x:Name="Header"` 的區塊，或抽成 `UserControl` |
| `<use href="#icon-search">` | `Path Data="…"` 的 `Style`（`IconStyle`）；或 `DrawingImage` 資源 |
| 重複出現的卡片 | `DataTemplate` + `ItemsControl`／`ListBox` |
| 清單列 | `ListBox`／`ItemsControl` + `ItemTemplate`，**不要手動貼 N 份 XAML** |
| 可切換內容（狀態區） | `ContentControl` + `DataTemplateSelector` |

- 元件命名＝`g id` 轉 PascalCase：`btn-confirm-alarm` → `ConfirmAlarmButton`。
- 按鈕樣式分 `Primary`／`Secondary`／`Danger` 三種 keyed style，不要每個按鈕各自調屬性。

## 5. 狀態

- 用 enum 當狀態來源：`Loading / Ready / Empty / Error / Alarm / Offline / NoPermission / Disabled`；ViewModel 曝露 `State` 屬性，不要用多個 bool。
- 用 `DataTrigger`（或 `VisualStateManager` 的 state group）切換顯示；版面用同一個容器，狀態只換內容與可見性。
- 載入中：骨架（`Rectangle` 灰塊）撐住原本尺寸，避免版面跳動。
- 空／錯誤／離線／無權限：同一個 `ContentControl` 切 `DataTemplate`，不要各做一份頁面。
- 停用：`IsEnabled="False"` 搭配停用樣式（`--color-disabled-*`）。

## 6. 資料與假資料

- 資料列用 `ObservableCollection<T>` + `DataTemplate`；排序／篩選放 ViewModel。
- 設計畫面時用 `d:DataContext="{d:DesignInstance Type=vm:DeviceMonitorViewModel, IsDesignTimeCreatable=True}"`，讓設計工具顯示假資料。
- 執行期切狀態：加 dev 選單（`Ctrl+Shift+D`）或啟動參數 `--state=error`；每個狀態都要能重現給使用者看。
- 假資料與 Phase 5 截圖共用同一份 fixture，避免「設計看 A、驗收看 B」。

## 7. 圖示與字型

- 取 SVG 的 `<path d="…">` 放進 `Path.Data`；用 `Viewbox` 或固定 `Width/Height` + `Stretch="Uniform"` 縮放。
- 不要裝 icon font 來重畫 SVG 圖示；字形與線寬會跑掉。
- 中文字型用 token 的 `Microsoft JhengHei UI`，數值用 `Cascadia Mono`／`Consolas`；`TextBlock` 顯式設 `FontFamily` 或走樣式。
- WPF 文字渲染與瀏覽器不同：行高、字距差異屬容許範圍，但字級與行距要照 token。

## 8. 截圖與比對

- 用 `RenderTargetBitmap` 依設計尺寸渲染每個狀態（不受螢幕縮放影響），輸出 PNG；開一個 `--screenshot <state> <out.png>` 的 dev 入口。
- 或在 100% 縮放的螢幕上跑起來，用 `PrintWindow`／螢幕擷取；缺點是受視窗位置與 DPI 影響。
- 截圖關閉動畫、固定假資料、固定視窗尺寸（`Width=1920, Height=1080`，`WindowStyle=None` 可去邊框）。
- 與核准 PNG 並排輸出 `design/<screen>/compare/<state>_compare.png`；差異用腳本算（像素差百分比＋熱區圖）。

## 9. 常見坑

- `Grid` 的 `Margin` 不會 collapse：卡片間距用 `Margin` 或 `Grid.RowSpacing`，別同時給兩邊。
- `Border` 1px 線在偶數座標才不會模糊；`SnapsToDevicePixels` 只影響部分渲染。
- `DataGrid` 的內建 padding／列高與設計不同：用 `RowHeight`、`ColumnHeaderHeight`、樣式覆寫。
- 捲軸會佔寬度（約 17px），設計時要預留或在 `ScrollViewer` 設 `VerticalScrollBarVisibility` 搭配 overlay 樣式。
- `DropShadowEffect` 成本高、且與深色主題不搭：優先用邊框與亮度層次。
- 視窗最大化時若內容固定寬，會出現大片空白：用 `*` 欄位與 `MaxWidth` 控制。
- 觸控尺寸 44–48 DIP 是底線；`MinHeight`／`MinWidth` 直接寫進按鈕樣式。
