# AgentVault MCP

MCP server for storing and retrieving **Markdown developer plans** on S3-compatible object storage (Cloudflare R2, AWS S3, MinIO).

AI agents save implementation plans as `.md` files, organized by project. If the agent is in a git repo, the repo name becomes the vault parent directory. Otherwise, the parent directory name is used.

## MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `set_workspace` | Set active workspace (like `USE database`) | `user_id`, `project_name` |
| `list_workspaces` | List all workspaces for a user | `user_id` |
| `save_md_plan` | Save a Markdown plan | `user_id`, `project_name`*, `filename`, `content` |
| `get_md_plan` | Retrieve a Markdown plan | `user_id`, `project_name`*, `filename` |
| `list_md_plans` | List all plans for a project | `user_id`, `project_name`* |

> \* `project_name` is optional if `set_workspace` was called — the active workspace is used instead. Explicit values override the active workspace.

**Storage path:** `vault/{userId}/{projectName}/plans/{filename}.md`

The `project_name` determines the vault parent directory:
- **In a git repo** → use the repository name (e.g. `agent-vault-mcp`)
- **Not in a repo** → use the parent directory name (e.g. `Documents`)
- **Shared workspace** → call `set_workspace` with any name, then omit `project_name` in other tools

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config and edit with your S3/R2 credentials
cp .env.example .env

# Build
npm run build

# Run (stdio mode by default)
npm start
```

## Connecting to AI Agents

### Recommended: HTTP (self-hosted)

Start the server in HTTP mode:

```bash
TRANSPORT_MODE=http API_KEY=your-secret-key npm start
```

Then add it to Claude Code:

```bash
claude mcp add agent-vault \
  --transport http \
  --url http://127.0.0.1:3000/mcp \
  --header "Authorization: Bearer your-secret-key"
```

Or add manually to `~/.claude.json`:

```json
"agent-vault": {
  "type": "http",
  "url": "http://127.0.0.1:3000/mcp",
  "headers": {
    "Authorization": "Bearer your-secret-key"
  }
}
```

HTTP endpoints:
- `POST /mcp` — MCP Streamable HTTP (requires auth)
- `GET /health` — Health check
- `GET /ready` — Readiness check

### Stdio (local)

Run the server directly as a child process — no separate server needed:

```bash
claude mcp add agent-vault \
  --transport stdio \
  --env S3_ENDPOINT=https://your-r2-endpoint.com \
  --env S3_REGION=auto \
  --env S3_ACCESS_KEY_ID=your-access-key \
  --env S3_SECRET_ACCESS_KEY=your-secret-key \
  --env S3_BUCKET=agent-vault \
  -- node /path/to/agent-vault-mcp/dist/index.js
```

> `LOG_LEVEL` is optional — defaults to `info`. Only the `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` env vars are strictly required; `S3_REGION` defaults to `auto` and `S3_BUCKET` defaults to `agent-vault`.

## Example Usage

Once connected, an AI agent can:

```
save_md_plan:
  user_id: mr-samsepiol
  project_name: agent-vault-mcp     # repo name
  filename: 2026-04-19-auth.md
  content: "# Auth Feature\n\n## Steps\n1. Add middleware\n2. Add tests"

list_md_plans:
  user_id: mr-samsepiol
  project_name: agent-vault-mcp

get_md_plan:
  user_id: mr-samsepiol
  project_name: agent-vault-mcp
  filename: 2026-04-19-auth.md
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `S3_ENDPOINT` | Yes | - | S3-compatible endpoint URL |
| `S3_REGION` | No | `auto` | Storage region |
| `S3_ACCESS_KEY_ID` | Yes | - | Access key |
| `S3_SECRET_ACCESS_KEY` | Yes | - | Secret key |
| `S3_BUCKET` | No | `agent-vault` | Bucket name |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |
| `TRANSPORT_MODE` | No | `stdio` | `stdio` or `http` |
| `HTTP_HOST` | No | `127.0.0.1` | HTTP bind address |
| `HTTP_PORT` | No | `3000` | HTTP bind port |
| `API_KEY` | When http | - | Bearer token for authentication |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origins |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW` | No | `60000` | Rate limit window (ms) |

## Development

```bash
npm run dev          # Run with hot reload
npm test             # Run tests
npm run test:watch   # Watch mode
npm run build        # Production build
```

## Security

- HTTP mode requires API key authentication (`Authorization: Bearer <key>`)
- CORS configurable via `CORS_ORIGIN`
- Rate limiting enabled by default (100 req/min)

## License

MIT
