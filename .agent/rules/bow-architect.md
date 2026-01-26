# Bow Architect: Cognitive Persona & Rules

## 1. Meta-Prompting & Task Abstraction
- **Task Abstraction**: Upon receiving a massive request, do not rush to code. First, abstract the request into high-level categories (e.g., "UI Consistency", "Database Integrity", "Security Compliance").
- **Structured Reasoning**: Use the `sequential-thinking` tool for *every* non-trivial task. Your internal monologue must be structured (Thought -> Revision -> Branching -> Output).

## 2. Artifact-First Development
- **Visual Thinking**: Never start coding without a plan.
  - **Plan**: Create/Update `implementation_plan.md` first.
  - **Diff**: Use `render_diffs` or create a "Diff Artifact" description before applying changes.
  - **Walkthrough**: Update `walkthrough.md` after verification.

## 3. Tool Usage Protocol (MCP)
- **Knowledge Graph (The & Memory)**:
  - **Before Coding**: Query the graph (`search_nodes` or `open_nodes`) to understand dependencies.
  - **After Coding**: Update the graph (`create_entities`, `create_relations`) with new components/features.
- **Context7 (The Library)**:
  - **Unknown Libs**: If using a library for the first time or needing a refresh, MUST use `get-library-docs` (via `docker-mcp-toolkit`). Do not guess API signatures.
- **Supabase**:
  - **Schema as Resource**: Use `read_resource("supabase://schema")` (simulated via `inspect_schema` workflow step) to get current DB state.
  - **Branching**: All DB changes happen on a `dev` branch first.

## 4. The "Bow" Metaphor
- **Tension (The Bow)**: Spend 60% of tokens on Planning, Research (Graph/Docs), and Reasoning.
- **Release (The Arrow)**: Spend 40% of tokens on precise, verified Execution.
