---
name: wpf-design-system
description: Conventions for standardizing WPF/XAML styling into a design system — token naming (colors, brushes, type ramp, spacing, corner radius), implicit vs keyed styles, ResourceDictionary layout and merge order, and consolidating duplicated inline styles. Use when creating or reviewing XAML styles/resource dictionaries, adding colors or font sizes to WPF views, or migrating hard-coded XAML values into shared tokens. Maps web conventions (CSS variables, Tailwind text-sm/gray-500, classes) onto WPF equivalents.
---

# WPF design system conventions

WPF ships no token vocabulary (no `text-sm`, no `gray-500`). The de facto convention is
Microsoft's Fluent/WinUI naming grammar, which WPF-UI and other libraries copy. On .NET
Framework or .NET < 9 the Fluent theme itself (`PresentationFramework.Fluent`) is unavailable —
borrow the **names**, define the values yourself.

## Web → WPF mapping

| Web | WPF |
|---|---|
| CSS custom property / design token | Keyed resource in a `ResourceDictionary`: `Color`, `SolidColorBrush`, `sys:Double`, `Thickness`, `CornerRadius` |
| Type selector `button {}` | **Implicit style** — `Style` with `TargetType`, no `x:Key`; applies to every element of that exact type in scope |
| `.class` | **Keyed style** — `Style="{StaticResource PrimaryButtonStyle}"` |
| Class extension | `BasedOn` — **single parent only** |
| `class="a b c"` | **Not possible.** `FrameworkElement.Style` holds one style |
| Cascade | Last dictionary in `MergedDictionaries` wins; the owning dictionary's own keys beat all merged ones (Static and Dynamic alike) |
| Global stylesheet | `Application.Resources` in `App.xaml`; without one, merge per Window/UserControl via `pack://` URI |

Consequence of no class composition: give each control **one base style plus a few variants
built on it** (Primary / Secondary / Danger). Do not try to build utility classes; spacing comes
from tokens and layout panels.

```xml
<Style x:Key="ButtonBaseStyle" TargetType="Button">…</Style>
<Style TargetType="Button" BasedOn="{StaticResource ButtonBaseStyle}"/>            <!-- implicit default -->
<Style x:Key="PrimaryButtonStyle" TargetType="Button" BasedOn="{StaticResource ButtonBaseStyle}">…</Style>
<Style x:Key="BodyStrongTextBlockStyle" TargetType="TextBlock"
       BasedOn="{StaticResource {x:Type TextBlock}}">…</Style>                     <!-- extend the implicit style -->
```

## Token naming

### Colors: two layers, purpose-named

1. **Primitive palette** (optional, private to the token files): hue + step, e.g. `Gray100…Gray900`,
   `Blue500`. Views never reference these.
2. **Semantic Color + Brush twin**: Fluent grammar `<Role><Fill|Stroke>Color<Tier>`, brush key =
   color key + `Brush`. Controls bind to the **Brush**.

```xml
<Color x:Key="TextFillColorPrimary">#FF1F2937</Color>
<SolidColorBrush x:Key="TextFillColorPrimaryBrush" Color="{StaticResource TextFillColorPrimary}"/>
```

Common Fluent names to reuse rather than invent:

- Text: `TextFillColorPrimary`, `…Secondary`, `…Tertiary`, `…Disabled`, `…Inverse`
- Surfaces: `CardBackgroundFillColorDefault`, `SolidBackgroundFillColorBase`, `LayerFillColorDefault`
- Controls: `ControlFillColorDefault`, `…Secondary`, `…Disabled`; `ControlStrokeColorDefault`
- Borders: `CardStrokeColorDefault`, `DividerStrokeColorDefault`
- Status: `SystemFillColorCritical`, `…Caution`, `…Success`, `…Attention`
- Accent ramp: `AccentColor` plus `AccentColorLight1–3` / `AccentColorDark1–3` (the Tailwind 100–900 analogue)

Rule: a name says **what it is for**, never what hue it is (`TextFillColorSecondaryBrush`, not `GrayBrush`).

### Type ramp: role-named TextBlock styles

`<Role>TextBlockStyle`, opt-in (keyed, not implicit). Each step sets size **and** weight. Fluent defaults:

| Key | Size | Weight |
|---|---|---|
| `CaptionTextBlockStyle` | 12 | Regular |
| `BodyTextBlockStyle` | 14 | Regular |
| `BodyStrongTextBlockStyle` | 14 | SemiBold |
| `BodyLargeTextBlockStyle` | 18 | Regular |
| `SubtitleTextBlockStyle` | 20 | SemiBold |
| `TitleTextBlockStyle` | 28 | SemiBold |
| `TitleLargeTextBlockStyle` | 40 | SemiBold |
| `DisplayTextBlockStyle` | 68 | SemiBold |

Keep the role names; fit the sizes to the sizes the app actually uses (dense desktop tools often
need 11/12/13 rather than 12/14/18). Also expose raw `sys:Double` keys (`CaptionFontSize`,
`BodyFontSize`, …) for control templates that set `FontSize` in a setter.

Alternatives seen in the wild — pick one per codebase, never mix:
- T-shirt (Telerik): `FontSizeS`, `FontSize`, `FontSizeL`, `FontSizeXL`
- Per-property (Uno): `BodyMediumFontSize`, `BodyMediumFontWeight`

### Spacing and radius

