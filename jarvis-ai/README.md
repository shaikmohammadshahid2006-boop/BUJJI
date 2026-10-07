# J.A.R.V.I.S — Full-Stack Web AI Assistant

A modern, production-ready, cloud-native transformation of the JARVIS AI Assistant.

---

## 1. Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT TIER (Vercel)                            │
│  React 18 + Vite + TypeScript + Tailwind CSS                                │
│                                                                             │
│  - Web Speech Recognition (Mic Input)                                       │
│  - Web Speech Synthesis (Jarvis Vocal Out)                                  │
│  - Controlled Action Handler (open_url, search_web, play_media, copy_text)  │
│  - Supabase JS Client (Auth & Session State)                                │
└───────────────────────┬───────────────────────────────▲─────────────────────┘
                        │ HTTPS (Bearer JWT)            │ Safe Structured Action
                        ▼                               │ JSON Response
┌───────────────────────────────────────────────────────┴─────────────────────┐
│                            SERVER TIER (Render)                             │
│  FastAPI + Uvicorn + Pydantic                                               │
│                                                                             │
│  - JWT Bearer Authentication & User Identification                          │
│  - Command Intent Router (YouTube, Web Search, Weather, Flights, Time, OS)  │
│  - Action Executor (DDGS, YouTube Scraper, Transcript Summaries)            │
│  - Jarvis Intelligence Core (Persona & Gemini Model Fallback Ladder)        │
│  - URL Sanitizer (Blocks dangerous schemes: javascript:, file:, data:)      │
└───────────────────────┬─────────────────────────────────────────────────────┘
                        │
                        ▼ Database Queries (Scoped to auth.uid() = user_id)
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE & AUTH (Supabase)                        │
│  PostgreSQL with Row Level Security (RLS)                                   │
│                                                                             │
│  - profiles (User identity & voice preferences)                             │
│  - conversations (User session threads)                                     │
│  - messages (User inputs & assistant responses with actions/metadata)       │
└─────────────────────────────────────────────────────────────────────────────┘
                                  ║
                                  ║ Optional Future Bridge
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LOCAL JARVIS COMPANION AGENT (Optional)                │
│  Runs on personal PC for local OS automation (calc, notepad, volume, etc.)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```text
jarvis-ai/
├── client/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── ActionCard.tsx         # Interactive cards for media/urls/code
│   │   │   ├── ChatMessage.tsx        # Chat bubbles with TTS replay & copy
│   │   │   ├── Navbar.tsx             # Header with HUD status & auto-speak
│   │   │   ├── ProtectedRoute.tsx     # Route auth guard
│   │   │   ├── Sidebar.tsx            # Session drawer & history archive
│   │   │   ├── StatusBadge.tsx        # Online / Listening / Speaking status
│   │   │   └── VoiceVisualizer.tsx    # Audio waveform visualizer
│   │   ├── hooks/
│   │   │   ├── useAuth.ts             # Supabase Auth hook
│   │   │   ├── useSpeechRecognition.ts# Web Speech microphone listener
│   │   │   └── useSpeechSynthesis.ts  # Browser vocal synthesizer
│   │   ├── layouts/
│   │   │   └── DashboardLayout.tsx
│   │   ├── lib/
│   │   │   ├── actionHandler.ts       # Safe browser action runner
│   │   │   ├── supabase.ts            # Supabase client singleton
│   │   │   └── utils.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx          # Main Jarvis command interface
│   │   │   ├── Login.tsx              # Futuristic login portal
│   │   │   ├── Settings.tsx           # Profile & voice controls
│   │   │   └── Signup.tsx             # Clearance registration
│   │   ├── services/
│   │   │   ├── api.ts                 # Base HTTP client with JWT injection
│   │   │   └── assistantService.ts    # REST endpoints bridge
│   │   ├── types/
│   │   │   ├── assistant.ts
│   │   │   ├── auth.ts
│   │   │   └── conversation.ts
│   │   ├── App.tsx                    # Routes & Auth Provider
│   │   ├── index.css                  # Futuristic HUD tokens & styles
│   │   └── main.tsx                   # React DOM entry
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/
│   ├── app/
│   │   ├── api/
│   │   │   ├── assistant.py           # POST /api/assistant/command
│   │   │   ├── auth.py                # GET /api/auth/me
│   │   │   ├── conversations.py       # CRUD /api/conversations
│   │   │   └── health.py              # GET /api/health
│   │   ├── core/
│   │   │   ├── action_executor.py     # Safe backend actions & scraper
│   │   │   ├── command_router.py      # Intent classifier
│   │   │   └── jarvis.py              # Persona & Gemini ladder engine
│   │   ├── models/
│   │   │   ├── assistant.py           # Pydantic request/response models
│   │   │   └── conversation.py
│   │   ├── services/
│   │   │   ├── assistant_service.py   # Flow orchestrator
│   │   │   ├── speech_service.py      # Vocal metadata
│   │   │   └── supabase_service.py    # PostgreSQL isolated data layer
│   │   ├── utils/
│   │   │   ├── security.py            # JWT verification
│   │   │   └── url_validator.py       # Strict URL scheme validator
│   │   ├── config.py                  # Pydantic BaseSettings
│   │   ├── dependencies.py            # FastAPI get_current_user
│   │   └── main.py                    # App entry, CORS, routers
│   ├── supabase/
│   │   └── schema.sql                 # Complete DB tables & RLS policies
│   ├── .env.example
│   ├── render.yaml                    # Render Web Service blueprint
│   └── requirements.txt
│
├── README.md
└── .gitignore
```

---

## 3. How the Original Jarvis Logic Was Refactored

