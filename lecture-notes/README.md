# LectureNotes — prototype

Record a lecture on your phone → get a 1-page summary, 10 flashcards, and 5 likely exam questions.

## Stack

- **Backend**: FastAPI + `faster-whisper` (local transcription, CPU-friendly) + Anthropic SDK calling `claude-opus-4-7` with adaptive thinking and structured JSON output.
- **Frontend**: one HTML file, vanilla JS, mobile-first. In-browser recording via `MediaRecorder`, or file upload.

## Run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # paste your ANTHROPIC_API_KEY
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open `http://localhost:8000` on phone or desktop.

First run downloads the Whisper model (~150 MB for `base`). Set `WHISPER_MODEL=tiny` in `.env` for faster-but-worse transcription, or `small`/`medium` for better quality.

## Endpoints

- `POST /api/process` — multipart `audio` file. Returns `{transcript, notes}`.
- `POST /api/process-text` — JSON `{transcript}`. Returns `notes` only (useful if you already have a transcript).
- `GET /api/health`

## What to test next

- Swap `faster-whisper` for an API if you need scale.
- Add login + a Postgres table so users can revisit past lectures.
- Cache the Claude system prompt with `cache_control` once prompt is locked in.
