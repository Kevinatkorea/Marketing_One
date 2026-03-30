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

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
