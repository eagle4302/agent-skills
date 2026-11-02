---
name: ui-fluency-check
description: Use when validating UI/UX fluency — whether a flow is smooth, states are clear, interaction feedback feels right, and the interface holds under real data. Covers clickable flow prototypes, task-based think-aloud sessions, native measurement spikes, default metric thresholds, severity triage, and routing fixes back to the approved design. Use before implementation, during a native spike, after implementation, or for an interaction review. Input is the approved SVG/UI_SPEC from svg-first-ui; output is evidence and an issue list, never a second design source.
---

# UI Fluency Check

## The Four Dimensions

Fluency is not "it feels nice". It is four measurable dimensions. Each one needs different evidence, a different tool, and its own verdict.

| Dimension | Question it answers | Evidence |
|---|---|---|
| **Flow** | Can the user get from intent to result with few steps, no dead ends, no backtracking? | Task walks, step counts, click logs |
| **Clarity** | Does the interface make the current state, the next action, and the system's response obvious? | State identification, think-aloud, issue log |
| **Feel** | Does it respond the way the hand and eye expect? | Input latency, animation timing, frame time, focus order |
| **Robustness** | Does it hold up under real data, real input, and real failure? | Edge-case runs, data-rate stress, soak |

Report a verdict per dimension. Never average them into a single "UX score".

## Non-Negotiables

- **Evidence over opinion.** Every finding cites a task, a timestamp, a measurement, or a quote. "I don't like it" is not a finding.
- **Freeze the environment.** Same build, resolution, DPI, fonts, animations, and data fixture for every run. Record them.
- **Measure before judging.** Feel and Robustness are measured numbers, not impressions.
- **Thresholds before results.** Write the pass thresholds in the plan, then measure. Do not retune thresholds after seeing the numbers.
- **One design source.** Prototype screens come from approved SVG/PNG. Fixes are routed back to the design source and re-approved; the prototype never becomes the spec.
- **Prototypes are throwaway.** Mark them as prototypes, keep them out of production, and capture the verdict, not the code.
- **No verdict without coverage.** Every task in the plan is attempted by every participant or explicitly listed as uncovered.

## Modes

| Mode | Use when | Tool | What it can prove |
|---|---|---|---|
| **Flow prototype** | Flow or Clarity is in question before implementation | Approved screens in a click-through harness (`assets/flow-prototype.html`), Figma prototype, or paper | The path exists, steps, dead ends, state visibility |
| **Native spike** | Feel or Robustness must be known before committing | Timeboxed throwaway build on the real platform, fake data at the real update rate | Real latency, animation, focus, touch, frame cost |
| **Shipped-app acceptance** | The real build exists | The app itself, fixed build and environment | Everything, including production data and load |
| **Expert heuristic review** | No users available, or as a pre-filter | `references/fluency-checklist.md` | Likely problems, never usability proof |

Pick the cheapest mode that can actually answer the question. Do not use a browser prototype to judge native feel.

## Process

### Phase 0 — Frame the question

Write one sentence naming the dimension, the screen, and the decision it feeds:

> "Is the alarm-confirm flow (Flow) short enough to approve before high fidelity?"

Record the decision owner and what happens on pass, conditional pass, and fail.

**Exit:** one-sentence question, mode chosen, decision owner named.

### Phase 1 — Test plan

Fill `templates/test-plan.md`. It must contain:

- Tasks written as outcomes, not clicks ("Confirm the two unacknowledged alarms on M-07", not "Click the alert table").
- Coverage of at least: one critical happy path, one state-change task, one error/edge case, one extreme-data task, and one input-method task (keyboard or touch).
- Participants, roles, and session length.
- Frozen environment: build/commit, resolution, DPI/scaling, input devices, animations on/off, data fixture, network.
- Metrics with thresholds, copied from the defaults below or overridden with a reason.
- Evidence capture method: screenshots, screen recording, click log, trace, stopwatch log.

**Exit:** plan reviewed, fixture ready, environment frozen.

### Phase 2 — Flow prototype

Only when Flow or Clarity needs an answer.

- Use the approved screens as images. Do not rebuild the layout in CSS or another UI framework; that creates a second design source and a second set of layout bugs.
- Build the clickable layer with `assets/flow-prototype.html`: define screens, hotspots, tasks in its config, and open it in a browser. It records clicks, steps, time, and task completion, and exports the log.
- Every screen and state that a task reaches must exist as an image. A missing state is a finding, not something to improvise.
- Mark the prototype clearly as a prototype; hide the HUD option for clean screenshots if needed.
- If you use Figma or paper instead, keep the same task list and record clicks and times manually.

**Exit:** every task can be attempted end to end; the click log exists.

### Phase 3 — Walkthrough and test sessions

Run the plan.

