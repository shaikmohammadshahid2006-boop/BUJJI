import sys
from pathlib import Path

# Add server directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app.main import app
from app.core.command_router import CommandRouter
from app.core.jarvis import jarvis_instance
from app.utils.url_validator import is_safe_url, sanitize_url

client = TestClient(app)

def run_tests():
    print("[TEST 1] Testing Health Endpoint...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data["status"] == "ok"
    print("  -> Health OK:", data)

    print("\n[TEST 2] Testing URL Validation & Security...")
    assert not is_safe_url("javascript:alert(1)"), "Blocked javascript:"
    assert not is_safe_url("file:///etc/passwd"), "Blocked file:"
    assert not is_safe_url("data:text/html,<script>alert(1)</script>"), "Blocked data:"
    assert is_safe_url("https://www.youtube.com"), "Allowed https YouTube"
    assert sanitize_url("google.com") == "https://google.com", "Auto-prefixed https://"
    print("  -> URL Security validation passed.")

    print("\n[TEST 3] Testing Command Router directly...")
    # YouTube command
    yt = CommandRouter.route_command("open youtube")
    assert yt is not None
    assert yt["action"] == "open_url"
    assert "youtube.com" in yt["data"]["url"]
    print("  -> YouTube routing OK:", yt["action"], yt["data"]["url"])

    # Time command
    t = CommandRouter.route_command("what time is it")
    assert t is not None
    print("  -> Time routing OK:", t["message"])

    # Desktop command isolation
    desk = CommandRouter.route_command("open notepad")
    assert desk is not None
    assert desk["action"] == "desktop_command"
    print("  -> Desktop command isolation OK:", desk["action"])

    print("\n[TEST 4] Testing Jarvis Core processing...")
    core_res = jarvis_instance.process_command("hello jarvis")
    assert "sir" in core_res["message"].lower() or "service" in core_res["message"].lower()
    print("  -> Jarvis Core reply OK:", core_res["message"][:60], "...")

    print("\n[TEST 5] Testing Unauthenticated /api/assistant/command...")
    unauth = client.post("/api/assistant/command", json={"message": "hello"})
    assert unauth.status_code == 401, f"Expected 401 Unauthorized, got {unauth.status_code}"
    print("  -> Auth protection verified: 401 Unauthorized received without JWT.")

    print("\n[TEST 6] Testing Authenticated Command & Conversation creation...")
    headers = {"Authorization": "Bearer mock_jwt_token_for_sandbox"}
    auth_cmd = client.post("/api/assistant/command", json={"message": "open youtube"}, headers=headers)
    assert auth_cmd.status_code == 200, f"Expected 200, got {auth_cmd.status_code}: {auth_cmd.text}"
    auth_data = auth_cmd.json()
    assert auth_data["success"] is True
    assert auth_data["action"] == "open_url"
    assert "url" in auth_data["data"]
    conv_id = auth_data["conversation_id"]
    print("  -> Authenticated command succeeded:", auth_data["message"], "Conv ID:", conv_id)

    print("\n[TEST 7] Testing Fetching User Conversations...")
    convs_res = client.get("/api/conversations", headers=headers)
    assert convs_res.status_code == 200
    conv_list = convs_res.json()
    assert len(conv_list) >= 1
    print(f"  -> Successfully retrieved {len(conv_list)} conversations.")

    print("\n[TEST 8] Testing Fetching Messages...")
    msgs_res = client.get(f"/api/conversations/{conv_id}/messages", headers=headers)
    assert msgs_res.status_code == 200
    msgs = msgs_res.json()
    assert len(msgs) >= 2  # user prompt and assistant reply
    print(f"  -> Successfully retrieved {len(msgs)} messages in conversation.")

    print("\nALL BACKEND TESTS (1-8) PASSED CLEANLY!")

if __name__ == "__main__":
    run_tests()
