import logging
from typing import Optional, List, Dict, Any
import requests
from app.config import settings

logger = logging.getLogger("jarvis.supabase")

# In-Memory fallback store for local sandbox when tables or credentials are not yet ready
_LOCAL_PROFILES: Dict[str, Dict[str, Any]] = {}
_LOCAL_CONVERSATIONS: Dict[str, Dict[str, Any]] = {}
_LOCAL_MESSAGES: List[Dict[str, Any]] = []


class DirectSupabaseRestClient:
    """
    Direct HTTP client for Supabase PostgREST endpoints.
    Allows communicating with Supabase PostgreSQL without requiring the
    external 'supabase-py' dependency.
    """

    def __init__(self, base_url: str, key: str):
        self.base_url = base_url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def select(self, table: str, params: Dict[str, str]) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/{table}"
        res = requests.get(url, headers=self.headers, params=params, timeout=6)
        if res.status_code == 200:
            return res.json()
        if res.status_code == 404:
            logger.warning(f"Table '{table}' not found in Supabase schema cache. Run schema.sql in Supabase SQL editor.")
        else:
            logger.warning(f"Supabase select failed on {table} ({res.status_code}): {res.text}")
        return []

    def insert(self, table: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/{table}"
        res = requests.post(url, headers=self.headers, json=data, timeout=6)
        if res.status_code in (200, 201):
            results = res.json()
            return results[0] if results else data
        logger.warning(f"Supabase insert failed on {table} ({res.status_code}): {res.text}")
        return None

    def update(self, table: str, data: Dict[str, Any], params: Dict[str, str]) -> Optional[Dict[str, Any]]:
        url = f"{self.base_url}/{table}"
        res = requests.patch(url, headers=self.headers, json=data, params=params, timeout=6)
        if res.status_code == 200:
            results = res.json()
            return results[0] if results else data
        return None

    def delete(self, table: str, params: Dict[str, str]) -> bool:
        url = f"{self.base_url}/{table}"
        res = requests.delete(url, headers=self.headers, params=params, timeout=6)
        return res.status_code in (200, 204)


_rest_client: Optional[DirectSupabaseRestClient] = None


def get_rest_client() -> Optional[DirectSupabaseRestClient]:
    global _rest_client
    if _rest_client is not None:
        return _rest_client

    if not settings.supabase_url:
        return None

    key = settings.supabase_service_role_key or settings.supabase_anon_key
    if not key:
        return None

    _rest_client = DirectSupabaseRestClient(settings.supabase_url, key)
    return _rest_client


class SupabaseService:
    """
    Encapsulates all database interactions for profiles, conversations, and messages.
    Always enforces strict user isolation by scoping every query to `user_id`.
    """

    @staticmethod
    def get_or_create_profile(user_id: str, email: Optional[str] = None) -> Dict[str, Any]:
        client = get_rest_client()
        if client:
            try:
                rows = client.select("profiles", {"id": f"eq.{user_id}"})
                if rows:
                    return rows[0]

                new_profile = {
                    "id": user_id,
                    "email": email or "",
                    "display_name": email.split("@")[0] if email else "User",
                    "avatar_url": "",
                    "voice_enabled": True,
                    "auto_speak": True,
                }
                created = client.insert("profiles", new_profile)
                if created:
                    return created
            except Exception as e:
                logger.error(f"Error in get_or_create_profile: {e}")

        # Fallback local store
        if user_id not in _LOCAL_PROFILES:
            _LOCAL_PROFILES[user_id] = {
                "id": user_id,
                "email": email or "user@jarvis.local",
                "display_name": email.split("@")[0] if email else "User",
                "avatar_url": "",
                "voice_enabled": True,
                "auto_speak": True,
            }
        return _LOCAL_PROFILES[user_id]

    @staticmethod
    def list_conversations(user_id: str) -> List[Dict[str, Any]]:
        client = get_rest_client()
        if client:
            try:
                rows = client.select("conversations", {
                    "user_id": f"eq.{user_id}",
                    "order": "updated_at.desc"
                })
                if rows:
                    return rows
            except Exception as e:
                logger.error(f"Error listing conversations: {e}")

        # Local fallback
        return [
            conv for conv in _LOCAL_CONVERSATIONS.values()
            if conv.get("user_id") == user_id
        ]

    @staticmethod
    def create_conversation(user_id: str, title: str = "New Conversation") -> Dict[str, Any]:
        client = get_rest_client()
        if client:
            try:
                record = {"user_id": user_id, "title": title}
                created = client.insert("conversations", record)
                if created:
                    return created
            except Exception as e:
                logger.error(f"Error creating conversation: {e}")

        import uuid
        from datetime import datetime
        cid = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        conv = {
            "id": cid,
            "user_id": user_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
        }
        _LOCAL_CONVERSATIONS[cid] = conv
        return conv

    @staticmethod
    def get_conversation(user_id: str, conversation_id: str) -> Optional[Dict[str, Any]]:
        client = get_rest_client()
        if client:
            try:
                rows = client.select("conversations", {
                    "id": f"eq.{conversation_id}",
                    "user_id": f"eq.{user_id}"
                })
                if rows:
                    return rows[0]
            except Exception as e:
                logger.error(f"Error getting conversation {conversation_id}: {e}")

        conv = _LOCAL_CONVERSATIONS.get(conversation_id)
        if conv and conv.get("user_id") == user_id:
            return conv
        return None

    @staticmethod
    def delete_conversation(user_id: str, conversation_id: str) -> bool:
        client = get_rest_client()
        if client:
            try:
                ok = client.delete("conversations", {
                    "id": f"eq.{conversation_id}",
                    "user_id": f"eq.{user_id}"
                })
                if ok:
                    return True
            except Exception as e:
                logger.error(f"Error deleting conversation {conversation_id}: {e}")

        if conversation_id in _LOCAL_CONVERSATIONS and _LOCAL_CONVERSATIONS[conversation_id].get("user_id") == user_id:
            del _LOCAL_CONVERSATIONS[conversation_id]
            global _LOCAL_MESSAGES
            _LOCAL_MESSAGES = [m for m in _LOCAL_MESSAGES if m.get("conversation_id") != conversation_id]
            return True
        return False

    @staticmethod
    def list_messages(user_id: str, conversation_id: str) -> List[Dict[str, Any]]:
        conv = SupabaseService.get_conversation(user_id, conversation_id)
        if not conv:
            return []

        client = get_rest_client()
        if client:
            try:
                rows = client.select("messages", {
                    "conversation_id": f"eq.{conversation_id}",
                    "user_id": f"eq.{user_id}",
                    "order": "created_at.asc"
                })
                if rows:
                    return rows
            except Exception as e:
                logger.error(f"Error listing messages for {conversation_id}: {e}")

        return [
            m for m in _LOCAL_MESSAGES
            if m.get("conversation_id") == conversation_id and m.get("user_id") == user_id
        ]

    @staticmethod
    def add_message(
        user_id: str,
        conversation_id: str,
        role: str,
        content: str,
        action: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        client = get_rest_client()
        record = {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "action": action,
            "metadata": metadata or {},
        }

        if client:
            try:
                created = client.insert("messages", record)
                if created:
                    client.update("conversations", {}, {"id": f"eq.{conversation_id}"})
                    return created
            except Exception as e:
                logger.error(f"Error adding message: {e}")

        import uuid
        from datetime import datetime
        mid = str(uuid.uuid4())
        now = datetime.utcnow().isoformat() + "Z"
        msg = {
            "id": mid,
            "conversation_id": conversation_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "action": action,
            "metadata": metadata or {},
            "created_at": now,
        }
        _LOCAL_MESSAGES.append(msg)
        if conversation_id in _LOCAL_CONVERSATIONS:
            _LOCAL_CONVERSATIONS[conversation_id]["updated_at"] = now
        return msg