- Moderator does not coach. Ask "what would you do next?" not "did you see the button?".
- Think aloud, but stop the talk when it blocks the task.
- Record per step: time, action, expected, observed, quote.
- After each task, ask the cognitive-walkthrough questions: did the user know what to do, did they see the control, did they understand the feedback?
- Run the heuristic pass from `references/fluency-checklist.md` on the same build.
- Note deviations from the plan (wrong fixture, extra help) instead of hiding them.

**Exit:** every task attempted by every participant; `templates/observation-log.md` complete.

### Phase 4 — Feel and Robustness

Use a native spike or the shipped app. Instrument before you build the screen; otherwise you will measure the wrong thing.

1. Open and close the flow once to warm up.
2. Measure each interaction at least 30 times. Report median and p95, never a single run.
3. Measure inside the app, on the target machine, in the target input mode.
4. Run the data stress cases: 0 items, maximum items, 1 Hz refresh, alarm burst, long text, missing values.
5. Run a 30-minute soak with the real refresh rate and watch memory and frame stability.
6. Check focus order, keyboard reachability, touch target size, and disabled states with the keyboard, not only the mouse.

Platform measurement recipes: `platforms/wpf.md`, `platforms/web.md`, `platforms/native.md` (Avalonia, Qt/QML, Slint).

**Exit:** metrics have n, environment, and a comparison against the plan's thresholds; edge cases have results.

### Phase 5 — Triage and route

Every issue gets a dimension, a severity, evidence, a route, and an owner:

| Route | Meaning |
|---|---|
| **Design** | Visual, layout, wording, or flow change. Goes back to the SVG and `UI_SPEC`, then re-approval. |
| **Implementation** | Same design, better code: latency, layout thrash, animation, focus handling. |
| **Data** | Wrong field, stale value, bad empty-state data, unrealistic fixture. |
| **Environment** | DPI, fonts, input device, network, machine — fix the test or document the constraint. |

Rules:

- Do not change the approved design in the prototype and call it fixed.
- Do not close an issue without evidence that it is gone.
- Blockers stop release. Major issues need an owner and a date. Minor and cosmetic issues may be accepted explicitly.

**Exit:** issue list triaged; verdict per dimension drafted.

### Phase 6 — Report and regression

Fill `templates/report.md`, verify fixes with the same tasks and environment, and compare rounds.

- Same scenario, same fixture, same machine; otherwise label it a different baseline.
- A fix that breaks another task reopens that task.
- Close with a recommendation: pass, conditional pass (list conditions), or fail.

**Exit:** report written, remaining issues listed, next round scheduled or not needed.

## Task Design Rules

- Start from a realistic state with realistic data. Empty demo data hides problems.
- Phrase the goal as an outcome the user would actually want.
- Record the expected path and the shortest possible path separately.
- Define success as something an observer can see, not as "user seems happy".
- Include one task that forces the awkward state: empty, error, offline, no permission, or disabled.
- Do not put the answer in the task wording; no leading labels.
- One task per goal. Do not chain unrelated goals into a single task.

## Participants and Sessions

- 2–5 participants per round. At least one domain user and one person who did not design the screen.
- One moderator, one note-taker. The moderator can only run the session, not fix things mid-task.
- 30–45 minutes per participant is enough for 5–8 tasks.
- Record consent before recording. Keep participant data out of the design repo.
- If no users are available, run the heuristic review and label the result "heuristic only — not usability evidence".

## Default Metrics and Thresholds

Override only with a written reason. All counts and timings are per round and per task.

| Dimension | Metric | Default threshold | How to measure |
|---|---|---|---|
| Flow | Critical task success | 100%, no dead ends | Task walk, per participant |
| Flow | Steps vs planned path | ≤ planned + 1 | Click log |
| Flow | Backtracking on critical tasks | 0 | Click log |
| Flow | Misclick rate | ≤ 5% of clicks | Click log |
| Clarity | State identification | 100% on critical states | Ask "what state is this?" after the task |
| Clarity | Error recovery | ≤ 2 actions back to task | Walkthrough |
| Clarity | Label/action comprehension | ≥ 80% of participants explain it correctly | Think-aloud |
| Feel | Input-to-feedback latency | ≤ 100 ms (≤ 50 ms preferred) | `platforms/` recipe |
| Feel | Animation duration vs spec | ± 20% | Frame timestamps |
| Feel | Frame time p95 | ≤ 16.7 ms (60 Hz); no frame > 50 ms | Frame timing |
| Feel | UI heartbeat jitter p95 | ≤ 20 ms idle and during 1 Hz updates | Heartbeat timer |
| Robustness | Crashes or blockers in scripted edges | 0 | Edge-case runs |
| Robustness | Extreme-data rendering | No clipping, overlap, or wrong values | Screenshot per extreme |
| Robustness | Double-submit / rapid input | No duplicate action or broken state | Rapid-input test |
| Robustness | 30-minute soak | Stable memory and frame time; project-defined budget | Soak run |
| Accessibility | Contrast | ≥ 4.5:1 body text, ≥ 3:1 large text | Token check |
| Accessibility | Keyboard reachability | 100% of actions reachable, visible focus | Tab walk |
| Accessibility | Touch targets | ≥ 44 px, 48 px preferred | Visual tree or DOM |

