# tmcp Monorepo

This is an npm monorepo using workspaces to manage multiple packages and applications.

## Structure

```
tmcp/
├── packages/
│   └── oauth/          # OAuth package (@tmcp/oauth)
├── apps/
│   └── example/        # Example app (@tmcp/example)
└── package.json        # Root package.json with workspaces config
```

## Getting Started

### Install Dependencies
```bash
npm install
```

### Development
```bash
# Run dev for all workspaces
npm run dev

# Run dev for specific workspace
npm run dev --workspace=@tmcp/example
npm run dev --workspace=@tmcp/oauth
```

### Building
```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build --workspace=@tmcp/oauth
```

### Working with Workspaces

The `@tmcp/oauth` package is already installed as a dependency in the `@tmcp/example` app. You can import and use it directly:

```javascript
// In your example app
import { /* your exports */ } from '@tmcp/oauth';
```

### Adding New Packages

1. Create a new package in `packages/` or `apps/`
2. Add appropriate `package.json` with name starting with `@tmcp/`
3. Run `npm install` to link workspaces
4. Add as dependency in other workspaces using `"@tmcp/package-name": "*"`

## Scripts

- `npm run build` - Build all workspaces
- `npm run dev` - Run dev mode for all workspaces
- `npm run clean` - Clean all workspaces (if clean script exists)
- `npm run lint` - Lint all workspaces (if lint script exists)
- `npm run test` - Test all workspaces (if test script exists)
