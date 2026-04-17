# AgentVault MCP

MCP server for storing, versioning, and managing AI agent plans on S3-compatible object storage (R2, S3, MinIO).

Agents interact through MCP tools to securely create, update, and retrieve their own execution context in a structured way.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your S3/R2 credentials

# Build
npm run build

# Run
npm start
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `save_plan` | Create a new agent plan |
| `get_plan` | Retrieve a plan (latest or specific version) |
| `list_plans` | List all plan IDs for an agent |
| `create_version` | Create a new version of an existing plan |
| `validate_plan` | Validate a plan document without saving |

## Plan Schema

Every plan follows a strict JSON schema:

```json
{
  "id": "uuid",
  "agent_id": "string",
  "version": "1",
  "status": "active | draft | deprecated | archived",
  "goals": [{ "id": "uuid", "description": "...", "priority": "high|medium|low|critical", "status": "pending|in_progress|completed|failed" }],
  "tools": [{ "name": "...", "purpose": "...", "config": {} }],
  "execution_steps": [{ "order": 1, "action": "...", "tool": "...", "input": {}, "on_failure": "retry|skip|abort|ask" }],
  "memory": { "type": "short_term|long_term|episodic|semantic", "capacity": "...", "persistence": "session|persistent|permanent" },
  "triggers": [{ "type": "event|schedule|condition|manual", "action": "execute_plan|notify|log|pause" }],
  "metadata": { "created_at": "...", "updated_at": "...", "author": "...", "tags": [] }
}
```

## Storage Layout

```
vault/{userId}/{agentId}/plans/{planId}/
  ├── latest.json
  ├── meta.json
  └── versions/
      ├── v1.json
      └── v2.json
```

## Agent Types

| Agent | Purpose | Tools Used |
|-------|---------|------------|
| PlanCreatorAgent | Generate new plans | `save_plan`, `validate_plan` |
| PlanUpdaterAgent | Modify existing plans | `get_plan`, `create_version`, `validate_plan` |
| PlanValidatorAgent | Ensure plan validity | `validate_plan`, `get_plan` |
| PlanVersioningAgent | Handle version control | `create_version`, `get_plan`, `list_plans` |
| PlanRetrievalAgent | Fetch plans for execution | `get_plan`, `list_plans` |

## Development

```bash
npm run dev          # Run with hot reload
npm test             # Run tests
npm run test:watch   # Watch mode
npm run build        # Production build
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `S3_ENDPOINT` | Yes | - | S3-compatible endpoint URL |
| `S3_REGION` | No | `auto` | Storage region |
| `S3_ACCESS_KEY_ID` | Yes | - | Access key |
| `S3_SECRET_ACCESS_KEY` | Yes | - | Secret key |
| `S3_BUCKET` | No | `agent-vault` | Bucket name |
| `LOG_LEVEL` | No | `info` | debug, info, warn, error |

## License

MIT
