---
name: svg-first-ui
description: Use before any UI work — designing, adding, or changing a screen, page, dialog, panel, or component. Every UI task follows SVG draft → human approval → target-platform code. Applies to WPF/XAML, WinForms, Avalonia, MAUI, HTML/CSS, React, Vue, Flutter, Qt/QML, Slint, SwiftUI, Jetpack Compose, and any other UI language the user names. Use when the platform is still undecided (keep the draft platform-neutral and record the candidates), when modifying an existing screen, when the user asks to skip the draft, and for post-implementation visual comparison.
---

# SVG-First UI

## Core Principle

Every UI task follows one path: **SVG draft → human approval → target-platform code**.

- The SVG draft is the single source of design truth; the target platform is only the final output format.
- A screen leading someone through an ordered multi-step procedure starts with `guided-step-cards`: its dependency table comes before any draft.
- If there is no approved high-fidelity draft, there is no UI code to write.
- To change a design, edit the SVG and `design/tokens.md`, then get re-approval. Do not tweak values directly in platform code.
- Reply to the user in Traditional Chinese (繁體中文) throughout.

## Where Files Go

All design artifacts live under `design/` at the project root; source directories stay untouched:

```
design/
├─ tokens.md                        # global design tokens, one file per project
└─ <screen>/                        # screen name: lowercase ASCII kebab-case, e.g. equipment-monitor
   ├─ <screen>_wire_v1.svg          # low fidelity; multiple options: wire_v1, wire_v2
   ├─ <screen>_mid_v1.svg           # mid fidelity
   ├─ <screen>_hifi_v1.svg          # high fidelity
   ├─ <screen>_hifi_v1_error.svg    # state variants: _error, _empty, _offline, _no-permission…
   ├─ <screen>_wire_v1.png          # same-name PNG preview for every SVG
   ├─ notes.md                      # per-version notes, interactions, navigation (templates/notes.md)
   ├─ UI_SPEC.md                    # written only after high-fidelity approval (templates/UI_SPEC.md)
   ├─ current_v0.png                # screenshot of the existing screen when modifying one
   └─ compare/                      # Phase 5 side-by-side images and diff report
```

- File names are ASCII kebab-case; put the Chinese screen name in the `notes.md` and `UI_SPEC.md` titles.
- Version numbers only go up. Never edit or delete an approved file; save the next version as a new file.

## Hard Rules

| Phase | Artifact | Exit condition (gate) |
|---|---|---|
| 1 Requirements | requirement list | every item answered or recorded as an assumption |
| 2 Drafts | wire / mid / hifi SVG + PNG + notes | **each level** gets an explicit "approved" |
| 3 Spec | `UI_SPEC.md` | high fidelity approved and spec written |
| 4 Implementation | target-platform UI code | every screen and state runs and can be switched |
| 5 Comparison | screenshots + diff list | diffs fixed or decided by the user |

During Phase 2, touch only files under `design/`. Create or modify zero platform UI files (`.xaml`, `.cs`, `.css`, `.tsx`, `.vue`, `.dart`, `.qml`, `.swift`, `.kt`, `.html`, …). Code is written only after the Phase 3 gate.

## Phase 1: Requirements

Ask everything at once. Do not interleave questions with drawing. Unanswered items are marked as assumptions, never guessed silently:

| Item | What to pin down |
|---|---|
| Purpose | What problem the screen solves, what the user does first, what success looks like |
| Users | Operator / engineer / admin? Read-only or interactive? Permission differences |
| Platform & device | Framework, window size or resolution, DPI scaling, touch or mouse, viewing distance |
| Data | Fields, types, units, source, refresh rate, default sort |
| Actions & controls | Every action, its control, confirmation flow, error handling |
| All states | normal, loading, empty, error, alarm, offline, no-permission, disabled; when each appears |
| Existing rules | Design system, brand colors, safety or regulatory constraints, i18n |
| Acceptance | Who approves, tolerated visual differences, which branch receives the work |

