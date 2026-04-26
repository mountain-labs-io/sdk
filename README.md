# @mountain-labs/sdk

TypeScript SDK for Mountain Labs CMS. Works in Node.js, edge runtimes, and browsers.

## Installation

```bash
npm install @mountain-labs/sdk
```

## Usage

```ts
import { createClient, bearerAuth } from '@mountain-labs/sdk';

const client = createClient({
  project: 'acme',           // or a project URL: 'https://acme.mountain-labs.io'
  auth: bearerAuth('token'),
});

const page = await client.pages.get('home');
const section = await client.sections.get('home', 'hero');
```

## Authentication

### Bearer token

```ts
import { bearerAuth } from '@mountain-labs/sdk';

createClient({ project: 'acme', auth: bearerAuth('your-token') });
```

### Client credentials (server-to-server)

Exchanges a client ID and secret for a Bearer token using the OAuth 2.0 client credentials grant.
Tokens are cached and refreshed automatically.

```ts
import { clientCredentials } from '@mountain-labs/sdk';

createClient({
  project: 'acme',
  auth: clientCredentials({ clientId: 'id', clientSecret: 'secret' }),
});
```

### Public (unauthenticated)

Omit `auth` entirely for public API access:

```ts
createClient({ project: 'acme' });
```

### Custom auth

`auth` is an async function — bring your own token acquisition logic:

```ts
createClient({
  project: 'acme',
  auth: async (headers) => ({
    ...headers,
    Authorization: `Bearer ${await myTokenProvider.getToken()}`,
  }),
});
```

## Raw GraphQL

```ts
const data = await client.query<{ page: { title: string } }>(`
  query GetPage($slug: String!) {
    page(slug: $slug) { title }
  }
`, { slug: 'home' });
```
