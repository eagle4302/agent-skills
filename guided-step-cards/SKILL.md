---
name: guided-step-cards
description: Guided step cards (vertical stepper with gated steps, one card open at a time) for screens that lead someone through an ordered procedure. Use when asked to make a procedure step-by-step (步驟化、引導式教導、教導步驟卡、wizard、stepper), or when designing teaching, calibration, commissioning, startup or fault-recovery flows whose steps depend on each other, wait for a person, or save results. Builds the step dependency table first, then hands the screen to svg-first-ui.
---

# Guided Step Cards

A procedure on one screen, as a vertical column of numbered cards. The current card is open, finished cards collapse to one line with a tick and the result, and later cards are grey and say which step unlocks them. Reply to the user in Traditional Chinese.

Use it for three or more steps that have an order, or that pause for a person or save a result midway. Settings with no order stay a form, and a single action stays a button. A page-by-page dialog with a Next button is a different pattern: here every step stays visible, so the person always sees the whole road.

## Steps

1. **Trace the request into the code.** Find every value, position and gate the procedure touches. Search recorded decisions too. Done when each thing the request names has a code location, or is marked "not found".
2. **Build the dependency table** (next section). Done when every claim about existing behaviour has a code citation, every behaviour that does not exist yet is marked "proposed" and cites the nearest existing mechanism, and the conflict list is written, even if empty.
3. **Get the table approved.** Save it under "Step dependency table" in `design/<screen>/notes.md`, show it with the conflict list, and ask for an explicit `核准`. Use the approval rules in `svg-first-ui` Phase 3. Done on approval; draw nothing before this.
4. **Draw through `svg-first-ui`.** Requirements, drafts, approval, `UI_SPEC.md`, implementation and visual comparison all follow that skill. Apply the card rules below, and draw one state file for each entry on the state list. Read `platforms/<platform>.md` here if it exists.
5. **Accept.** Done when every line of the acceptance list passes or is handed to the user with a reason.

## Dependency table

One row per step, including steps the request left out: prerequisites, the save, and any step that splits into machine and person parts.

| Column | Records |
|---|---|
| Step | Number and name |
| Actor | Person, software, or machine motion |
| Reads | Each value it needs, and where that value lives: saved, in memory, or live reading |
| Writes | Each value it produces, and which save carries it |
| After | The earlier step whose output it reads, and which value |
| Reachable | How its preconditions come true from this screen |
| Motion gate | For motion: the existing interlock that decides, with its code location |
| Recovery | Card state after cancel, discard, safety pause, and restart |
| Evidence | File and symbol for the claims above |

Below the table, write the **conflict list**:

- **Order conflicts.** Take the order the user asked for, and test it against the After column, once for the first time and once for a re-teach; the two may need different orders. A step reading a value that a later step produces is a conflict: name the value and propose the order that works.
- **False premises.** For every target, offset or reference the request names, trace it through the code that consumes it and write the formula. A value that cancels out, or that the consumer ignores, cannot serve as a target or a check.
- **Stranded preconditions.** A precondition only reachable from another page or a long run is a finding, because that is exactly what sends people hunting. Propose how to reach it from this screen.
- **First-time deadlocks.** Run the table with nothing saved yet. A step that refuses until its own output exists is a deadlock; so is a step that compares against a previous value that is absent.
- **Ambiguous identity.** When a step acts on "the first" or "the near" of anything, check what guarantees it. Start from a known position, or make the wording match what the code actually selected.
- **Silent waits.** List every wait in a running step, and whether it has a timeout. A wait with none reads as a hang on site: give it a timeout, or a sentence saying what it is waiting for.

## Card rules

**Base**
- Four states: locked, ready, running, done. Each shows words as well as colour.
- One card open at a time. Done cards can be reopened to read their result.
- Every disabled control shows its reason beside it, since touch screens have no hover. A locked card names the step that unlocks it.
- A card waiting for a person says on the card what to do next, and where.
- Software owns the state: a view model gives each card its state and sentence, and the view only draws them.

**Saving**
- Locks read saved values only. A pending, unsaved result leaves the next card locked.
- Values measured together are saved in one write. A card whose result waits on a later card says so: "done, saved with step N".
- When a later step must know which save it follows, compare a stamp stored with each save. Stamps can be tested; clocks drift.

**Motion**
- Motion starts on a person's press, and the button states its target.
- Safety decisions belong to the existing interlock. The screen asks that gate and shows its sentence, so the two can never disagree. Status readouts may show the same reading, using the same predicate.
- Pause and resume follow the procedure's existing motion rules. A trip that measures nothing can be dropped on resume, keeping earlier results.
- A new motion step gets its own cancel, pause and leave-the-page behaviour; check what the page's existing rules assume about steps that do not move.

**Error-proofing**
- A measuring step starts from a known position, whatever the current state.
- A new result far from the previous one gets a warning stating the difference, at the threshold where it would change the outcome. The warning leaves saving available, and offers a discard that redoes only the affected half.

**Recovery**
- Every row's Recovery column is implemented as written. State what is lost on restart, and show it on the card.

## State list

Draw at least: the baseline with one card running; each distinct refusal on the motion button; first-time with nothing saved; the error-proofing warning; a save failure if saves can be refused.

## Acceptance list

- Tests at the view model cover each card's state through every phase, each lock and unlock, each refusal sentence in order, and the Recovery column. Build them with `tdd`.
- A screenshot of every state on the list sits beside its approved draft. States the simulator cannot reach get an offline renderer using the real view model with fake devices, and how to rerun it is written down.
- Every word on the cards goes through the project's text and translation mechanism.
- A field procedure is listed for what only hardware can prove, with motion left to the person on site.
