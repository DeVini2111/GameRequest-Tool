from fastapi import APIRouter
from services.redis_client import get_redis

router = APIRouter()

@router.get("/_cache_keys")
async def cache_keys():
    client = await get_redis()
    # ACHTUNG: KEYS kann blockieren, wenn Du Millionen von Keys hast.
    keys = await client.keys("*")
    return {"keys": keys}