# Repository instructions for Codex

## Purpose
Build a lightweight, local-first Markdown workspace. The product owner wants to work iteratively and review each architectural decision.

## Current gate: TEAM APPROVED; READ-ONLY QA DELEGATION TEST; PHASE 2 BLOCKED
- Phase 0 and the Phase 1 throwaway storage spike were explicitly approved.
- Current authorization: project agent configuration and documentation only; no application changes.
- Team configuration and activation are approved. Only one subagent named `qa` is authorized for the first read-only documentation check. No tests, edits or further agents by QA.
- `.codex/config.toml` enables subagents with a maximum of two concurrent specialists. No other agent work is currently authorized. This is not a Phase 2 approval.
- Do not implement application code, install packages, or introduce a framework until explicitly approved.
- Do not access or alter real personal vaults, OneDrive folders, or files outside this repository.
- Use `test-vault/` for hypothetical sample content only.
- Do not change git remotes, push code, or publish artifacts without approval.
- Never automatically execute untrusted commands copied from notes.

## Requirements and documentation
- Read `docs/REQUIREMENTS.md` for product requirements before architecture work.
- Update `docs/PROJECT_STATUS.md` at the end of a meaningful work package, including next action and open decisions.
- Record proposed architectural choices and trade-offs in `docs/ARCHITECTURE.md`; record approved decisions in `docs/DECISIONS.md`.
- Keep explanations short, in German, and comprehensible to a technically interested product owner.
- Each proposal must have explicit acceptance criteria and boundaries.

## Delegation
- Lead agent coordinates. Specialist briefs are in `agents/`.
- Delegate only independent bounded work; never have several agents edit the same document concurrently.
- Do not treat descriptions in `agents/` as automatically registered executable subagents: they are role briefs until runtime configuration is reviewed.
- Project role definitions now live in `.codex/agents/*.toml`; role briefs remain under `agents/`.
- Only the Tech Lead delegates bounded work with named files, acceptance criteria and boundaries.
- Specialists must not start further agents. Default to one specialist; at most two concurrently after approval.
- Keep reports short in German. Only read task-relevant context. No concurrent edits to the same document.

## Historical initial assignment (completed)
Read the docs and propose an architecture and first technical spike. No production code, no dependencies, no implementation.
