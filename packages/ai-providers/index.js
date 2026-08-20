/**
 * @nova64/ai-providers — host-neutral multi-provider LLM abstraction.
 *
 * Provider registry + an OpenAI-compatible streaming provider (works with OpenAI
 * and local endpoints: Ollama, LM Studio, MLX-LM, vLLM) + an offline echo
 * provider for testing. Normalized streaming events: { type:'delta', text } and
 * { type:'done' }. No React / Electron / VS Code / browser globals — the AI host
 * (Electron/VS Code) runs these outside any renderer.
 */
export { parseSse } from './src/sse.js';
export { createOpenAICompatibleProvider } from './src/openai-compatible.js';
export { createEchoProvider } from './src/echo.js';
export { ProviderRegistry } from './src/registry.js';
