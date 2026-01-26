---
description: Bow Architect methodology for implementing new features with Graph & Context7 support.
---

1. [SequentialThinking] Analyze the feature requirements. Abstract the task into architectural components.
2. [Docker-MCP] **Knowledge Graph Lookup**:
   - Query the graph for related concepts: `mcp_docker-mcp-toolkit_search_nodes(query="<keywords>")`
   - Identify affected components.
3. [Docker-MCP] **Documentation Fetch (Context7)**:
   - If new libraries are needed, fetch docs: `mcp_docker-mcp-toolkit_get-library-docs(context7CompatibleLibraryID="<lib-id>")`
   - *Self-correction*: If library ID is unknown, use `resolve-library-id` first.
4. [Supabase] Analyze DB impact. `inspect_schema` equivalent or `read_resource` if available.
5. [Artifact] Create/Update `implementation_plan.md` with the gathered context. **STOP for user review if high risk.**
// turbo
6. [GitHub] Create branch: `create_branch(branch="feature/<name>")`
7. [Code] Implement the feature following strict `bow-architect.md` rules.
8. [Docker-MCP] **Graph Update**:
   - Register new entities/relations: `mcp_docker-mcp-toolkit_create_entities(...)`
9. [Supabase] Apply migrations if needed.
10. [Verify] Run tests and/or Browser Check.
11. [GitHub] Create PR with detailed summary of the architectural impact.
