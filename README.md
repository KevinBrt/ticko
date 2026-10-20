# Ticko

**Modern issue tracking. Self-hosted. Free forever, no strings attached.**

Ticko is an open-source issue tracker in the spirit of YouTrack, Mantis or Taiga: one edition with everything included, installed with one command, on your own server.

> **Status: early development.** Ticko is not usable yet. Follow the [roadmap](ARCHITECTURE.md#roadmap-to-01) to see where we are.

## Why Ticko

- **Everything included, for everyone.** No user limit, no paid SSO, no closed "enterprise" edition.
- **One command to install.** `docker compose up` starts Ticko and PostgreSQL. Runs on a server, a NAS or a Raspberry Pi (amd64 and arm64).
- **Configurable.** Workflows, custom fields (required or optional at creation), labels and roles are set once for the whole instance and can be overridden per project.
- **Fast and pleasant.** Keyboard shortcuts, command palette, works on phones.
- **Secure by default.** Strict Content Security Policy, hardened container, every route authorized and validated.
- **Extensible.** Integrations (GitHub, Slack, webhooks) are plugins built on a public SDK.

## Install

```sh
mkdir ticko && cd ticko
curl -fsSLO https://raw.githubusercontent.com/KevinBrt/ticko/main/docker/docker-compose.yml
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)" > .env
docker compose up -d
docker compose logs ticko | grep "setup code"
```

Open <http://localhost:3000>, enter the setup code from the logs and create the administrator account. Configuration, reverse proxy, backups and upgrades: [docs/self-hosting.md](docs/self-hosting.md).

## Develop

Requirements: Node.js 24 (see `.nvmrc`) and Docker.

```sh
git clone https://github.com/KevinBrt/ticko.git && cd ticko
npm ci
npm run setup   # enable git hooks
npm run dev     # database + API on :3000 + web app on :5173
```

`npm run check` runs everything CI runs. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request, and [ARCHITECTURE.md](ARCHITECTURE.md) for how Ticko is built.

## License

Ticko is licensed under the [GNU Affero General Public License v3.0](LICENSE): you can use, modify and host it freely; if you offer a modified version to others over a network, you share its source. The plugin SDK (`@ticko/plugin-sdk`, coming after v0.1) will be MIT-licensed, so plugins can use any license.
