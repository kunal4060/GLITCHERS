# GLITCHERS

## AI Coding & Development Guidelines (Powered by Ponytail)

This project is configured with **Ponytail** for **Google Antigravity**. All AI pair-programming sessions in this repository automatically adhere to the **Lazy Senior Developer** standard:

> *"The best code is the code never written. Write the minimum code that works."*

---

### The 7-Rung Decision Ladder

Before adding any code or dependency, stop at the first rung that holds:

1. **YAGNI**: Does this feature or abstraction need to exist at all? If speculative, skip it.
2. **Reuse**: Does a helper, util, type, or pattern already exist in this codebase? Reuse it.
3. **Standard Library**: Does the standard library already provide this? Use stdlib over packages.
4. **Native Platform**: Can browser/OS/DB features handle it natively (e.g. `<input type="date">`, CSS, constraints)?
5. **Existing Dependencies**: Does an already installed package solve it? Never install new dependencies for small tasks.
6. **One-Liner**: Can it be written cleanly in one line? Make it one line.
7. **Minimum Viable Diff**: Only then, write the minimal code that works.

---

### Core Rules for AI Agents & Developers

- **No Unrequested Abstractions**: No premature factories, single-implementation interfaces, or config files for static values.
- **Root Cause over Symptom**: Fix bugs at their shared source, not with patches at every caller.
- **Shortest Working Diff**: Smallest clean change wins. Deletion > modification > addition.
- **Never Cut Safety**: Never simplify away input validation, error handling that prevents data loss, security, or accessibility.
- **Leave a Test**: Non-trivial logic must leave ONE simple check/assert behind.

---

### Antigravity Slash Commands & Skills

You can invoke these skills directly in the Antigravity chat:

| Command | Action |
| :--- | :--- |
| `/ponytail` | Enforces the standard full lazy-senior-dev mode (default). |
| `/ponytail lite` | Suggests lazy alternatives without strictly enforcing them. |
| `/ponytail ultra` | Strict YAGNI mode (favors deletion, minimal one-liners). |
| `/ponytail-review` | Reviews recent diffs or code specifically for bloat, unnecessary packages, and over-engineering. |
| `/ponytail-audit` | Audits the codebase for dependencies that can be removed or replaced by stdlib. |
| `/ponytail-debt` | Identifies legacy tech debt and over-engineered patterns. |
| `/ponytail-gain` | Shows metrics on lines of code and bundle size saved. |
| `/ponytail-help` | Displays usage guide and quick reference card. |

---

### Configuration Files

- [`AGENTS.md`](./AGENTS.md) — Always-on instructions read automatically by Antigravity every session.
- [`.agents/rules/ponytail.md`](./.agents/rules/ponytail.md) — Workspace rule enforcing the 7-rung ladder.
- [`.agents/skills/`](./.agents/skills/) — Definitions for all 6 Ponytail skills.
- [`.agents/plugins/ponytail/`](./.agents/plugins/ponytail/) — MCP server and Antigravity plugin manifest.
