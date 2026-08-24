/** Type declarations for @nova64/ai-providers. */

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ModelConfiguration {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
  anthropicVersion?: string;
  agent?: string;
}

export type ChatStreamEvent = { type: 'delta'; text: string } | { type: 'done' };

export interface Provider {
  id: string;
  displayName: string;
  kind: 'openai-compatible' | 'echo' | string;
  listModels(config?: ModelConfiguration): Promise<string[]>;
  testConnection(config?: ModelConfiguration): Promise<{ ok: boolean; error?: string }>;
  chat(
    config: ModelConfiguration,
    messages: ChatMessage[],
    options?: { signal?: AbortSignal }
  ): AsyncGenerator<ChatStreamEvent>;
}

export interface ProviderDescriptor {
  id: string;
  displayName: string;
  kind: string;
}

export function parseSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<string>;

export function createOpenAICompatibleProvider(opts?: {
  id?: string;
  displayName?: string;
  fetchImpl?: typeof fetch;
}): Provider;

export function createAnthropicProvider(opts?: {
  id?: string;
  displayName?: string;
  fetchImpl?: typeof fetch;
}): Provider;

export function createOpenCodeProvider(opts?: {
  id?: string;
  displayName?: string;
  fetchImpl?: typeof fetch;
}): Provider;

export function createEchoProvider(): Provider;

export class ProviderRegistry {
  providers: Map<string, Provider>;
  register(provider: Provider): this;
  get(id: string): Provider | null;
  has(id: string): boolean;
  list(): ProviderDescriptor[];
}

export interface ProviderPreset {
  id: string;
  label: string;
  providerId: string;
  baseUrl: string;
  defaultModel: string;
  needsKey: boolean;
  sampling: boolean;
}

export const PROVIDER_PRESETS: readonly ProviderPreset[];
export function getPreset(id: string): ProviderPreset | undefined;
