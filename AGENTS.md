# Repository instructions for Codex

## Purpose
Build a lightweight, local-first Markdown workspace. The product owner wants to work iteratively and review each architectural decision.

## Current gate: LIST RETURN/SUBTREE CORRECTION IMPLEMENTED — 2026-11-05
- Latest PO decision: retain current first-item/sibling-list semantics after official Org reference discussion; no further behavior change. PO authorizes a local Git commit of the tested list work package. No push or further milestone authorized.
- Developer and independent QA each passed 141/141 tests, build, three module syntax checks and diff check. QA additionally passed 57 independent cases and 12 final boundary cases; an empty-marker boundary defect was corrected and independently retested. No remaining proven blocker in tested scope. Native Edge acceptance and long-term resources remain open. Stop after report; no further milestone, commit or push authorized.
- PO authorizes only targeted correction: Return creates an appropriately indented continuation line in the same list item; Alt-Return creates a new item, Shift-Alt-Return remains checkbox insertion. After physical line movement, Shift-Alt-Left must not outdent a physically shallower following item. In the reported example test3 moves from four to two spaces while test2 stays at two. Preserve actual children, atomic Undo/Redo, guards, Heading/Tab and Storage. Developer implements, QA independently checks; stop after report. No new dependencies, milestones, commit or push.

## Previous gate: LIST TAB/FOLD/INSERT CORRECTION IMPLEMENTED — 2026-11-05
- Developer and independent QA each passed 137/137 tests, build, syntax and diff checks. QA additionally passed 51 independent cases and four folding correction repros. Actual child-list boundaries preserve own paragraphs and local code folds. No remaining blocker in tested scope; native Edge acceptance and long-term resources remain open. Stop after report; no further milestone, commit or push authorized.
- PO authorizes targeted list keyboard correction: empty item Tab/Shift-Tab changes indentation retaining logical caret; nonempty Tab folds/unfolds children, leaf Tab no text change; nonempty Shift-Tab cycles global visibility. Alt-Enter inserts list item, Shift-Alt-Enter inserts unchecked checkbox item. Only proper list context, nested valid Markdown, display-only folding, atomic Undo/Redo and no text loss. Preserve outside-list Tab, Heading/Alt keys, focus escape, AltGr/IME and Storage. Developer implements in small bounded steps, QA independent; no new dependencies/frameworks/other milestones/commit/push. Stop after report.

## Previous gate: M4b.1a END-OF-LINE CONTEXT BUGFIX IMPLEMENTED
- Developer and independent QA passed 122/122 tests, build, syntax and diff checks; QA additionally passed six boundary repros. Physical nonempty EOL resolves to current line in shared planner; empty/code/frontmatter protections retained. Native new Edge acceptance remains open. Stop after report; no subsequent milestone, commit or push authorized.
- PO authorizes focused correction: structure commands must recognize current heading/list item at every cursor column, including line start and end (after final character), not only before last character. Preserve command semantics, code/frontmatter safety, Alt guards and Heading/List compatibility. Developer fixes, QA independently tests; stop after report. No new features, dependencies, storage changes, commit or push.

## Previous gate: M4b.1a ORG LIST CONTROL IMPLEMENTED
- Developer and independent QA each passed 120/120 tests and build; diff check passed. QA additionally passed nine focused independent repros, no proven blocker. Org list semantics verified against official references; Markdown safety restrictions documented. Native new Edge tests and long-term resource evidence remain open. Stop after report; no M4b.2, commit or push authorized by this work package.
- PO authorizes only targeted Org-referenced list keyboard operations using existing Registry/structure actions. Verify official Org list documentation/Orgcard first; original semantics wins over examples. Preserve heading shortcuts, AltGr/IME/focus guards and Tab compatibility. At least five list levels, ordinary Markdown markers, multiline items, numbering and atomic Undo/Redo must be checked. Developer implements, QA independently verifies; no further agents or broad investigations.
- No Refile, shortcut UI, frameworks, tasks/journal/agenda, storage safety changes, unrelated milestones or dependencies. Discuss actual Edge-caused semantic changes with PO; do not silently invent mappings. Document tested limits/Gamebook and stop after report; M4b.2 remains blocked. Do not commit/push automatically.

## Previous gate: M4b.1 ALT KEYBOARD BUGFIX IMPLEMENTED
- Developer and independent QA each passed 110/110 tests and build, syntax and diff checks. CodeMirror handler precedence corrected; focused left-Alt down/up suppression added with AltGr/IME/browser-chord guards. Native Edge menu suppression remains unverified: state retrieval hung and was interrupted before app input. Stop after report; M4b.2 remains blocked.
- PO reports Alt Left/Right performs normal cursor movement while Up/Down and Shift-Up/Down work. Authorizes focused correction of shortcut precedence and preventing bare Alt browser menu activation while editor is focused, if browser permits. Preserve AltGr/IME/normal typing and behavior outside editor; no blanket global Alt block. Document native browser limits and alternatives if needed. Developer implements; QA independently tests; stop after report, M4b.2 remains blocked.

