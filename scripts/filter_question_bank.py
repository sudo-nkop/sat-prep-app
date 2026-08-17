#!/usr/bin/env python3
"""
Classify every question in www/data/questions.json with a local Ollama model
and split out anything that doesn't look like a real SAT-style question.

Runs entirely against a local model over Ollama's HTTP API — no data leaves
your machine.

Usage:
    ollama pull llama3.1                 # once, if you don't have a model yet
    python3 scripts/filter_question_bank.py

    # options
    python3 scripts/filter_question_bank.py --model llama3.1 --limit 20
    python3 scripts/filter_question_bank.py --host http://localhost:11434
    python3 scripts/filter_question_bank.py --apply   # overwrite questions.json in place

Output (default, no --apply):
    www/data/questions.filtered.json   - kept questions, same schema as the input
    www/data/questions.removed.json    - dropped questions + the model's reason
    scripts/.filter_checkpoint.jsonl   - one verdict per line, so a killed run can resume

With --apply, questions.filtered.json is written directly over
www/data/questions.json instead of a side-by-side file.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = ROOT / "www" / "data" / "questions.json"
DEFAULT_CHECKPOINT = ROOT / "scripts" / ".filter_checkpoint.jsonl"

SYSTEM_PROMPT = """You are reviewing entries in an SAT prep app's question bank. \
Each entry claims to be a real SAT-style practice question (Math, or Reading & \
Writing). Decide whether it actually is one.

Reject an entry (is_sat=false) if it:
- is not in valid SAT question format (missing a real prompt, missing/broken \
answer choices for a multiple-choice item, no correct answer given)
- tests content outside the SAT's actual scope (e.g. calculus, chemistry \
trivia, general knowledge unrelated to Math/Reading/Writing)
- is a duplicate/placeholder/lorem-ipsum/test entry rather than a real question
- is nonsensical, truncated, or has answer choices that don't match the question

Accept it (is_sat=true) if it is a legitimate, well-formed SAT Math or \
Reading & Writing practice question, even if not perfectly worded.

Respond with strict JSON only, no other text: {"is_sat": true or false, "reason": "<one short sentence>"}
"""


def build_user_prompt(q: dict) -> str:
    lines = [
        f"section: {q.get('section')}",
        f"topic: {q.get('topic')}",
        f"prompt: {q.get('prompt')}",
    ]
    choices = q.get("choices")
    if choices:
        lines.append("choices:")
        for key, val in choices.items():
            lines.append(f"  {key}: {val}")
    if "answer" in q:
        lines.append(f"answer: {q.get('answer')}")
    return "\n".join(lines)


def classify(host: str, model: str, question: dict, timeout: float) -> dict:
    payload = {
        "model": model,
        "format": "json",
        "stream": False,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(question)},
        ],
    }
    req = urllib.request.Request(
        f"{host.rstrip('/')}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    content = body["message"]["content"]
    verdict = json.loads(content)
    return {
        "is_sat": bool(verdict.get("is_sat", True)),
        "reason": str(verdict.get("reason", "")).strip(),
    }


def load_checkpoint(path: Path) -> dict:
    verdicts = {}
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            verdicts[row["id"]] = row
    return verdicts


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Path to questions.json")
    parser.add_argument("--model", default="llama3.1", help="Ollama model name (default: llama3.1)")
    parser.add_argument("--host", default="http://localhost:11434", help="Ollama server URL")
    parser.add_argument("--limit", type=int, default=None, help="Only classify the first N questions (for testing)")
    parser.add_argument("--timeout", type=float, default=60.0, help="Per-request timeout in seconds")
    parser.add_argument("--checkpoint", type=Path, default=DEFAULT_CHECKPOINT, help="Resume/progress log path")
    parser.add_argument("--apply", action="store_true", help="Overwrite the input file in place instead of writing questions.filtered.json")
    args = parser.parse_args()

    data = json.loads(args.input.read_text())
    questions = data["questions"]
    if args.limit:
        questions = questions[: args.limit]

    checkpoint_verdicts = load_checkpoint(args.checkpoint)
    args.checkpoint.parent.mkdir(parents=True, exist_ok=True)
    checkpoint_fh = args.checkpoint.open("a")

    kept, removed = [], []
    total = len(questions)
    for i, q in enumerate(questions, 1):
        qid = q.get("id", f"__index_{i}")
        cached = checkpoint_verdicts.get(qid)
        if cached is not None:
            verdict = cached
        else:
            try:
                verdict = classify(args.host, args.model, q, args.timeout)
            except (urllib.error.URLError, json.JSONDecodeError, KeyError) as exc:
                print(f"[{i}/{total}] ERROR on {qid}: {exc}", file=sys.stderr)
                print("Is Ollama running? Try: ollama serve", file=sys.stderr)
                sys.exit(1)
            record = {"id": qid, **verdict}
            checkpoint_fh.write(json.dumps(record) + "\n")
            checkpoint_fh.flush()

        status = "KEEP" if verdict["is_sat"] else "DROP"
        print(f"[{i}/{total}] {status:4} {qid}  {verdict['reason']}")

        if verdict["is_sat"]:
            kept.append(q)
        else:
            removed.append({**q, "_reject_reason": verdict["reason"]})

    checkpoint_fh.close()

    out_path = args.input if args.apply else args.input.with_name("questions.filtered.json")
    out_data = dict(data)
    out_data["questions"] = kept
    out_data["_comment"] = f"SAT question bank - {len(kept)} questions"
    out_path.write_text(json.dumps(out_data, indent=2) + "\n")

    removed_path = args.input.with_name("questions.removed.json")
    removed_path.write_text(json.dumps({"questions": removed}, indent=2) + "\n")

    print(f"\nKept {len(kept)} / {total}, removed {len(removed)}.")
    print(f"Filtered bank written to: {out_path}")
    print(f"Removed questions (with reasons) written to: {removed_path}")
    if not args.apply:
        print(f"\nReview questions.removed.json, then replace {args.input} with questions.filtered.json when satisfied.")


if __name__ == "__main__":
    main()
