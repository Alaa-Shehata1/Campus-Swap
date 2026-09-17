# AI skill packs

This folder contains a reusable collection of public AI skill repositories for local tooling and agent integration.

## Included sources

- `anthropic/` — Anthropic official skill examples and reusable workflows
- `mattpoc/` — Matt Pocock engineering-oriented AI coding skills
- `superpowers/` — Superpowers skill pack for agent workflows and planning
- `agent-skills/` — Addy Osmani's agent-focused engineering skills

## Why this layout

Each repo is cloned as its own directory so other AI tools can discover and load relevant skill files without depending on a specific project structure.

Typical usage:

- point an agent/plugin at this folder as a shared skill library
- scan the nested `skills/` directories for `SKILL.md`, `CLAUDE.md`, or prompt files
- copy individual skill folders into a project-local `.claude/`, `.codex/`, or `skills/` directory when needed

## Notes

These are third-party public packages and are intended for local experimentation and reuse. Review each repo's license and instructions before integrating them into production workflows.