- If the platform is unknown, ask and record the candidates in `notes.md`; it never blocks the drafts. The candidate list is open-ended, never a whitelist: XAML/WPF, Avalonia, Qt/QML, Slint, web, mobile, or anything else the user names. Keep the design platform-neutral: no platform-specific window chrome, menu conventions, or control quirks. Settle the platform before high fidelity (control appearance and font metrics diverge from there) and always before Phase 4.
- Items answered with "you decide" become documented decisions in `notes.md` and are listed in the report.
- Done when every row has an answer or the user explicitly deferred it. Phase 2 does not start before that.

## Phase 2: SVG Drafts (the core of this skill)

**Entry gate: requirements first.** Do not draw any SVG until Phase 1 is answered or the user has explicitly deferred the open items. When requirements are missing, ask the remaining questions and stop; a draft drawn on guesses decides for the user.

Three fidelity levels, strictly in order, each stopping for approval:

| Level | Draw | What this level settles | File |
|---|---|---|---|
| 1 Low fidelity | Gray blocks and labels; no color or real icons | Layout regions, information hierarchy, action flow; offer 2–3 options | `<screen>_wire_v<N>.svg` |
| 2 Mid fidelity | Real text and numbers, real control appearance, type scale and spacing | Copy, fields, control types, alignment and density | `<screen>_mid_v<N>.svg` |
| 3 High fidelity | Tokens, icons, radii and borders; one file per state | Final visuals; frozen after approval | `<screen>_hifi_v<N>.svg` and `_<state>.svg` |

The rhythm is the same at every level:

1. Draw the SVG and export the PNG.
2. Fill in `notes.md`: block descriptions, element purposes, interactions, navigation.
3. Report what changed in this version plus any open questions.
4. Stop and wait for approval (see Phase 3).

Low fidelity uses grayscale only (`#FFFFFF` / `#F2F4F7` / `#DDE3EA` / `#2B3038` / `#6B7280` / `#C9D0DA`); no brand color. This level answers only "what goes where, and what does the user see first".

### SVG Authoring Rules

1. Root element `viewBox="0 0 <W> <H>"` where W×H is the target logical resolution (WPF 1920×1080, phone 393×852, web 1440×900…), plus matching `width`/`height` for preview.
2. First child is a full-canvas background `<rect id="bg">`; the draft must render standalone.
3. Layout boxes sit on the 8px grid; gaps, margins, and paddings are multiples of 8, and 4px is allowed inside components. Text baselines are integers, and 1px hairlines may use a .5 offset so they render crisply.
4. Semantic groups: region `<g id="header">`, child `<g id="btn-start">`. IDs are English kebab-case, and **the ID is the component name in Phase 4**.
5. Extract anything repeated 3+ times into `<defs>` (`<symbol id="icon-search" viewBox="0 0 24 24">` or `<g id="...">`) and instantiate with `<use href="#...">` plus explicit `width`/`height`. This marks it as a reusable component in code.
6. Colors, fonts, font sizes, radii, and spacing come only from `design/tokens.md`. Write them as attribute values; when a token repeats many times, use `<style>` classes whose names equal the token names so a global replace stays possible.
7. Use real content. One CJK character is roughly 1em wide, Latin about 0.55em. `<text>` does not wrap: split long strings into `<tspan>` or extra lines, and verify nothing overflows its container.
8. Draw extreme values: longest name, zero rows, 1000 rows, very large/small/negative numbers, missing values (`—`).
9. Interactive targets are at least 44×44; 32 high is acceptable for desktop mouse, but note the exception in `notes.md`.
10. State variants are separate files, never edits to the base: `_error.svg`, `_empty.svg`, `_offline.svg`… Copy shared blocks and keep their IDs identical.
11. No `<foreignObject>`, external images, external CSS, scripts, or webfont files; use the system font stack defined in tokens.
12. Layer order: background → layout regions → content → overlays (modal / toast / drawer); overlays live inside `<g id="overlay">`.

