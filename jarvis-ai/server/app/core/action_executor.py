import re
import urllib.parse
from typing import Dict, Any, Tuple, Optional
import requests
from app.models.assistant import ActionType
from app.utils.url_validator import sanitize_url

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

YT_FILTER = "EgIQAQ%3D%3D"


def scrape_youtube_video_url(query: str) -> Optional[str]:
    """
    Scrapes the first YouTube video URL matching the query,
    filtering out YouTube Shorts, exactly like the original youtube_video.py.
    """
    try:
        search_url = (
            f"https://www.youtube.com/results"
            f"?search_query={urllib.parse.quote_plus(query)}"
            f"&sp={YT_FILTER}"
        )
        r = requests.get(search_url, headers=HEADERS, timeout=6)
        if r.status_code == 200:
            video_ids = re.findall(r'"videoId":"([A-Za-z0-9_-]{11})"', r.text)
            seen = set()
            for vid in video_ids:
                if vid in seen:
                    continue
                seen.add(vid)
                if f"/shorts/{vid}" in r.text:
                    continue
                return f"https://www.youtube.com/watch?v={vid}"
    except Exception as e:
        print(f"[ActionExecutor] YouTube scrape error: {e}")

    # Fallback to search query URL
    return f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(query)}"


def fetch_youtube_transcript(video_id_or_url: str) -> Optional[str]:
    """
    Extracts transcript from a YouTube video ID or URL using youtube_transcript_api.
    """
    match = re.search(
        r"(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})",
        video_id_or_url
    )
    video_id = match.group(1) if match else video_id_or_url

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        transcript = None

        # Preferred language priority
        langs = ["en", "tr", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "hi"]
        try:
            transcript = transcript_list.find_manually_created_transcript(langs)
        except Exception:
            pass

        if transcript is None:
            try:
                transcript = transcript_list.find_generated_transcript(langs)
            except Exception:
                for t in transcript_list:
                    transcript = t
                    break

        if transcript:
            fetched = transcript.fetch()
            return " ".join(item.get("text", "") for item in fetched)
    except Exception as e:
        print(f"[ActionExecutor] Transcript fetch failed: {e}")

    return None


def execute_web_search(query: str, max_results: int = 5) -> Tuple[str, list]:
    """
    Performs DuckDuckGo web search preserved from actions/web_search.py.
    Returns summary text and list of result dicts.
    """
    results = []
    try:
        import importlib
        ddg_mod = None
        for mod_name in ("ddgs", "duckduckgo_search"):
            try:
                ddg_mod = importlib.import_module(mod_name)
                break
            except ImportError:
                continue

        if ddg_mod and hasattr(ddg_mod, "DDGS"):
            DDGS = ddg_mod.DDGS
            with DDGS() as ddgs:
                for r in ddgs.text(query, max_results=max_results):
                    results.append({
                        "title": r.get("title", ""),
                        "snippet": r.get("body", ""),
                        "url": r.get("href", ""),
                    })
    except Exception as e:
        print(f"[ActionExecutor] Search error: {e}")

    if results:
        lines = [f"Here are the top results for '{query}':"]
        for i, res in enumerate(results[:3], 1):
            lines.append(f"{i}. **{res['title']}**: {res['snippet']} ([Link]({res['url']}))")
        return "\n\n".join(lines), results

    return f"I searched the web for '{query}'. You can review the findings at the link provided.", []


def build_weather_action(city: str) -> Dict[str, Any]:
    """
    Preserved from actions/weather_report.py
    """
    city_clean = city.strip()
    encoded = urllib.parse.quote_plus(f"weather in {city_clean}")
    url = f"https://www.google.com/search?q={encoded}"
    return {
        "action": ActionType.OPEN_URL,
        "data": {
            "url": sanitize_url(url),
            "query": f"Weather in {city_clean}",
            "title": f"Weather in {city_clean.title()}"
        },
        "message": f"Fetching the current weather report for {city_clean.title()}, sir."
    }


def build_flight_action(origin: str, destination: str, date: Optional[str] = None) -> Dict[str, Any]:
    """
    Preserved from actions/flight_finder.py
    """
    query = f"flights from {origin} to {destination}"
    if date:
        query += f" on {date}"
    encoded = urllib.parse.quote_plus(query)
    url = f"https://www.google.com/travel/flights?q={encoded}"
    return {
        "action": ActionType.OPEN_URL,
        "data": {
            "url": sanitize_url(url),
            "query": query,
            "title": f"Flights: {origin.title()} to {destination.title()}"
        },
        "message": f"Charting available flights from {origin.title()} to {destination.title()}, sir."
    }
