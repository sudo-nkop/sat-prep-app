#!/usr/bin/env python3
"""Fix incorrect answers in new questions and add 3 more to reach 250."""
import json

with open('/home/user/sat-prep-app/www/data/questions.json', 'r') as f:
    data = json.load(f)

print(f"Current count: {len(data['questions'])}")

fixes = {
    "m-alg-012": {
        "answer": "D",
        "explanation": "Cross-multiply: $2(2x-1) = 3(x+4) \\Rightarrow 4x - 2 = 3x + 12 \\Rightarrow x = 14$."
    },
    "m-alg-020": {
        "answer": "A",
        "explanation": "$2^{3x} = 2^6 \\Rightarrow 3x = 6 \\Rightarrow x = 2$. $3^{y+1} = 3^4 \\Rightarrow y = 3$. Sum $= 2 + 3 = 5$."
    },
    "m-adv-025": {
        "answer": "A",
        "explanation": "$\\sqrt{50} = 5\\sqrt{2}$; $\\sqrt{18} = 3\\sqrt{2}$. Difference $= 5\\sqrt{2} - 3\\sqrt{2} = 2\\sqrt{2}$."
    },
    "m-func-005": {
        "answer": "A",
        "explanation": "$f(-3) = 2(-3)+1 = -5$. $f(2) = 2^2 = 4$. Sum $= -5 + 4 = -1$."
    },
    "m-ps-018": {
        "answer": "C",
        "explanation": "After 15% discount: $120 \\times 0.85 = \\$102$. With 6% tax: $102 \\times 1.06 = \\$108.12$."
    },
    "m-ps-023": {
        "answer": "C",
        "explanation": "$\\binom{4}{2}\\binom{5}{1} = 30$ ways to choose 2 women and 1 man. Total: $\\binom{9}{3} = 84$. $P = \\frac{30}{84} = \\frac{5}{14}$."
    },
}

fixed = []
for q in data['questions']:
    if q['id'] in fixes:
        for key, val in fixes[q['id']].items():
            q[key] = val
        fixed.append(q['id'])
    # Also clean up any explanations with "Wait—" notes
    if 'Wait' in q.get('explanation', ''):
        print(f"WARNING: question {q['id']} has 'Wait' in explanation — check manually")

print(f"Fixed answers: {fixed}")

# Add 3 more questions to reach 250
extra = [
    {
        "id": "m-alg-024",
        "section": "math",
        "topic": "algebra",
        "difficulty": 1,
        "prompt": "If $7 - 3x = 1$, what is $x$?",
        "choices": {"A": "$-2$", "B": "$2$", "C": "$3$", "D": "$6$"},
        "answer": "B",
        "explanation": "$-3x = 1 - 7 = -6 \\Rightarrow x = 2$."
    },
    {
        "id": "rw-gr-029",
        "section": "rw",
        "topic": "concision",
        "difficulty": 1,
        "prompt": "Choose the most concise version that preserves meaning.",
        "choices": {
            "A": "At the present moment in time, the project is currently ongoing.",
            "B": "The project is currently ongoing at this time.",
            "C": "The project is ongoing.",
            "D": "The project, at this moment, is in an ongoing state."
        },
        "answer": "C",
        "explanation": "'The project is ongoing' removes all redundancy while preserving the full meaning. A, B, and D repeat the idea of 'now' unnecessarily."
    },
    {
        "id": "rw-rd-046",
        "section": "rw",
        "topic": "main-idea",
        "difficulty": 2,
        "prompt": "Researchers studying memory have found that the act of recalling information—rather than re-reading it—significantly strengthens long-term retention. This phenomenon, called the 'testing effect,' suggests that students who quiz themselves on material learn more effectively than those who simply review notes.\n\nWhat is the passage's main claim?",
        "choices": {
            "A": "Re-reading notes is the most effective study strategy.",
            "B": "Active recall through self-testing improves long-term memory more than passive review.",
            "C": "Students who take more formal exams receive higher grades.",
            "D": "Memory researchers disagree about the best way to study."
        },
        "answer": "B",
        "explanation": "The passage argues that retrieval practice (self-testing / active recall) outperforms passive re-reading for long-term retention. B accurately captures this."
    },
]

existing_ids = {q['id'] for q in data['questions']}
added = []
for q in extra:
    if q['id'] not in existing_ids:
        data['questions'].append(q)
        added.append(q['id'])

print(f"Added questions: {added}")
print(f"Final count: {len(data['questions'])}")

ids = [q['id'] for q in data['questions']]
assert len(ids) == len(set(ids)), "DUPLICATE IDs FOUND!"
print("ID uniqueness: OK")

with open('/home/user/sat-prep-app/www/data/questions.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Done!")