### PNG Previews

Export a same-name PNG for every SVG, sized to the viewBox:

```bash
# rsvg-convert
rsvg-convert -w 1920 -h 1080 -o design/<screen>/<screen>_wire_v1.png design/<screen>/<screen>_wire_v1.svg

# Inkscape CLI
inkscape design/<screen>/<screen>_wire_v1.svg --export-type=png \
  --export-filename=design/<screen>/<screen>_wire_v1.png --export-width=1920

# Headless Chrome / Edge (Windows)
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu \
  --hide-scrollbars --force-device-scale-factor=1 --window-size=1920,1080 \
  --screenshot="C:\...\design\<screen>\<screen>_wire_v1.png" "file:///C:/.../design/<screen>/<screen>_wire_v1.svg"
```

- After export, check that the PNG pixel size equals the viewBox, and actually open it: overflow text and clipping are the usual failures.
- If none of the three tools exist, ask the user which one to use. Never skip the preview and jump straight to approval.

## Phase 3: Approval Gate

Every fidelity level stops here. Do not run all three levels in one go.

Show exactly three things:

1. The PNG preview (embedded or linked).
2. What changed in this version (bullets against the previous version).
3. Open questions, if any.

Then ask the fixed question:

> Reply "核准" (approve) or "修改：<what to change>".

Decision rules:

- `核准`, `approve`, `approved`, `核准第 N 版` → passed; move to the next level or Phase 4.
- `可以`, `看起來不錯`, `先這樣`, `繼續` → not approval. Ask once more: "Please reply explicitly with '核准' or '修改：…'."
- Any concrete feedback counts as a revision: bump the version, redraw, add a row to the version log in `notes.md`.
- Picking a layout option (A or B) is a choice, not approval: record the choice in `notes.md`, then ask once for the explicit `核准` reply before drawing the next level.
- One revision round per feedback batch. If feedback is vague ("make it nicer"), ask once for the region, the direction, and any reference.

Only after high-fidelity approval, write `design/<screen>/UI_SPEC.md` from `templates/UI_SPEC.md`. It must include: approved version and date, component tree mapped to SVG `<g id>`s, design tokens, per-state display rules, interactions and navigation, data fields, and target platform. If no platform is chosen by then, record the candidates and a decision deadline instead; Phase 4 stays blocked until one is chosen. Post the summary to the user and update the spec if they ask.

## Phase 4: Implement on the Target Platform

1. Read `UI_SPEC.md` and the approved SVG first, then `platforms/<platform>.md` if one exists. The platform is a parameter, not a fixed list: when there is no matching file, start from `platforms/_template.md` and the platform's official docs — never force the design into another platform's rules.
2. Rebuild layout with the platform's native layout system: XAML `Grid`/`StackPanel`, CSS `flex`/`grid`, Flutter `Row`/`Column`, Compose `Row`/`Column`, SwiftUI `HStack`/`VStack`, QML `RowLayout`/`ColumnLayout`, Slint `HorizontalLayout`/`VerticalLayout`. Never translate SVG coordinates into absolute positioning.
3. Only icons and illustrations carry over from the SVG, as paths or converted assets; every layout is rebuilt.
4. Map tokens to the platform theme mechanism: `ResourceDictionary`, CSS custom properties, `ThemeData`, QML singleton, `MaterialTheme`, SwiftUI `Color` extensions or asset catalog.
5. Implement each `<use>` component as a reusable component; render lists and tables through the platform's data-driven mechanism (`ItemsControl`, `.map()`, `LazyColumn`, `ForEach`) instead of copying rows.
6. Make every state switchable and provide fake-data previews: dev menu, query parameter, Storybook, or a designer mode. Include extreme-value samples.
7. Done when every screen and state runs, switches, and can be screenshotted, and component names match the `<g id>`s.

## Phase 5: Visual Comparison

