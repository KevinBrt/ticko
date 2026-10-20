# Self-hosting Ticko

Ticko ships as one Docker image (`ghcr.io/kevinbrt/ticko`, amd64 and arm64) that needs PostgreSQL 16 or newer.

## Quick start

```sh
mkdir ticko && cd ticko
curl -fsSLO https://raw.githubusercontent.com/KevinBrt/ticko/main/docker/docker-compose.yml
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)" > .env
docker compose up -d
```

Open <http://localhost:3000>. `docker compose ps` shows both services as `healthy` once ready.

## Configuration

Settings are environment variables, set in `.env` next to `docker-compose.yml`. The full list, with defaults, is in [`.env.example`](../.env.example).

- `TICKO_*` variables are read by Ticko. An unknown `TICKO_*` variable stops the server with an explicit message, so a typo never goes unnoticed.
- Any `TICKO_*` variable can be read from a file instead: `TICKO_DATABASE_URL_FILE=/run/secrets/database_url` (Docker or Kubernetes secrets).
- `IMAGE_TAG` and `HTTP_PORT` only change `docker-compose.yml` (image version and published port).

## Behind a reverse proxy (HTTPS)

1. Set `TICKO_URL=https://ticko.example.com`. Ticko then sends HSTS and upgrades insecure requests.
2. Set `TICKO_TRUST_PROXY=true` **only** if Ticko is reachable solely through the proxy (do not publish its port to the internet).
3. Point the proxy at the container's port 3000. Health checks: `GET /health` returns 200 when Ticko and its database are up, 503 otherwise.

Example with Caddy:

```
ticko.example.com {
  reverse_proxy localhost:3000
}
```

## Using an existing PostgreSQL

Remove the `db` service from `docker-compose.yml` and set `TICKO_DATABASE_URL`, for example `postgres://ticko:password@db.example.com:5432/ticko?sslmode=require`. The user needs to own the database: Ticko creates and migrates its tables at startup.

## Backups

Two things to save: the database and the `/data` volume (attachments, generated secret key).

```sh
docker compose exec -T db pg_dump -U ticko -Fc ticko > ticko-$(date +%F).dump
docker run --rm -v ticko_ticko-data:/data -v "$PWD":/backup alpine tar czf /backup/ticko-data-$(date +%F).tgz -C /data .
```

Restore into a fresh installation with `pg_restore` and by extracting the archive into the volume, before starting Ticko.

## Upgrades

```sh
docker compose pull
docker compose up -d
```

Migrations run automatically at startup, each in a transaction; Ticko refuses to start if one fails, leaving the database untouched. Back up first, and pin `IMAGE_TAG` to a version in production instead of `latest`.

## Security of the container

The image is distroless (no shell, no package manager) and runs as an unprivileged user. The provided compose file also makes the filesystem read-only, drops every Linux capability and forbids privilege escalation. Keep these settings if you write your own deployment.
