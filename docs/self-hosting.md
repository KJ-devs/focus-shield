# Self-Hosting Guide

Focus Shield includes an optional sync server that enables multi-device synchronization, buddy features, and weekly challenges. The server is built with NestJS and PostgreSQL and is designed to be self-hosted.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (v2+)
- A machine with at least 512 MB RAM and 1 GB disk space

---

## Quick Start with Docker Compose

```bash
# Clone the repository
git clone https://github.com/KJ-devs/focus-shield.git
cd focus-shield/apps/sync-server

# Start the server and database
docker compose up -d
```

The sync server starts on port **3001** by default. PostgreSQL runs internally on port 5432.

Verify the server is running:

```bash
curl http://localhost:3001/health
```

---

## Environment Variables

The following variables can be set in a `.env` file next to `docker-compose.yml` or passed as environment variables.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP port for the API server |
| `DB_HOST` | `db` | PostgreSQL hostname (use `db` for Docker Compose) |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `focus` | Database user |
| `DB_PASSWORD` | `focus` | Database password (**change in production**) |
| `DB_NAME` | `focus_shield` | Database name |
| `CORS_ORIGINS` | `http://localhost:1420` | Comma-separated allowed origins |

### Example `.env`

```env
PORT=3001
DB_PASSWORD=my-secure-password
CORS_ORIGINS=http://localhost:1420,tauri://localhost
```

---

## PostgreSQL Configuration

The default `docker-compose.yml` uses the `postgres:16-alpine` image with a named volume (`pgdata`) for persistence.

To use an existing PostgreSQL instance instead of the Docker container:

1. Remove or comment out the `db` service in `docker-compose.yml`.
2. Set `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` to point to your instance.
3. Ensure the database exists: `CREATE DATABASE focus_shield;`

---

## Connecting the Desktop App

1. Open **Settings** in the Focus Shield desktop app.
2. Scroll to the **Sync Server** section.
3. Enter your server URL (e.g., `http://192.168.1.50:3001`).
4. Register or log in with your email and display name.
5. Sync is now active. Sessions and stats are pushed and pulled automatically.

---

## Running Behind a Reverse Proxy

For production deployments you should run the server behind a reverse proxy (NGINX, Caddy, Traefik) with TLS.

### NGINX Example

```nginx
server {
    listen 443 ssl http2;
    server_name focus.example.com;

    ssl_certificate     /etc/letsencrypt/live/focus.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/focus.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support for real-time events
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Update `CORS_ORIGINS` to include your public domain: `CORS_ORIGINS=https://focus.example.com`.

---

## Backup Strategies

### Database Dump

```bash
# Create a backup
docker compose exec db pg_dump -U focus focus_shield > backup_$(date +%F).sql

# Restore from a backup
docker compose exec -T db psql -U focus focus_shield < backup_2025-01-15.sql
```

### Volume Backup

```bash
# Stop the server
docker compose down

# Backup the volume
docker run --rm -v focus-shield_pgdata:/data -v $(pwd):/backup alpine \
  tar czf /backup/pgdata_backup.tar.gz -C /data .

# Restart
docker compose up -d
```

### Automated Backups

Use a cron job to run daily database dumps:

```cron
0 3 * * * cd /path/to/focus-shield/apps/sync-server && docker compose exec -T db pg_dump -U focus focus_shield | gzip > /backups/focus_shield_$(date +\%F).sql.gz
```

---

## Updating

```bash
cd focus-shield/apps/sync-server

# Pull the latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build
```

Database migrations run automatically on server startup.
