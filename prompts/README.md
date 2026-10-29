# Prompts

Reusable instruction blocks that are not skills. Each file is a prompt you paste into an agent (or
ask it to follow) to write the same rules into a harness's global instructions.

| File | What it writes |
| --- | --- |
| `architecturePromt.md` | Installs the architecture-and-OOP block into `~/.claude/CLAUDE.md`, `~/.dsh/AGENTS.md` and `~/.config/opencode/AGENTS.md` between `ARCHITECTURE_START` / `ARCHITECTURE_END`; the block's source copy is `~/shared/oop-architecture.md`. |
| `ppromp.md` | The CodeGraph order, the Jev-first rule and the Recap format for the same global rules files. |

The global rules these write are live; keep this directory next to the skills so one repo holds both.
