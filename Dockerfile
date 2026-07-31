FROM python:3.13-slim

WORKDIR /app

# Install Python deps first so this layer is cached unless requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend app code and the built/static frontend
COPY app ./app
COPY static ./static

# GEMINI_API_KEY and ALLOWED_ORIGINS are supplied at runtime (docker run -e / AWS env vars),
# never baked into the image.
ENV PORT=8000
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
