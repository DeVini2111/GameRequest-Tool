from backend.models.request import StoredGameRequest
from typing import List

_requests: List[StoredGameRequest] = []

def add_request(req: StoredGameRequest):
    _requests.append(req)

def get_requests() -> List[StoredGameRequest]:
    return _requests

def exists(slug: str) -> bool:
    return any(r.slug == slug for r in _requests)

def clear_requests():
    _requests.clear()

def fulfill_matching_requests(library_slugs: list[str]):
    for request in _requests:
        if request.slug in library_slugs:
            request.status = "fulfilled"