| Original Mark-LV Python Component | Problem in Web Context | Refactored Solution in Full-Stack App |
|---|---|---|
| `sounddevice` / `sd.InputStream` | Audio hardware only exists on server; cannot record user's local microphone across the web. | **Browser Web Speech API** (`useSpeechRecognition.ts`) records voice on client device with zero audio upload required. |
| `Kokoro` / `EdgeTTS` / `winsound` | Generates sound through server soundcard speakers; client cannot hear it. | **Browser SpeechSynthesis API** (`useSpeechSynthesis.ts`) renders speech locally in user's earphones/speakers with rate/pitch control. |
| `subprocess.Popen("notepad.exe")` | Spawns processes on host server; security risk and useless to user. | **Action Intercept**: Classified as `desktop_command`. Restricts arbitrary execution on server and notifies user of local companion agent. |
| `subprocess.Popen(["cmd", "/c", "start", url])` | Launches browser on the server instead of the user's browser. | Returns structured `{ action: "open_url", data: { url: "..." } }` executed safely by user's browser via `window.open`. |
| `actions/youtube_video.py` | Embedded desktop video player and subprocesses. | Preserved video search scraping (`_scrape_first_video_url`) and transcript summarization (`YouTubeTranscriptApi`); returns playable media card in web UI. |
| `actions/web_search.py` | Subprocess desktop browser launch. | Preserved DuckDuckGo search querying (`ddgs`) and returns summarized results with clickable safe URLs. |
| `core/prompt.txt` | Persona text file. | Preserved full Jarvis persona (respectful, articulate, dry wit, level tone under stress) inside `server/app/core/jarvis.py`. |
| `core/gemini.py` | Multi-model fallback ladder (`gemini-2.5-flash`, etc.). | Refactored into `JarvisCore._call_gemini_ladder` with graceful heuristic fallback when offline. |
| Single-user in-memory state | Conflicts between different web users. | Refactored into **Supabase PostgreSQL** with Row Level Security (`auth.uid() = user_id`). |

---

## 4. Controlled Action System

To prevent arbitrary command or script injection, the backend emits strictly typed actions from this enum:

- `NONE`: Standard dialogue response.
- `OPEN_URL`: Safely opens a validated HTTPS web URL.
- `SEARCH_WEB`: Searches Google/DuckDuckGo and presents formatted search results.
- `PLAY_MEDIA`: Directs browser to stream or play YouTube media.
- `SHOW_NOTIFICATION`: Displays desktop browser alert notifications.
- `COPY_TEXT`: Copies code snippets or answers directly to user's clipboard.
- `OPEN_NEW_TAB`: Safely opens a validated resource in a new browser tab.
- `ASK_CONFIRMATION`: Prompts user before continuing.
- `DESKTOP_COMMAND`: Intercepts desktop OS requests and provides clear feedback.

### Dangerous Scheme Filtering
All URLs are strictly sanitized in `app/utils/url_validator.py` and `client/src/lib/actionHandler.ts`:
- Blocked schemes: `javascript:`, `file:`, `data:`, `vbscript:`, `blob:`, `chrome:`, `about:`.
- Only `http://` and `https://` protocols are permitted.

---

## 5. Supabase Setup & Database Schema

1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Paste and run the entire SQL script from `server/supabase/schema.sql`.
4. This creates:
   - `profiles` table with automatic user creation trigger.
   - `conversations` table.
   - `messages` table.
   - Row Level Security (RLS) policies ensuring users can only read, write, or delete their own data.

---

## 6. Environment Variables

### Client (`client/.env`)
```bash
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Server (`server/.env`)
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
GEMINI_API_KEY=your_gemini_api_key_here
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development
```

> **Security Rule**: Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` to the frontend or in Vite `.env` files.

---

## 7. Local Development Guide

### Running the Backend Server
```bash
cd jarvis-ai/server

# Create and activate Python virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
- Health Check: `http://localhost:8000/api/health`
- Interactive API Docs: `http://localhost:8000/docs`

### Running the Frontend Client
```bash
cd jarvis-ai/client

# Install npm dependencies
npm install

# Start Vite dev server
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 8. Deployment Instructions

### Deploying Frontend to Vercel
1. Push your repository to GitHub.
2. In Vercel, click **Add New Project** and select your repository.
3. Set **Root Directory** to `client`.
4. Configure Environment Variables in Vercel:
   - `VITE_API_URL`: Your deployed Render backend URL (e.g. `https://jarvis-backend.onrender.com`).
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.
5. Click **Deploy**.

### Deploying Backend to Render
1. Create a **New Web Service** on Render connected to your repository.
2. Set **Root Directory** to `server`.
3. Set **Runtime** to `Python 3`.
4. Set **Build Command**: `pip install -r requirements.txt`.
5. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
6. Add Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `GEMINI_API_KEY`
   - `ALLOWED_ORIGINS`: Set to your deployed Vercel domain (e.g. `https://jarvis-ai.vercel.app`).
   - `ENVIRONMENT`: `production`.
7. Click **Create Web Service**.

---

## 9. Future Desktop Companion Agent Architecture

To support local applications (such as VS Code, Terminal, desktop volume control, and file editing) from the web dashboard:

```text
Web Client Dashboard
       │
       ▼ (HTTPS REST / WebSocket)
FastAPI Cloud Backend
       │
       ▼ (Secure WebSocket Channel with End-to-End Auth)
Optional Local Desktop Jarvis Agent (running on your Windows/Mac machine)
       │
       ▼ (Local PyAutoGUI / Subprocess)
User's Computer
```

This guarantees that cloud users cannot execute commands on your host PC without explicit desktop daemon pairing.
