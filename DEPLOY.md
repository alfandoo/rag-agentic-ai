# VPS Deployment (idcloudhost)

Target: one Ubuntu VPS, app and self-hosted Langfuse, HTTPS via Caddy.

## 1. VPS and DNS

- Ubuntu 22.04/24.04, 2 vCPU, 4 GB RAM, 40 GB disk.
- Add an A record: `app.example.com` -> VPS public IP.
- Open ports 22, 80, 443 in the idcloudhost firewall/security group.

## 2. Install Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# log out and back in, then:
docker compose version
```

## 3. Get the code and config

```bash
git clone <your-repo-url> ~/stratagent
cd ~/stratagent
cp .env.prod.example .env.prod
nano .env.prod
```

Fill at least `APP_DOMAIN`, `ACME_EMAIL`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `TAVILY_API_KEY`, and `ALLOWED_ORIGINS=https://<APP_DOMAIN>`.

## 4. Start

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

Caddy obtains the TLS certificate automatically. Check:

```bash
curl -I https://app.example.com
curl https://app.example.com/health
```

Open `https://app.example.com`. The backend has no public port; `/api/*` is proxied by Caddy on the same origin.

## 5. Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 6. Updates

```bash
cd ~/stratagent
git pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## 7. Langfuse

Start the self-hosted stack first:

```bash
docker compose -f docker-compose.langfuse.yml --env-file .env.prod up -d
```

Set `LANGFUSE_HOST=http://langfuse-web:3000` in `.env.prod`, then start the app with the network overlay:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml -f deploy/docker-compose.langfuse-link.yml up -d --build
```

Langfuse UI is not published. Reach it through an SSH tunnel:

```bash
ssh -L 3001:127.0.0.1:3001 <user>@<vps-ip>
# then open http://localhost:3001
```

Langfuse adds ClickHouse, Postgres, Redis, MinIO. Use at least 4 GB RAM; 2 GB is not enough for both stacks.

## 8. Backup

```bash
docker run --rm -v stratagent_chroma_data:/data -v "$PWD":/backup alpine \
  tar czf /backup/chroma-$(date +%F).tgz -C /data .
```

If Langfuse is used, back up `langfuse_langfuse_postgres_data`, `langfuse_langfuse_clickhouse_data`, and `langfuse_langfuse_minio_data` the same way.

## Notes

- Rate limits are in-memory per process: restarting the backend resets them, and multiple workers do not share counts.
- `NEXT_PUBLIC_API_URL` is baked at build time. Changing the domain requires rebuilding the frontend.
- The app is public without login. Keep `RESEARCH_RATE_LIMIT_PER_DAY` low and watch provider budgets.
