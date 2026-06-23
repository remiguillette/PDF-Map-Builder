# PDF Map Builder

PDF Map Builder is a pnpm workspace for a PDF canvas viewer and its supporting API, database, and generated client libraries. The main web app loads registered PDF files, renders their pages on an interactive map-style canvas, and provides zoom/pan navigation for reviewing large drawing sets or documents.

## Repository status

- **Primary app:** `@workspace/pdf-map` in `artifacts/pdf-map`
- **API service:** `@workspace/api-server` in `artifacts/api-server`
- **Package manager:** pnpm workspaces only; npm and yarn lockfiles are removed during `preinstall`
- **Runtime:** Node.js 24 with TypeScript 5.9
- **Database:** PostgreSQL configured through Drizzle ORM

## Stack

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, shadcn/Radix UI primitives, `pdfjs-dist`, `react-zoom-pan-pinch`
- **API:** Express 5, Pino logging, CORS, cookie parsing support
- **Database:** PostgreSQL, Drizzle ORM, Drizzle Kit, `drizzle-zod`
- **API contract:** OpenAPI 3.1 in `lib/api-spec/openapi.yaml`
- **Generated clients:** Orval-generated React Query client and Zod schemas
- **Build tooling:** TypeScript project references, esbuild for the API server bundle

## Prerequisites

1. Install **Node.js 24**.
2. Install **pnpm**.
3. Provision a PostgreSQL database if you plan to run database commands or API functionality that needs persistence.
4. Install workspace dependencies:

   ```bash
   pnpm install
   ```

## Configuration

### Required environment variables

| Variable       | Required for                                  | Description                                                                          |
| -------------- | --------------------------------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL` | Drizzle commands and database-backed API work | PostgreSQL connection string used by `lib/db/drizzle.config.ts`.                     |
| `NODE_ENV`     | API runtime                                   | Set automatically to `development` by `pnpm --filter @workspace/api-server run dev`. |

Example local database configuration:

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/pdf_map_builder"
```

### PDF registry configuration

The PDF Map app preloads files listed in `artifacts/pdf-map/src/pdf-registry.ts`. Add PDF assets under `artifacts/pdf-map/public/pdfs/` and register them with an `id`, display `name`, and public `path`:

```ts
{
  id: "example-document",
  name: "Example Document",
  path: "/pdfs/example-document.pdf",
}
```

Vite serves files from `artifacts/pdf-map/public` at the web root, so `/pdfs/example-document.pdf` maps to `artifacts/pdf-map/public/pdfs/example-document.pdf`.

## Common commands

Run commands from the repository root unless noted otherwise.

