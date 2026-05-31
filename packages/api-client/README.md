# @dyafa/api-client

Thin, framework-agnostic wrappers around [`@supabase/supabase-js`](https://github.com/supabase/supabase-js),
typed with the generated [`@dyafa/types`](../types) `Database` shape. This is the **single**
dependency surface other apps use for typed Supabase access — they should not import
`@supabase/supabase-js` directly.

> Pure TS, no React. Safe to consume from Expo (mobile), Next.js (web), and Deno edge functions.

## Install

Workspace dependency (already wired for packages inside this monorepo):

```jsonc
// package.json
"dependencies": {
  "@dyafa/api-client": "workspace:*"
}
```

## Exports

| Symbol | Kind | Description |
|---|---|---|
| `createBrowserClient(url, anonKey)` | function | Anon-key client (RLS-guarded). Persists session. Ship to clients. |
| `createServerClient(url, serviceRoleKey)` | function | Service-role client (bypasses RLS). **Server-only.** No session persistence. |
| `RPC` | const | Typed names of the platform's Postgres RPCs (`create_booking`, `accept_booking_request`, `cancel_booking`). |
| `RpcName` | type | Union of the `RPC` values. |
| `Database` | type | Re-export of the generated DB shape from `@dyafa/types`. |
| `SupabaseClient` | type | Re-export of the supabase-js client type. |

## Usage

### Browser / mobile (anon key, RLS-guarded)

```ts
import { createBrowserClient } from '@dyafa/api-client';

const supabase = createBrowserClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);
```

### Server (service role — never ship to clients)

```ts
import { createServerClient } from '@dyafa/api-client';

// Next.js Route Handler / Server Action, or an edge function.
const admin = createServerClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only secret, never EXPO_PUBLIC_/NEXT_PUBLIC_
);
```

### Calling a typed RPC

```ts
import { createBrowserClient, RPC } from '@dyafa/api-client';

const supabase = createBrowserClient(url, anonKey);
const { data, error } = await supabase.rpc(RPC.createBooking, {
  /* args validated server-side by the SECURITY DEFINER function */
});
```

## Security notes

- The **service-role** key bypasses Row Level Security. Only use `createServerClient`
  in trusted server contexts. Never expose the key through a `EXPO_PUBLIC_*` /
  `NEXT_PUBLIC_*` variable or bundle it into a mobile/web client.
- `createServerClient` intentionally disables session persistence and token
  auto-refresh for stateless server usage.

## Scripts

```bash
pnpm build       # tsc → dist/
pnpm typecheck   # tsc --noEmit
```
