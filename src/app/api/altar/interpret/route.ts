import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserPrompt, parseInterpretRequest } from './prompt';

/**
 * Relay for Altar's AI readings. The browser sends the draw; this route adds
 * the catalog meanings, asks a model and streams the reading back as plain text.
 *
 * Environment:
 *   ALTAR_AI_PROVIDER   "anthropic" | "ollama" (default: anthropic when
 *                       ANTHROPIC_API_KEY is set, else ollama when OLLAMA_URL is set)
 *   ANTHROPIC_API_KEY   Claude API key
 *   ALTAR_CLAUDE_MODEL  default claude-opus-5-5
 *   ALTAR_CLAUDE_EFFORT low | medium | high (default medium)
 *   OLLAMA_URL          e.g. http://localhost:11434
 *   OLLAMA_MODEL        default llama3.1
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Provider = 'anthropic' | 'ollama';

function resolveProvider(): Provider | null {
  const explicit = process.env.ALTAR_AI_PROVIDER;
  if (explicit === 'anthropic' || explicit === 'ollama') return explicit;
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OLLAMA_URL) return 'ollama';
  return null;
}

// ── Rate limit ────────────────────────────────────────────────────────────────
// In-memory, per server instance: enough to stop a stuck button or casual abuse
// from running up the bill, not a substitute for a shared store under load.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) if (!times.some(t => now - t < WINDOW_MS)) hits.delete(key);
  }
  return false;
}

// ── Providers ─────────────────────────────────────────────────────────────────

type Emit = (text: string) => void;

async function streamClaude(userPrompt: string, emit: Emit, signal: AbortSignal) {
  const client = new Anthropic();
  const effort = process.env.ALTAR_CLAUDE_EFFORT;
  const stream = client.beta.messages.stream(
    {
      model: process.env.ALTAR_CLAUDE_MODEL || 'claude-opus-5-5',
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: effort === 'low' || effort === 'high' ? effort : 'medium' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    },
    { signal },
  );
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') emit(event.delta.text);
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') emit('\n\nThe oracle is silent on this one. Try rephrasing your message.');
}

async function streamOllama(userPrompt: string, emit: Emit, signal: AbortSignal) {
  const base = (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'llama3.1',
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`ollama responded ${res.status}`);
  // Ollama streams newline-delimited JSON objects.
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const chunk = JSON.parse(line) as { message?: { content?: string }; error?: string };
      if (chunk.error) throw new Error(chunk.error);
      if (chunk.message?.content) emit(chunk.message.content);
    }
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const provider = resolveProvider();
  if (!provider) return NextResponse.json({ error: 'AI readings are not configured on this server' }, { status: 503 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
  if (rateLimited(ip)) return NextResponse.json({ error: 'The oracle needs a rest. Try again in a few minutes.' }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const parsed = parseInterpretRequest(body);
  if (typeof parsed === 'string') return NextResponse.json({ error: parsed }, { status: 400 });
  const userPrompt = buildUserPrompt(parsed);
  if (!userPrompt) return NextResponse.json({ error: 'unknown card, rune or few' }, { status: 400 });

  const encoder = new TextEncoder();
  const abort = new AbortController();
  req.signal.addEventListener('abort', () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit: Emit = text => controller.enqueue(encoder.encode(text));
      try {
        if (provider === 'anthropic') await streamClaude(userPrompt, emit, abort.signal);
        else await streamOllama(userPrompt, emit, abort.signal);
      } catch (err) {
        if (!abort.signal.aborted) {
          console.error('[altar/interpret]', provider, err);
          emit(err instanceof Anthropic.RateLimitError
            ? '\n\n[The oracle is busy. Try again shortly.]'
            : '\n\n[The reading was interrupted.]');
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
