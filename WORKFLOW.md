# UI Design & Fluency Validation Workflow

> Shared index for the `svg-first-ui` (design and approval) and `ui-fluency-check` (validation and feedback) skills.
> Read this first for order and handoff rules, then open each skill's `SKILL.md` for detail.
> When the process changes, edit this file first, then sync the cross-references in both skills. This file is the single source of truth for process order.

## 1. Roles

| | `svg-first-ui` | `ui-fluency-check` |
|---|---|---|
| Answers | What the screen looks like, how components split, how it gets approved | Whether the flow is smooth, states are clear, feel and robustness hold up |
| Produces | SVG, PNG, `tokens.md`, `notes.md`, `UI_SPEC.md`, implementation | `plan.md`, `flow-map.md`, `log.md`, `issues.md`, `report.md`, measurements |
| Gate | Each fidelity level needs explicit approval | Each round needs a report and a per-dimension verdict |
| Design changes | The only entry: edit SVG → bump version → re-approve | Files issues only; a Design route never edits the design |
| Prototype | Drafts are the design source | Prototypes are disposable validation tools |

These are two gates, not alternatives: visual approval and fluency pass are both required before shipping.

## 2. End-to-End Flow

```
Requirements
 │  svg-first-ui Phase 1
 ▼
Wireframe ──approve──▶ Mid-fi ──approve──▶ High-fi (all states) ──approve──▶ UI_SPEC ──▶ Implement ──▶ Visual compare ──▶ Shipped acceptance
                    │                                             │                                                        │
                    │  fluency: flow round 1                      │  fluency: feel / robustness (spike)                    │
                    ▼                                             ▼                                                        ▼
              issues.md (Design route)                     metrics + issues                                      report sign-off
                    │                                             │                                                        │
                    └──────── back to svg-first-ui for vN+1 and re-approval ──────────────────────────────────────────────┘
```

## 3. Step by Step

`核准` (approve) is the exact approval token users reply with; the decision rules are in `svg-first-ui` Phase 3.

| # | Step | Skill | Artifact | Exit condition (gate) |
|---|---|---|---|---|
| 1 | Requirements | `svg-first-ui` Phase 1 | Requirement list, assumptions in `notes.md` | Every item answered or explicitly deferred |
| 2 | Wireframe | `svg-first-ui` Phase 2 | `*_wire_vN.svg/.png`, `notes.md` | User explicitly replies "核准" |
| 3 | Mid fidelity | `svg-first-ui` Phase 2 | `*_mid_vN.svg/.png` | User explicitly replies "核准" |
| 4 | Flow round 1 | `ui-fluency-check` Flow + Clarity | `fluency/plan.md`, `flow-map.md`, `log.md`, `issues.md` | Every task attempted; issues triaged |
| 5 | Design fixes | `svg-first-ui` | `*_mid_vN+1.svg/.png`, version log in `notes.md` | Re-approved; issue ids recorded in the version log |
| 6 | High fidelity + states | `svg-first-ui` Phase 2 level 3 | `*_hifi_vN.svg/.png`, one file per state, `UI_SPEC.md` | User explicitly replies "核准"; spec summary confirmed |
| 7 | State round + feel | `ui-fluency-check` Flow / Clarity / Feel / Robustness | State walkthrough, native spike measurements, issues | State identification and measurements both recorded |
| 8 | Implementation | `svg-first-ui` Phase 4 | Target-platform code, switchable states | Every state runs and can be screenshotted |
| 9 | Visual comparison | `svg-first-ui` Phase 5 | `compare/`, diff table | Diffs fixed or decided by the user |
| 10 | Shipped acceptance | `ui-fluency-check` shipped-app mode | `report.md`, metrics, sign-off | Pass or conditional pass with listed conditions |
| 11 | Release | Both skills | — | No blockers on either side; conditions have owners and dates |

### Steps That May Be Skipped

