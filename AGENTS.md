# Repository instructions for Codex

## Purpose
Build a lightweight, local-first Markdown workspace. The product owner wants to work iteratively and review each architectural decision.

## Current gate: PHASE 2, MILESTONE 2 THEMES APPROVED; SYNTHETIC DATA ONLY
- Current authorization: add only modular Midnight (default), Terminal, Nord and Paper themes, immediate UI/editor switching and browser-local selection. Developer implements; QA independently checks afterward. No Storage changes unless necessary, no new editor features, skins, theme import/export/editor, frameworks or unnecessary dependencies. Further milestones require approval.
- Current authorization (2026-11-03): implement only opening, raw Markdown editing with CodeMirror 6, and explicit protected saving. Developer and Storage may work in parallel; QA may subsequently review and run bounded checks independently. No further subdelegation.
- Direct replacement with conflict checks and separate backups in the test vault is approved. The external write race is accepted only for synthetic test data. No automatic backup deletion, production/personal vaults, publishing, cloud services, or unrelated features.
- CodeMirror and necessary build dependencies are approved; no large framework. Later Phase 2 milestones still require approval. The historical restrictions below are superseded only within this scope.

### Historical gate before milestone 1
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
