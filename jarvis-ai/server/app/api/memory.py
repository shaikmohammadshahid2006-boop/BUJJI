"""
jarvis-ai/server/app/api/memory.py
Mark LV recallable memory management endpoints.
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/memory", tags=["Memory Management"])


class StoreFactRequest(BaseModel):
    category: str = Field(default="notes")
    key: str
    value: str


@router.get("")
async def get_all_memory():
    """Returns the full persistent memory tree."""
    return {
        "success": True,
        "memory": MemoryService.load_memory(),
        "prompt_block": MemoryService.format_memory_for_prompt()
    }


@router.get("/search")
async def search_memory(q: str):
    """Searches memory records locally by keyword."""
    return {
        "success": True,
        "query": q,
        "results": MemoryService.search_memory(q)
    }


@router.post("")
async def store_memory_fact(req: StoreFactRequest):
    """Stores a new fact or preference."""
    ok = MemoryService.store_fact(req.category, req.key, req.value)
    return {"success": ok, "category": req.category, "key": req.key}


@router.delete("")
async def delete_memory_fact(category: str, key: str):
    """Forgets a fact from memory."""
    ok = MemoryService.remove_fact(category, key)
    return {"success": ok, "category": category, "key": key}