Rules for reporting numbers:

- Always include n, median, p95, environment, and build.
- Never report a single run as a result.
- If the project already has stricter thresholds, use the project's and note it.

## Severity and Verdict

| Severity | Definition |
|---|---|
| **Blocker** | Task cannot be completed, data is wrong or lost, the app crashes, or a safety-relevant state is unclear |
| **Major** | Task completes with confusion, a dead end, a workaround, or a feel problem the user notices |
| **Minor** | Friction that slows the user but does not change the outcome |
| **Cosmetic** | Polish only; no effect on task or comprehension |

Verdict per dimension:

- **Pass**: no blockers, all majors resolved, thresholds met within tolerance.
- **Conditional pass**: listed majors have owners and dates, and the risk was accepted explicitly.
- **Fail**: any blocker, or a threshold missed without an accepted explanation.

The overall recommendation is the worst dimension, not an average.

## Evidence and Artifacts

Store everything under the screen's design folder:

```
design/<screen>/fluency/
├─ plan.md              # from templates/test-plan.md
├─ flow-map.md          # from templates/flow-map.md
├─ log.md               # from templates/observation-log.md
├─ issues.md            # from templates/issue-list.md
├─ report.md            # from templates/report.md
├─ evidence/            # screenshots, recordings, click logs, traces
└─ round-<N>/           # keep each round's copies; never overwrite a round
```

If no design folder exists (existing app), use `docs/fluency/<screen>/`. Keep the same filenames.

## Integration with svg-first-ui

- Input comes from `svg-first-ui`: the approved high-fidelity SVG, the PNG preview, `UI_SPEC.md`, and `design/tokens.md`.
- The flow prototype displays those approved images; it does not redraw them.
- Any design change found here becomes a new SVG version and a new approval. Reference the issue id in the version note.
- Implementation fixes do not change the design source; record them in the issue list and the implementation ticket.
- Do not approve a screen on visuals alone, and do not approve it on usability alone. Both gates are required.
- The shared end-to-end order, handoff contract, and file layout live in `../WORKFLOW.md`, the index next to both skill folders.

## Report Format

```
Verdict: Pass / Conditional / Fail — one line per dimension
Evidence: <paths to plan, log, metrics, recordings>
Top issues: <id, severity, one-line>
Design changes required: <issue ids routed to SVG/UI_SPEC>
Next: <fix round date, or "ship">
```

Write the report in Traditional Chinese when the user communicates in Traditional Chinese.

## Anti-Patterns

- Testing only the happy path and declaring fluency.
- Asking "do you like it?" instead of giving a task.
- Using a browser prototype to judge native feel.
- Measuring with the debugger attached, animations on, or a different DPI than production.
- Fixing a design only in the prototype and forgetting the SVG.
- Changing thresholds after seeing the numbers.
- One participant, no script, no note-taker, no recording — then calling it a test.
- Reporting an average and hiding a blocker.
- Promoting prototype code to production.

## Stop Rules

- Flow or Clarity blockers → fix the flow before spending time on Feel.
- Feel measurements missing the threshold by more than 2× → stop polishing visuals; fix the implementation first.
- Robustness blocker in an edge case that ships → release is blocked regardless of the other verdicts.
- No users available and no time to instrument → mark the round "heuristic only" and do not claim usability coverage.

## Files in This Skill

| Path | Purpose |
|---|---|
| `templates/test-plan.md` | Task list, participants, environment, metrics, thresholds |
| `templates/flow-map.md` | Screens, states, transitions, expected steps, dead ends |
| `templates/observation-log.md` | Per-session per-step observations, quotes, timings |
| `templates/issue-list.md` | Issue triage: dimension, severity, evidence, route, owner |
| `templates/report.md` | Verdict, metrics vs thresholds, top issues, recommendation |
| `references/fluency-checklist.md` | Detailed checklists per dimension, heuristics, accessibility |
| `references/metrics.md` | Metric definitions, formulas, sampling, default thresholds |
| `assets/flow-prototype.html` | Self-contained click-through harness with click log and self-test |
| `platforms/wpf.md` | WPF measurement recipes: latency, frames, focus, dispatch jitter |
| `platforms/web.md` | Browser flow prototype, Playwright timing, long tasks |
| `platforms/native.md` | Avalonia, Qt/QML, Slint: spike instrumentation and screenshots |
| `platforms/_template.md` | Template for adding another platform's measurement recipe |
| `examples/equipment-monitor/test-plan.md` | Filled example test plan for the equipment-monitor screen |
