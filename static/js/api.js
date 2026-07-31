// Talks to the StudyMate AI FastAPI backend (see studymate-backend/README.md).
// Empty string = same origin. The backend now serves this frontend itself
// (single container), so this works locally and on AWS without changes.
const API_BASE = '';
async function streamInto(endpoint, payload, targetEl, opts = {}) {
  targetEl.textContent = '';

  // Loading indicator — shows until the first chunk arrives
  const loader = document.createElement('span');
  loader.className = 'writing-indicator';
  loader.innerHTML = 'Writing<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>';
  targetEl.appendChild(loader);

  const cursor = document.createElement('span');
  cursor.className = 'cursor';

  let fullText = '';
  let firstChunk = true;

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok || !response.body) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      let chunk = decoder.decode(value, { stream: true });

      if (chunk.includes('data:')) {
        chunk = chunk
          .split('\n')
          .map(line => (line.startsWith('data:') ? line.slice(5).trimStart() : line))
          .join('\n');
      }

      if (firstChunk) {
        loader.remove();
        targetEl.appendChild(cursor);
        firstChunk = false;
      }

      fullText += chunk;
      cursor.insertAdjacentText('beforebegin', chunk);
      targetEl.scrollTop = targetEl.scrollHeight;
      if (opts.onChunk) opts.onChunk(chunk, fullText);
    }
  } catch (err) {
    loader.remove();
    cursor.remove();
    const errNote = document.createElement('span');
    errNote.style.color = 'var(--margin-line)';
    errNote.textContent = `\n\nCouldn't reach the backend (${err.message}). Is it running at ${API_BASE}?`;
    targetEl.appendChild(errNote);
    if (opts.onError) opts.onError(err);
    return '';
  }

  loader.remove();
  cursor.remove();
  if (opts.onDone) opts.onDone(fullText);
  return fullText;
}