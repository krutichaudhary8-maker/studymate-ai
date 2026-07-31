"""
All prompt engineering lives here, separate from route/streaming logic.
Keeping prompts in one file makes them easy to document in the Project Report
(the assignment specifically asks for "sample prompts used").
"""


def notes_prompt(subject: str, topic: str, depth: str) -> str:
    depth_instruction = {
        "short": "Keep it very brief - key points only, under 150 words.",
        "medium": "Aim for a well-organized set of notes, around 300-400 words.",
        "detailed": "Go in-depth with examples, around 600-800 words.",
    }.get(depth, "Aim for a well-organized set of notes, around 300-400 words.")

    return f"""You are an expert {subject} tutor creating study notes for a student.

Topic: {topic}

Write clear, well-structured study notes using headings and bullet points.
{depth_instruction}
Use simple language, define any technical terms the first time they appear,
and end with a short "Key Takeaways" bullet list.
Format the output in Markdown."""


def quiz_prompt(subject: str, topic: str, num_questions: int, difficulty: str) -> str:
    return f"""You are an expert {subject} teacher creating a practice quiz.

Topic: {topic}
Difficulty: {difficulty}
Number of questions: {num_questions}

Create {num_questions} multiple-choice questions (4 options each, A-D).
For every question, clearly mark the correct answer and add a one-line explanation.

Return the quiz in this Markdown format for each question:

**Q1. <question text>**
A. <option>
B. <option>
C. <option>
D. <option>
**Answer:** <letter> - <one line explanation>
"""


def flashcards_prompt(subject: str, topic: str, count: int) -> str:
    return f"""You are creating revision flashcards for a {subject} student.

Topic: {topic}
Number of flashcards: {count}

Generate exactly {count} flashcards as short question-and-answer pairs that
test recall of key facts, definitions, or formulas from this topic.
Keep answers concise (1-2 sentences).

Return them in this exact format, one after another:

Q: <question>
A: <answer>
"""


def summary_prompt(subject: str, topic: str, source_text: str | None) -> str:
    if source_text:
        return f"""You are summarizing {subject} study notes for exam revision.

Topic: {topic}

Here are the student's notes to summarize:
---
{source_text}
---

Condense this into a short, exam-ready summary (bullet points, under 200 words).
Highlight only the most important facts, formulas, or definitions."""

    return f"""You are an expert {subject} tutor.

Topic: {topic}

Write a short, exam-ready summary of this topic in bullet points, under 200 words.
Cover only the most important facts, formulas, or definitions a student must remember."""


def planner_prompt(subjects: list[str], exam_date: str, hours_per_day: float, weak_subjects: list[str]) -> str:
    subjects_str = ", ".join(subjects)
    weak_str = ", ".join(weak_subjects) if weak_subjects else "None specified"

    return f"""You are an expert academic study planner.

Subjects to prepare: {subjects_str}
Exam date: {exam_date}
Available study time per day: {hours_per_day} hours
Weak subjects needing extra attention: {weak_str}

Create a day-by-day study plan from today until the exam date, allocating more
time to weak subjects while still covering every subject at least twice before
the exam. Include short breaks and one revision-only day near the end.

Return the plan as a Markdown table with columns: Day, Date, Subject(s), Focus/Topics, Duration."""


def eli10_prompt(topic: str, subject: str | None) -> str:
    subject_line = f" (from {subject})" if subject else ""
    return f"""Explain the topic "{topic}"{subject_line} to a curious 10-year-old.

Use simple words, a relatable everyday analogy, and short sentences.
Avoid jargon completely. Keep it under 150 words.
End with one fun fact related to the topic."""


def doubt_prompt(question: str, subject: str | None, context: str | None) -> str:
    subject_line = f"Subject: {subject}\n" if subject else ""
    context_line = f"Additional context from the student:\n{context}\n\n" if context else ""

    return f"""You are a patient, encouraging AI tutor helping a student with a doubt.

{subject_line}{context_line}Student's question: {question}

Answer clearly and directly. If the question is ambiguous, make a reasonable
assumption and state it. Use a short example if it helps understanding.
Keep the tone supportive, never condescending."""
