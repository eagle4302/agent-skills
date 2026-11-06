# WPF: guided step cards

Conversion basics are in `svg-first-ui/platforms/wpf.md`. This file holds what is specific to step cards.

## Precedents (repo `MetalAutoUQDwpf`)

Open these before designing; `locator-teach` is the finished one.

| What | Where |
|---|---|
| Locator teach: design and comparison | `design/locator-teach/` (`UI_SPEC.md`, `notes.md`, `compare/README.md`) |
| Locator teach: spec and tickets | `.scratch/locator-teach-steps/` |
| Prelock teach: a full page of cards | `design/prelock-teach/`, `.scratch/prelock-teach-steps/` |
| Card control | `MetalAutoUQDwpf/Views/Controls/TeachStepCard.xaml` |
| Card states in the view model | `MetalAutoUQD.AppModel/ViewModels/LocatorProbeViewModel.StepCards.cs` |
| State tests | `MetalAutoUQD.Tests/LocatorTeachTests.StepCards.cs` and its sibling partials |
| Offline renderer | `.scratch/locator-teach-steps/render/` (`run.sh` explains the rerun) |

In that repo the term is **教導步驟卡** (`CONTEXT.md`), and its rules on names, comments and text apply: `AGENTS.md`.

## Structure

- Reuse `TeachStepCard` when working in that repo. It sets no `DataContext`, so bindings inside its content slot keep using the page's view model.
- The view model exposes one snapshot per card: state, status sentence, one-line result. Raise its change notification from every path that changes a value it reads, including saves.
- Put prerequisites that are already done (ratios, points) in collapsed `Expander` rows above the cards, each with a one-line summary.
- Pin the save and cancel buttons below the scrolling area.
- Messages go through `MessageSlot`, which reserves its height so the layout stays still when a reason appears.

## Traps met

- MaterialDesign's default `ToggleButton` is a fixed-width switch and squeezes a card header to two characters. Use `Style="{x:Null}"` with your own template.
- A vertical scrollbar narrows the column by about 9 px, so check that the longest status sentence still fits. Let it wrap instead of trimming.
- Simulators often lack the camera or axis the procedure needs. Plan the offline renderer from the first state screenshot.
- Choose text keys with literal strings. A key picked by a ternary hides from `InterfaceTextAuditTests`.
