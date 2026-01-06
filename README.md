# GameRequest

A self-hosted game request management system. Users can search for games, create requests, and admins can manage the game library.

## Features

- 🎮 Search games via IGDB API
- 📝 User request system with status tracking
- 👥 Multi-user support with admin controls
- 🎨 Modern web interface
- 🔒 Secure authentication
- 🐳 Easy Docker deployment

## Installation

### Prerequisites

- Docker and Docker Compose installed
- IGDB API credentials (free from https://api.igdb.com/)

### Quick Start

1. **Get IGDB credentials**
   
   Follow the "Obtaining IGDB Credentials" section below to create a Twitch Developer application and fetch the IGDB Client ID and Client Secret that will power the game search features.

2. **Download docker-compose.yml**
   
   ```bash
   curl -O https://raw.githubusercontent.com/DeVini2111/GameRequest/main/docker-compose.yml
   ```

3. **Edit the configuration**
   
   Open `docker-compose.yml` and change these 3 values:
   
   ```yaml
   DB_PASSWORD: your_secure_password_here
   IGDB_CLIENT_ID: your_igdb_client_id
   IGDB_CLIENT_SECRET: your_igdb_client_secret
   ```

4. **Start the service**
   
   ```bash
   docker-compose up -d
   ```

5. **Complete the in-app setup**
   
   Open http://localhost:8075 in your browser, follow the on-screen wizard to create the initial admin user, and you are ready to go—no CLI admin creation needed.

## Configuration

Edit these values in `docker-compose.yml`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_PASSWORD` | Yes | PostgreSQL database password |
| `IGDB_CLIENT_ID` | Yes | IGDB API Client ID |
| `IGDB_CLIENT_SECRET` | Yes | IGDB API Client Secret |
| `CORS_ORIGINS` | No | Allowed origins (default: "*") |

## Obtaining IGDB Credentials

1. **Create a Twitch Developer account**
   - Visit https://dev.twitch.tv and sign in with (or create) a Twitch account.
   - Accept the Developer Agreement when prompted.
2. **Register a new application**
   - In the dashboard, click **Applications → Register Your Application**.
   - Set any name (e.g., `GameRequest`), choose "Website Integration" as the category, and enter a placeholder OAuth redirect URL such as `https://example.com` (not used by GameRequest).
   - Submit the form; the dashboard now shows your app with a **Client ID**—copy it into `docker-compose.yml`.
3. **Generate a Client Secret**
   - From the same application details page, click **New Secret**. Twitch will display the **Client Secret** once; copy it immediately into `docker-compose.yml`.
4. **Enable IGDB access**
   - Visit https://api.igdb.com, sign in with the same Twitch account, and link the application you just created. IGDB automatically inherits the Client ID/Secret from Twitch.
5. **Update `docker-compose.yml`**
   - Paste the copied Client ID and Secret into the `IGDB_CLIENT_ID` and `IGDB_CLIENT_SECRET` fields, then run `docker compose up -d`.

## Ports

- **8075** - Web interface and API (mapped to container port 8000)

## Update

```bash
docker-compose pull
docker-compose up -d
```

## Support

For issues and questions, visit: https://github.com/DeVini2111/GameRequest/issues

