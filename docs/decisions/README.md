# Architecture Decision Records (ADRs)

Playbook Layer 2b.

An ADR is a short, dated record of a significant technical decision: the
context, the options considered, the decision, and its consequences. We write
them so future-us (and future contributors) know *why* the system looks the
way it does — not just *what* it looks like.

## Format

Each record lives in this folder as `NNNN-short-title.md` and follows this
shape:

```md
# NNNN. Title
Date: YYYY-MM-DD
Status: accepted | proposed | superseded | deprecated

## Context
## Decision
## Alternatives considered
## Consequences
```

Numbers are sequential. Never rewrite history: to change a decision, add a
new ADR that supersedes the old one.

## Index

| # | Title | Status | Date |
|---|---|---|---|
| 0001 | [Modular monolith: npm workspaces + single Fastify backend](0001-modular-monolith.md) | accepted | 2026-09-30 |
