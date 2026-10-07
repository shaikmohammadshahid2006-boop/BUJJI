from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.dependencies import get_current_user
from app.services.supabase_service import SupabaseService
from app.models.conversation import ProfileResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me", response_model=ProfileResponse)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns the authenticated user's profile. Identity is verified via JWT token.
    """
    user_id = current_user["user_id"]
    email = current_user.get("email")
    profile = SupabaseService.get_or_create_profile(user_id=user_id, email=email)
    return profile
