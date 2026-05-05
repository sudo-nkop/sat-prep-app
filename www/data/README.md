# Adding more questions

The app loads all questions from `questions.json` at startup. To add more, just edit that file.

## Schema

Each entry in the `questions` array must have:

```json
{
  "id":          "unique-id-string",
  "section":     "math" | "rw",
  "topic":       "any-string-tag",     // e.g. algebra, geometry, agreement, transitions
  "difficulty":  1 | 2 | 3,            // 1 = easy, 2 = medium, 3 = hard
  "prompt":      "The question text. Use \\n for line breaks.",
  "choices": {
    "A": "first choice",
    "B": "second choice",
    "C": "third choice",
    "D": "fourth choice"
  },
  "answer":      "A" | "B" | "C" | "D",
  "explanation": "Why the correct answer is correct."
}
```

- `topic` is free-form. It controls the topic dropdown in Practice mode — group similar questions under the same tag.
- `id` should be unique. Convention: `m-alg-001` (math/algebra/sequence) or `rw-gr-001` (R&W/grammar/sequence).
- The math reference graphics (`x²`, `π`, etc.) are written as plain Unicode characters.

## Adding a batch

Just paste new entries into the `questions` array, separated by commas. Validate the JSON (e.g. `python3 -m json.tool questions.json`) before saving.

## Where this is loaded
`app.js` calls `fetch('data/questions.json')` on startup.

## Adding new sections or modes
The two `section` values (`math`, `rw`) are baked into the test setup screen. To add a new section type, edit `app.js` (`startTest`) and `index.html` (`#screen-test-setup`).

## Larger question banks
For very large banks, you can split into multiple files and load them all in `loadQuestions()` in `app.js` — for now a single JSON file is the simplest source of truth.

## Free official sources you can crib from (and convert into this format)
- College Board's **SAT Suite Question Bank** — official released questions, free.
- Khan Academy's official Digital SAT prep — partnered with College Board.
- The **Bluebook** app from College Board — full-length practice tests.
