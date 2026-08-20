/**
 * Parse a Server-Sent-Events byte stream into `data:` payload strings.
 * Works with any web ReadableStream (Electron/node fetch response body).
 * @param {ReadableStream<Uint8Array>} stream
 * @returns {AsyncGenerator<string>} each yielded value is one `data:` payload
 */
export async function* parseSse(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep;
      // SSE events are separated by a blank line (\n\n).
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        for (const line of event.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) yield trimmed.slice(5).trim();
        }
      }
    }
  } finally {
    reader.releaseLock?.();
  }
}