- No participants or no time: step 4 may use a heuristic review instead, but the report must say "not usability evidence". Step 10 cannot be skipped.
- Platform undecided: defer the feel/robustness part of step 7 and run the state round only; add the native spike once the platform is chosen.
- User asks to skip the draft or the approval: follow the two-step confirmation rule in `svg-first-ui` and record the skipped scope in `notes.md`.

## 4. File Layout

```
design/
├─ tokens.md                              # shared by both skills; single token source
└─ <screen>/
   ├─ <screen>_wire_v1.svg/.png
   ├─ <screen>_mid_v1.svg/.png
   ├─ <screen>_mid_v2.svg/.png            # fixes from flow validation
   ├─ <screen>_hifi_v1.svg/.png
   ├─ <screen>_hifi_v1_error.svg          # one file per state
   ├─ notes.md
   ├─ UI_SPEC.md
   ├─ fluency/                            # output of ui-fluency-check
   │  ├─ plan.md
   │  ├─ flow-map.md
   │  ├─ log.md
   │  ├─ issues.md
   │  ├─ report.md
   │  └─ evidence/
   └─ compare/                            # side-by-side visual diffs from Phase 5
```

For an existing project without `design/`, use `docs/fluency/<screen>/` with the same file names.

## 5. Handoff Contract

| Handoff | Content | Location |
|---|---|---|
| Design → validation | Approved SVG/PNG, high-fidelity state images, `UI_SPEC.md`, `design/tokens.md`, platform decision | `design/<screen>/` |
| Validation → design | `issues.md` items with route=Design, the report, evidence; record issue ids in the next SVG version log | `design/<screen>/fluency/` |
| Validation → implementation | route=Implementation items plus measurements; the design does not change | `fluency/issues.md` |
| Shared | `tokens.md`, `UI_SPEC.md`, `notes.md` | `design/` |

## 6. Which Skill to Use

| If you are… | Use |
|---|---|
| Adding or changing a screen, dialog, or panel | `svg-first-ui` |
| Leading someone through an ordered multi-step procedure on a screen | `guided-step-cards` first (its dependency table), then `svg-first-ui` |
| Checking flow, step counts, state clarity, findability | `ui-fluency-check` (flow validation) |
| Checking latency, animation, focus, touch, data refresh | `ui-fluency-check` (native spike or shipped app) |
| Comparing implementation against the approved design | `svg-first-ui` Phase 5 + `ui-fluency-check` shipped acceptance |
| Deciding whether to ship | Read both reports together |
| Changing the design | Always go back to `svg-first-ui`, bump the version, re-approve |

## 7. Anti-Patterns

- Editing the design inside `ui-fluency-check` (go back to the SVG and re-approve instead).
- Treating a fluency pass as visual approval, or the reverse.
- Using an HTML prototype to judge native feel; HTML validates flow only.
- Maintaining separate token or spec copies in the two skills.
- Reusing an old fluency report after the SVG version changed; re-test the affected tasks.
- Comparing against an old baseline after the build or environment changed.
- Averaging away a blocker.

## 8. Current Demo Status (2025-11-01)

Equipment monitor screen:

- Low-fidelity option A approved; mid-fidelity v1 approved for layout direction.
- Flow round 1 (heuristic): 1 blocker and 7 majors; report at `svg-first-ui/examples/equipment-monitor/fluency/report.md`.
- Next: `svg-first-ui` produces mid v2 fixes → re-approval → high fidelity with eight state variants → real participants → native spike once the platform is chosen.

## 9. Maintenance Rules

- When the order or handoff rules change: edit this file first, then sync "Interaction and Usability Validation" in `svg-first-ui/SKILL.md` and "Integration with svg-first-ui" in `ui-fluency-check/SKILL.md`.
- This is not a skill: there is no `SKILL.md` here, so it is never auto-loaded. It is reached through the `../WORKFLOW.md` pointers in both skills.
- Location: `~/.agents/skills/WORKFLOW.md`; both skills point at it with `../WORKFLOW.md`.
