# Self-hosting Toppo

Toppo ships as one Docker image (`ghcr.io/kevinbrt/toppo`, amd64 and arm64) that needs PostgreSQL 16 or newer.

## Quick start

```sh
mkdir toppo && cd toppo
curl -fsSLO https://raw.githubusercontent.com/KevinBrt/toppo/main/docker/docker-compose.yml
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)" > .env
docker compose up -d
```

`docker compose ps` shows both services as `healthy` once ready.

## First run

1. Read the setup code in the logs:

   ```sh
   docker compose logs toppo | grep "setup code"
   ```

   The line looks like `Toppo is not set up yet: open http://localhost:3000 and enter the setup code ABCD-EFGH-JKLM`. A new code is printed at each start until setup is done.

2. Open <http://localhost:3000>, enter the code and create the first administrator account.
3. Invite your team from **Settings › Members**: each person gets a personal link, valid for 7 days, that you send them by mail or chat. They choose their name and password when they open it.
4. Adjust what each role allows in **Settings › Roles and permissions**. Administrator, Team and Requester are only a starting point: rename them, change them or create your own.

The code exists so that nobody else can claim a fresh instance reachable from the network. Once the first administrator exists, the wizard is closed for good. For automated deployments, preset the code with `TOPPO_SETUP_CODE`.

## Configuration

Settings are environment variables, set in `.env` next to `docker-compose.yml`. The full list, with defaults, is in [`.env.example`](../.env.example).

- `TOPPO_*` variables are read by Toppo. An unknown `TOPPO_*` variable stops the server with an explicit message, so a typo never goes unnoticed.
- Any `TOPPO_*` variable can be read from a file instead: `TOPPO_DATABASE_URL_FILE=/run/secrets/database_url` (Docker or Kubernetes secrets).
- `IMAGE_TAG` and `HTTP_PORT` only change `docker-compose.yml` (image version and published port).

## Behind a reverse proxy (HTTPS)

1. Set `TOPPO_URL=https://toppo.example.com`. Toppo then sends HSTS and upgrades insecure requests.
2. Set `TOPPO_TRUST_PROXY=true` **only** if Toppo is reachable solely through the proxy (do not publish its port to the internet).
3. Point the proxy at the container's port 3000. Health checks: `GET /health` returns 200 when Toppo and its database are up, 503 otherwise.

Example with Caddy:

```
toppo.example.com {
  reverse_proxy localhost:3000
}
```

## Using an existing PostgreSQL

Remove the `db` service from `docker-compose.yml` and set `TOPPO_DATABASE_URL`, for example `postgres://toppo:password@db.example.com:5432/toppo?sslmode=require`. The user needs to own the database: Toppo creates and migrates its tables at startup.

## Backups

Two things to save: the database and the `/data` volume (attachments, generated secret key). Losing the secret key signs every user out; it does not lose data.

```sh
docker compose exec -T db pg_dump -U toppo -Fc toppo > toppo-$(date +%F).dump
docker run --rm -v toppo_toppo-data:/data -v "$PWD":/backup alpine tar czf /backup/toppo-data-$(date +%F).tgz -C /data .
```

Restore into a fresh installation with `pg_restore` and by extracting the archive into the volume, before starting Toppo.

## Upgrades

```sh
docker compose pull
docker compose up -d
```

Migrations run automatically at startup, each in a transaction; Toppo refuses to start if one fails, leaving the database untouched. Back up first, and pin `IMAGE_TAG` to a version in production instead of `latest`.

## Security of the container

The image is distroless (no shell, no package manager) and runs as an unprivileged user. The provided compose file also makes the filesystem read-only, drops every Linux capability and forbids privilege escalation. Keep these settings if you write your own deployment.