- Numeric ramp (Uno style): `Space050`=2, `Space100`=4, `Space200`=8, `Space300`=12, `Space400`=16 …
  `Margin`/`Padding` need a `Thickness`, so define typed companions: `Space200Thickness`.
  Uniform `Thickness` covers most use; add named asymmetric ones only when repeated
  (`CardPadding`, `ControlPadding`).
- Corner radius — two global keys, overridden centrally rather than set inline:
  `ControlCornerRadius` (4, in-page controls) and `OverlayCornerRadius` (8, dialogs/flyouts/popups).

### Keyed style names

`<Variant><Control>Style`: `PrimaryButtonStyle`, `DangerButtonStyle`, `CardBorderStyle`,
`CompactDataGridStyle`. This matches Fluent (`AccentButtonStyle`, `BodyTextBlockStyle`). Dotted
keys (`Button.Primary`, MahApps' `MahApps.Brushes.Accent`) are also seen; whichever is chosen,
apply it to every key. Always suffix brushes with `Brush` and styles with `Style`; no abbreviations
(`Bg`), no theme words in key names (`LightCardBrush`) — the theme is the dictionary, not the key.

## Dictionary layout and merge order

```
Styles/
  Colors.xaml        primitives + semantic Color keys
  Brushes.xaml       SolidColorBrush twins          (needs Colors)
  Typography.xaml    font families, FontSize doubles, *TextBlockStyle
  Spacing.xaml       Space*, *Thickness, *CornerRadius
  Controls/*.xaml    implicit + variant styles per control (needs all of the above)
  Theme.xaml         single entry point: merges the above in exactly this order
```

- Merge in dependency order — a `StaticResource` must already be defined above it.
- Views/windows merge **only** `Theme.xaml` (plus at most one feature-local dictionary that holds
  feature-specific styles and does **not** re-merge the shared ones).
- A dark/high-contrast theme is a parallel `Colors.Dark.xaml` with **identical keys**. If two theme
  files share no keys they are not themes, just two palettes.
- `pack://` URIs use the **assembly** name: `pack://application:,,,/My.Controls;component/Styles/Theme.xaml`.

### StaticResource vs DynamicResource

- `StaticResource` by default: resolved once, fails early, cheaper.
- `DynamicResource` only for keys that change at runtime (live theme switching, system accent).
- Theme switching needs `DynamicResource` on the brush references *and* swapping the dictionary.

### Hosting without App.xaml (WinForms `ElementHost`, plugins, add-ins)

- Per-element merging via `pack://` URI is a supported, documented pattern; it does not have to be
  done in code before the control is created.
- There is no application-wide scope, so every hosted root view must merge `Theme.xaml` itself.
  A missing merge fails at **runtime** (resource not found / silently default), not at build.
- Each `Source`-loaded dictionary is parsed per merge site. Load cost of many views re-merging the
  same dictionary is **unmeasured** in this guide — profile before adding a shared/cached
  dictionary workaround.

## Consolidating an existing codebase

1. **Audit literals** — count hex colors, named colors, `FontSize=`, `Margin=`/`Padding=` literals
   in XAML outside the token folder; rank by frequency. The top handful usually cover most uses.
2. **Define tokens from reality** — cluster near-duplicate values into the ramp (e.g. 26.667 → 28);
   choose semantic names from how each value is *used*, not its hue.
3. **Repoint existing dictionaries** at the tokens first, so their keys keep working.
4. **Add `Theme.xaml`** and switch each view's merges to it.
5. **Sweep views by most-repeated literal**, one value per commit; diff screenshots where possible.
6. **Rename legacy keys** to the convention last, or alias them temporarily
   (`<StaticResource x:Key="OldName" ResourceKey="NewName"/>`) and delete aliases once unused.
7. **Lock it in** with a test or analyzer that fails on hex colors, `FontSize` numbers and
   (optionally) repeated `Thickness` literals in XAML outside the token folder.

## Review checklist

- [ ] No hex/named colors or numeric `FontSize` outside the token dictionaries
- [ ] Brushes end in `Brush`, styles end in `Style`, names describe purpose not hue/theme
- [ ] New text uses a `*TextBlockStyle` role, not a bespoke size
- [ ] New control variant is `BasedOn` the control's base style
- [ ] View merges `Theme.xaml` only (plus a feature dictionary that does not re-merge shared ones)
- [ ] `DynamicResource` only where the value changes at runtime

## Sources

- WinUI theme resources — https://learn.microsoft.com/windows/apps/design/style/xaml-theme-resources
- WPF-UI ThemeResource keys — https://wpfui.lepo.co/api/Wpf.Ui.Markup.ThemeResource.html
- .NET 9 WPF Fluent theme / accent keys — https://learn.microsoft.com/dotnet/desktop/wpf/whats-new/net90
- Rounded corners — https://learn.microsoft.com/windows/uwp/design/style/rounded-corner
- Uno design tokens — https://platform.uno/docs/articles/external/uno.themes/doc/design-tokens.html
- Telerik FluentResourceKey — https://docs.telerik.com/devtools/wpf/api/telerik.windows.controls.fluentresourcekey
- Create and apply a style — https://learn.microsoft.com/dotnet/desktop/wpf/controls/how-to-create-apply-style
- Style.BasedOn — https://learn.microsoft.com/dotnet/api/system.windows.style.basedon
- Merged dictionaries — https://github.com/dotnet/docs-desktop/blob/main/dotnet-desktop-guide/net/wpf/systems/xaml-resources-merged-dictionaries.md
