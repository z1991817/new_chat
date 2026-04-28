# artImg Pro VPS deployment

This project is configured for a single-instance Next.js self-hosted deployment.

## Option A: Docker

```bash
docker build -t artimg-pro .
docker run -d --name artimg-pro --restart unless-stopped -p 3000:3000 artimg-pro
curl http://127.0.0.1:3000/api/health
```

Check memory:

```bash
docker stats artimg-pro
```

## Option B: Node + PM2

```bash
npm ci
npm run build
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
curl http://127.0.0.1:3000/api/health
```

Check memory:

```bash
pm2 monit
pm2 status artimg-pro
ps -o pid,rss,vsz,pmem,pcpu,cmd -p "$(pm2 pid artimg-pro)"
```

## Recommended first test

For a new small server, start with one Node process on port `3000`. A `1C/1GB`
server can run the current app for a smoke test, but `1C/2GB` gives more headroom
for builds, image optimization, and later API work.

If memory is tight, build locally or in CI, then deploy only `.next/standalone`,
`.next/static`, `public`, and `package.json` to the server.
