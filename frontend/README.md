# Decision Center — frontend

React + TypeScript + Vite. See the [repo root README](../README.md) for
setup and the [milestone status](../README.md#status), and
[CONTRIBUTING.md](../CONTRIBUTING.md) for conventions.

```bash
npm install
npm run dev      # Vite dev server, proxies /api to http://localhost:8000
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

- `src/api.ts` — API client (fetch-based)
- `src/types.ts` — types mirroring the backend's Pydantic schemas
- `src/components/` — `DecisionList`, `DecisionForm`, `DecisionDetail`
- `src/App.tsx` — view switching (no router; three views is enough for now)
