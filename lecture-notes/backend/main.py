import os
import tempfile
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

load_dotenv()

from anthropic import Anthropic
from faster_whisper import WhisperModel

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

app = FastAPI(title="Lecture → Notes")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic()
whisper = WhisperModel(WHISPER_MODEL, device=WHISPER_DEVICE, compute_type=WHISPER_COMPUTE_TYPE)


class Flashcard(BaseModel):
    front: str = Field(description="Short question or term")
    back: str = Field(description="Concise answer or definition")


class ExamQuestion(BaseModel):
    question: str = Field(description="Likely exam question in student-facing wording")
    answer_hint: str = Field(description="A short hint or key idea needed to answer")


class Notes(BaseModel):
    title: str = Field(description="Short lecture title, 3-8 words")
    summary: str = Field(description="One-page summary of the lecture, ~300-500 words, markdown allowed")
    flashcards: List[Flashcard] = Field(description="Exactly 10 flashcards covering the most important concepts", min_length=10, max_length=10)
    exam_questions: List[ExamQuestion] = Field(description="Exactly 5 likely exam questions based on emphasis and difficulty", min_length=5, max_length=5)


class ProcessResponse(BaseModel):
    transcript: str
    notes: Notes


SYSTEM_PROMPT = """You are a study assistant. A student just recorded a lecture.
Given the raw transcript, produce:
- a short title
- a 1-page markdown summary (~300-500 words) that captures main ideas, key terms, and examples
- exactly 10 flashcards (front/back) on the most important facts and definitions
- exactly 5 exam questions that a professor is likely to actually ask, with a one-line hint

Write clearly and at the student's level. Prefer concrete detail over vague summary.
If the transcript is short or noisy, still produce the full set — mark uncertain items with "(check source)" rather than omitting."""


def transcribe(audio_path: str) -> str:
    segments, _ = whisper.transcribe(audio_path, beam_size=5, vad_filter=True)
    return " ".join(seg.text.strip() for seg in segments).strip()


EMIT_TOOL = {
    "name": "emit_notes",
    "description": "Emit the structured lecture notes for the student.",
    "input_schema": Notes.model_json_schema(),
}


def generate_notes(transcript: str) -> Notes:
    with client.messages.stream(
        model="claude-opus-4-7",
        max_tokens=8000,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        tools=[EMIT_TOOL],
        tool_choice={"type": "tool", "name": "emit_notes"},
        messages=[{"role": "user", "content": f"Lecture transcript:\n\n{transcript}"}],
    ) as stream:
        final = stream.get_final_message()

    for block in final.content:
        if getattr(block, "type", None) == "tool_use" and block.name == "emit_notes":
            return Notes.model_validate(block.input)
    raise HTTPException(500, "Claude did not return structured notes")


@app.post("/api/process", response_model=ProcessResponse)
async def process_audio(audio: UploadFile = File(...)):
    if not audio.content_type or not audio.content_type.startswith(("audio/", "video/")):
        raise HTTPException(400, f"Unsupported content type: {audio.content_type}")

    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        transcript = transcribe(tmp_path)
        if not transcript:
            raise HTTPException(422, "Could not transcribe any speech from the recording")
        notes = generate_notes(transcript)
        return ProcessResponse(transcript=transcript, notes=notes)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


class TextRequest(BaseModel):
    transcript: str


@app.post("/api/process-text", response_model=Notes)
async def process_text(req: TextRequest):
    if not req.transcript.strip():
        raise HTTPException(400, "Transcript is empty")
    return generate_notes(req.transcript)


@app.get("/api/health")
async def health():
    return {"ok": True, "whisper_model": WHISPER_MODEL}


if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    async def index():
        return FileResponse(FRONTEND_DIR / "index.html")
