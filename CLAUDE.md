# Marketing_One Project

## Workflow Orchestration

### 1. Planning Mode (Default)
- Enter plan mode for all non-trivial tasks (3+ steps or architectural decisions)
- Stop immediately on problems and re-plan - never force through
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Sub-Agent Strategy
- Use sub-agents freely to keep main context window clean
- Delegate research, exploration, and parallel analysis to sub-agents
- For complex problems, throw more compute via sub-agents
- One task per sub-agent for focused execution

### 3. Self-Improvement Loop
- After receiving corrections: update `tasks/Lessons.md` with the pattern
- Write rules for yourself to prevent repeating mistakes
- Ruthlessly iterate on lessons until error rate drops
- Review lessons at session start for related projects

### 4. Verification Before Completion
- Never mark work complete without proving it works
- Compare behavior differences between main and changes when relevant
- Ask: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Elegance (Balanced)
- For non-trivial changes: pause and ask "Is there a more elegant way?"
- If a fix feels like a band-aid: "Let me implement an elegant solution with everything I know now"
- Skip this for simple, obvious fixes - avoid over-engineering
- Critically review your own work before presenting

### 6. Autonomous Bug Fixing
- On bug reports: just fix it. Don't ask for hand-holding
- Point out logs, errors, failed tests - then resolve them
- Don't require context-switching from the user
- Go fix failing CI tests without being told

## Task Management
1. Plan first: write plan in `tasks/todo.md` as checkable items
2. Validate plan: get confirmation before implementing
3. Track progress: mark completed items as you go
4. Explain changes: provide high-level summaries at each step
5. Document results: add review sections to `tasks/todo.md`
6. Record lessons: update `tasks/Lessons.md` on corrections

## Core Principles
- **Simplicity first**: Make every change as simple as possible. Minimize code impact
- **No laziness**: Find root causes. No band-aids. Hold staff engineer standards
- **Minimal impact**: Changes touch only what's needed. Avoid introducing bugs

## Agent Team
- Multi-agent parallel development enabled
- Delegate independent tasks to parallel sub-agents
- Coordinate results in main context

## Playwright MCP
- Browser automation via MCP tools available
- Use for UI verification, form testing, e2e workflows

## Ralph Loop
- Self-verification from multiple angles
- Validate work quality before completion

## SEO + GEO Optimization
- All outputs optimized for both traditional SEO and Generative Engine Optimization (GEO)
- Structure content for AI search engine comprehension
