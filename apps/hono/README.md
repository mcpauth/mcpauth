# Hono example for Cloudflare Workers

Before you can start publishing your service to cloudflare worker, you must sign up for a Cloudflare Workers account first, you can check out this [document](https://developers.cloudflare.com/workers/get-started/guide)

You can update the information (`name`, `zoon_id`, etc) in wrangler file, then you can test and deploy your service by simply doing,

```txt
npm install
npm run dev # Start a local server for developing your worker
npm run deploy # Publish your worker to the orange cloud
```


## DATABASE


```bash
npx wrangler hyperdrive create my-db \
  --connection-string="postgres://user:pass@host:5432/dbname"
```

```
[[hyperdrive]]
binding = "DB"
id      = "<hyperdrive-id>"
```

Then copy .env.example to .env and fill in `WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_DB` with your connection string to run locally.