## Previous gate: PHASE 2 M4b.1 IMPLEMENTED
- Developer and independent QA each passed 108/108 tests and build. QA additionally checked 72 heading cases, 54 line cases and 406 stale Busy-gates. No proven blocker in tested scope. Native Edge key delivery remains unverified: Computer Use stopped before app interaction because browser URL could not be reliably determined. Documented Org-list/Markdown restrictions remain. Stop after report; M4b.2 requires new PO authorization.
- New explicit PO authorization supersedes earlier M4b exclusions ONLY for M4b.1: Org-referenced structural keyboard commands, local/global folding key conflict resolution, shared Registry/Gamebook and simple shortcut help in Palette. Developer implements; QA independently tests; Lead coordinates/integrates. Stop after report. M4b.2 remains unauthorized.
- Official Org Manual and Orgcard are binding references for explicitly Org-compatible commands. Single-heading promotion/demotion and subtree variants must be distinct and independent of legacy children checkbox. Meta Up/Down moves subtrees within valid siblings. PO clarified Shift-Meta Up/Down: move the current physical text line regardless of heading level, exactly the Org/Emacs distinction; do not silently rewrite levels.
- Preserve legacy Tab behavior through an explicit documented context/mode solution and reliable Escape focus exit. Editor-only recognized Alt commands; AltGr/IME/plain typing protected. No blanket Alt interception; browser delivery must be reported only if actually tested.
- No refile, cross-file moves, task/journal/agenda features, shortcut editor, new file formats, storage safety changes or dependencies without approval. Gamebook wishes do not authorize implementation.

## Previous gate: PHASE 2 M4a IMPLEMENTED
- Developer and independent QA each passed 95/95 tests and build; QA additionally verified 258 stale-context refusals. No proven blocker in tested scope. Actual Edge UI testing stopped before interaction because Computer Use could not determine the browser URL reliably; native browser acceptance and long-term resource measurements remain open. Stop after report; no M4b or further milestone is authorized.
- Current PO authorization supersedes earlier Palette/context-menu exclusions only for M4a: inventory existing functions, modular shared Command Registry, Alt+X searchable Command Palette, contextual editor menu, simplified toolbar, editable docs/COMMAND_GAMEBOOK.md and independent QA. Developer implements; Lead coordinates/integrates. Stop after report.
- Preserve Markdown data and Storage safety models. No new dependencies/frameworks, unsafe dynamic commands, personal/production vaults, task/journal/agenda features or M4b implementation. Shortcut configuration, sequences and contextual shortcut help are architectural preparation only.
- Gamebook is a manually editable planning reference, never executable configuration. Consult it in later command work; new entries are not implementation authorization. Registry/documentation consistency must be checked.
- Earlier milestone authorizations below are historical and remain applicable only where compatible with M4a.

## Previous gate: PHASE 2 M3.2b IMPLEMENTED
- Developer implemented and tested; QA independently verified final 89/89 tests, build and safety cases. Work package complete within documented prototype limits. Stop after report; no subsequent feature or milestone is authorized.
- Current explicit PO authorization: selected-text formatting buttons for **bold**, *italic*, <u>underline</u>, ~~strike~~ and inline code, safe toggle/removal, Undo/Redo and codeblock protection; stronger distinct H1–H6 theme-token colors in Midnight/Terminal/Nord/Paper. Preserve existing codeblock surfaces. Developer implements/tests; QA independently tests. No new heading-indentation work, Storage changes, language packages, frameworks or unrelated product areas. Stop after report.
- Existing optional M3.2a.1 indentation remains unchanged; styling must never change stored heading hierarchy. No text-color function, Command Palette, Agenda or Board is authorized.
- Prior milestone scopes below are historical context; only M3.2b changes above are currently authorized.
- Current explicit PO authorization: contextual Tab/Shift+Tab for heading/list structure with a reliable focus escape; compatible hierarchical list display with configurable visual markers and at least five levels; optional source-preserving heading indentation; themed codeblock surfaces. Developer implements/tests, QA independently verifies. Stop after this work package.
- Raw Markdown prefixes remain compatible; Unicode bullets and dotted multi-level labels are display-only. Alternative alphanumeric labels, text colors, context menu and Command Palette remain planning only. No Storage changes, new dependencies/frameworks, themes or unrelated product areas.
- Role-reload gate was satisfied before M3.2a by fresh Developer/QA agents confirming revision `M32A-2026-11-03` in loaded instructions. Prior milestone restrictions are superseded only for the explicit M3.2a.1 scope above.
- First correct Developer/QA role definitions and briefs (revision `M32A-2026-11-03`). Confirm their actual loaded instructions in fresh project agents/session before application implementation. If runtime still supplies old restrictions, document the need for a new project session and stop; Lead must not bypass the gate.
- After confirmed role adoption: only heading H1–H6 move/level operations, list move/indent/outdent/prefix operations, Undo/Redo, folding compatibility and simple mouse controls with QWERTZ-safe keyboard access. Developer implements/tests, QA independently tests. Preserve unrelated Markdown and existing Storage safety.
- Command Palette, Journal, Agenda, Wiki-links, Board, new themes/skins are excluded. No new dependencies or installs without explanation and PO approval. No Storage modifications without separate approval.
- Tech Lead coordinates, delegates, reviews and integrates; implements only when delegation is technically impossible or a justified exception exists. This exception does not bypass the required role-reload check.
- Storage owns security-critical storage changes. Documentation only edits explicitly assigned documents. All roles respect PO phase/scope decisions, named file ownership and security boundaries.
- Direct replacement remains approved solely for synthetic data with conflict checks/backups; external write race accepted only there. No automatic backup deletion.
- No independent phase changes, installs, publishing, framework introduction or personal/production vault access.
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
- Developer may implement code and execute relevant tests/builds only in approved, delegated work packages. QA may execute approved tests and use synthetic fixtures, but must not independently patch application code. No blanket read-only or Phase-2 ban applies to these roles.
- Keep reports short in German. Only read task-relevant context. No concurrent edits to the same document.

## Historical initial assignment (completed)
Read the docs and propose an architecture and first technical spike. No production code, no dependencies, no implementation.