| Command                                         | Purpose                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm run dev`                                  | Start the Debian/Replit development script in `scripts/dev-debian.sh`.    |
| `pnpm --filter @workspace/pdf-map run dev`      | Start the PDF Map Vite app on `0.0.0.0`.                                  |
| `pnpm --filter @workspace/pdf-map run build`    | Build the PDF Map frontend.                                               |
| `pnpm --filter @workspace/pdf-map run serve`    | Preview the built PDF Map app.                                            |
| `pnpm --filter @workspace/api-server run dev`   | Build and start the API server with `NODE_ENV=development`.               |
| `pnpm --filter @workspace/api-server run build` | Bundle the API server to `artifacts/api-server/dist`.                     |
| `pnpm --filter @workspace/api-server run start` | Run the bundled API server.                                               |
| `pnpm run typecheck`                            | Typecheck libraries, artifacts, and scripts.                              |
| `pnpm run build`                                | Run the full typecheck and all package build scripts.                     |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate OpenAPI-derived clients and schemas, then typecheck libraries. |
| `pnpm --filter @workspace/db run push`          | Push Drizzle schema changes to the configured database.                   |
| `pnpm --filter @workspace/db run push-force`    | Force-push Drizzle schema changes; use cautiously.                        |

## Getting started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure the database connection if needed:

   ```bash
   export DATABASE_URL="postgres://postgres:postgres@localhost:5432/pdf_map_builder"
   ```

3. Start the frontend:

   ```bash
   pnpm --filter @workspace/pdf-map run dev
   ```

4. In another terminal, start the API server when backend endpoints are needed:

   ```bash
   pnpm --filter @workspace/api-server run dev
   ```

5. Validate the workspace before committing changes:

   ```bash
   pnpm run typecheck
   pnpm run build
   ```

## Directory structure

```text
.
├── artifacts/
│   ├── api-server/        # Express API service and esbuild bundle config
│   ├── mockup-sandbox/    # Vite sandbox for mockups and UI experimentation
│   └── pdf-map/           # Main PDF Map React/Vite application
├── attached_assets/       # Source assets supplied with the project
├── lib/
│   ├── api-client-react/  # Generated React Query API client exports
│   ├── api-spec/          # OpenAPI source and Orval codegen config
│   ├── api-zod/           # Generated Zod schemas and response validators
│   └── db/                # Drizzle schema, exports, and database config
├── scripts/               # Workspace utility scripts
├── package.json           # Root workspace scripts and dev dependencies
├── pnpm-workspace.yaml    # Workspace packages, catalogs, overrides, pnpm policy
└── tsconfig*.json         # TypeScript project configuration
```

## Source-of-truth files

- **Frontend route shell:** `artifacts/pdf-map/src/App.tsx`
- **Home page and PDF loading flow:** `artifacts/pdf-map/src/pages/home.tsx`
- **PDF preload list:** `artifacts/pdf-map/src/pdf-registry.ts`
- **PDF canvas components:** `artifacts/pdf-map/src/components/`
- **API server setup:** `artifacts/api-server/src/app.ts`
- **API routes:** `artifacts/api-server/src/routes/`
- **OpenAPI contract:** `lib/api-spec/openapi.yaml`
- **Database schema:** `lib/db/src/schema/index.ts`
- **Drizzle configuration:** `lib/db/drizzle.config.ts`
- **Generated API client:** `lib/api-client-react/src/generated/`
- **Generated Zod schemas:** `lib/api-zod/src/generated/`

## Development workflow

### Updating API endpoints

1. Update `lib/api-spec/openapi.yaml` with the request and response contract.
2. Regenerate generated packages:

   ```bash
   pnpm --filter @workspace/api-spec run codegen
   ```

3. Implement or update Express routes in `artifacts/api-server/src/routes/`.
4. Use generated Zod validators from `@workspace/api-zod` to validate API responses.
5. Consume generated hooks and API helpers from `@workspace/api-client-react` in frontend code.
6. Run `pnpm run typecheck`.

### Updating database schema

1. Edit `lib/db/src/schema/index.ts`.
2. Ensure `DATABASE_URL` points to the intended development database.
3. Push schema changes:

   ```bash
   pnpm --filter @workspace/db run push
   ```

4. Run `pnpm run typecheck`.

### Updating preloaded PDFs

1. Place PDFs in `artifacts/pdf-map/public/pdfs/`.
2. Add entries to `artifacts/pdf-map/src/pdf-registry.ts`.
3. Start the frontend and confirm each file loads on the map canvas.

## Architecture notes

- The API contract is OpenAPI-first. Generated clients and schemas should be regenerated after contract changes rather than edited manually.
- The API server mounts all routes under `/api`; the health check is available at `/api/healthz`.
- The PDF Map app currently uses a local public-file registry for preloaded documents instead of fetching document metadata from the API.
- The workspace uses pnpm catalogs and overrides in `pnpm-workspace.yaml` to centralize shared dependency versions and reduce unnecessary platform packages.
- `minimumReleaseAge: 1440` is enabled in pnpm configuration as a supply-chain safety delay; do not disable it.

## Generated files

Generated code lives in:

- `lib/api-client-react/src/generated/`
- `lib/api-zod/src/generated/`

Regenerate these files with:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Avoid hand-editing generated files unless you are applying a temporary diagnostic change that will be replaced by codegen.

## Testing and validation

The main validation commands are:

```bash
pnpm run typecheck
pnpm run build
```

Package-specific checks are also available:

```bash
pnpm --filter @workspace/pdf-map run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/scripts run typecheck
```

## Gotchas

- Use pnpm, not npm or yarn. The root `preinstall` script rejects non-pnpm installs and removes `package-lock.json` and `yarn.lock`.
- `pnpm --filter @workspace/db run push` requires `DATABASE_URL`; the Drizzle config throws if the variable is missing.
- API generated imports depend on the OpenAPI title remaining `Api`; do not rename it unless you also update generated import paths.
- PDF paths in the registry must be public web paths, not filesystem paths.
- The API server `dev` command builds before starting, so stale build issues should be solved by rerunning the command.
