"""
Thin wrapper around google-generativeai so the rest of the app never
touches the SDK directly. If we ever switch models/providers, this is
the only file that needs to change.
"""

import os
import google.generativeai as genai
from typing import Iterator

MODEL_NAME = "gemini-flash-latest"

_api_key = os.getenv("GEMINI_API_KEY")
if not _api_key:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. Copy .env.example to .env and add your key "
        "(get one free at https://aistudio.google.com)."
    )

genai.configure(api_key=_api_key)
_model = genai.GenerativeModel(MODEL_NAME)


def stream_generate(prompt: str) -> Iterator[str]:
    """
    Yields text chunks as they arrive from Gemini, so the frontend can
    render the response progressively instead of waiting for the full reply.
    """
    response = _model.generate_content(prompt, stream=True)
    for chunk in response:
        # Some chunks (e.g. safety-filtered ones) may have no .text
        if chunk.text:
            yield chunk.text
