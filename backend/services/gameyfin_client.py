import httpx
import os

# Work with environment variables to be added later
GAMEYFIN_URL = os.getenv("GAMEYFIN_URL", "http://localhost:8080")

async def get_gameyfin_library():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{GAMEYFIN_URL}/v1/games")
        response.raise_for_status()
        return response.json()