1. Fix the capture environment: same window size, DPI 100%, same fonts, animations off, fixed fake data. Capture every state.
2. Place each capture side by side with its approved high-fidelity PNG at the same size, write output to `design/<screen>/compare/`, and add a diff table.
3. Classify every difference: position, size, spacing, color, text, radius, missing state, font.
4. Tolerated: platform text rendering, antialiasing, system font metrics. Required: identical text, spacing within 2px, position within 4px, colors equal hex or ΔE ≤ 2.
5. Re-capture after fixes, up to three rounds. Differences that survive those rounds get a written cause and options for the user to decide; never relax the spec unilaterally.

## Interaction and Usability Validation

Fluency validation is a separate skill: `ui-fluency-check`. It consumes the approved high-fidelity SVG, its PNG, `UI_SPEC.md`, and `design/tokens.md`; it returns a plan, click log, measured metrics, and an issue list. Design changes found there become a new SVG version and re-enter the approval gate. Run it before high fidelity for flow questions, and on a native spike or the shipped app for feel and robustness. The end-to-end order, handoff contract, and file layout live in `../WORKFLOW.md`, the shared index next to both skill folders.

## Exceptions

- **User asks to skip the draft or the approval**: state the risk first (no design baseline, expensive rework, cross-platform drift), then require a second explicit confirmation ("I understand the risk, skip approval"). If given, still capture a screenshot, and record "user requested skip" plus the approved scope in `notes.md`.
- **User supplies a mockup or screenshot**: use it as the v0 reference, but still produce the SVG draft and get approval unless the user confirms a skip twice.
- **Modifying an existing screen**: capture the current state as `current_v0.png` first, then start from Phase 2. Offer 1–2 low-fidelity options, not three.
- **Platform not covered in `platforms/`**: add a file following the existing structure: conversion mapping, pitfalls, screenshot method.

## Phase Report Format

```
Done: <what this phase produced>
Files: <full paths, one per line if several>
Next: <next action, or "waiting for your approval">
Needs your decision: <question; omit if none>
```

Write the report in Traditional Chinese.

## Pre-flight Checklist

- [ ] Every Phase 1 item is answered or recorded as an assumption in `notes.md`
- [ ] Every SVG has a same-name PNG, its size equals the viewBox, and it was actually opened
- [ ] Every color, font size, radius, and spacing value exists in `design/tokens.md`
- [ ] Every `<g id>` is English kebab-case and explained in `notes.md`
- [ ] Extreme values are drawn: longest text, zero rows, largest number, missing value
- [ ] Every state has a file, or a documented plan for when it will
- [ ] Phase 2 produced no platform UI files
- [ ] The report states what was done, file paths, next step, and open decisions

## Files in This Skill

Platform files below are accelerators for platforms already worked out, not the supported set; add a new one from `platforms/_template.md` whenever the user names a platform that has no file.

| Path | Purpose |
|---|---|
| `templates/tokens.md` | Design token template: colors, type, spacing, radii, icons, motion, platform mapping |
| `templates/notes.md` | Per-version notes template: blocks, elements, interactions, navigation, extremes |
| `templates/UI_SPEC.md` | Implementation spec template, written after high-fidelity approval |
| `platforms/_template.md` | Template for adding a new platform's conversion notes |
| `platforms/wpf.md` | WPF/XAML conversion notes |
| `platforms/avalonia.md` | Avalonia conversion notes (XAML, different styling/theming from WPF) |
| `platforms/web.md` | HTML/CSS/React/Vue conversion notes |
| `platforms/qml.md` | Qt/QML conversion notes |
| `platforms/slint.md` | Slint conversion notes |
| `examples/wireframe.svg` | Low-fidelity example (order management) |
| `examples/hifi.svg` | High-fidelity example (same screen, final visuals) |
| `examples/equipment-monitor/` | Worked Phase 1–2 example (equipment monitoring screen, two layout options) |
