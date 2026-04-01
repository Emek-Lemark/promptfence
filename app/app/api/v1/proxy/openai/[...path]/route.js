/**
 * app/api/v1/proxy/openai/[...path]/route.js
 *
 * OpenAI-compatible proxy with PII scanning.
 * Works with ANY OpenAI-compatible provider — not just OpenAI.
 *
 * One-line integration (OpenAI):
 *   const openai = new OpenAI({
 *     baseURL: 'https://app.promptfence.ai/api/v1/proxy/openai',
 *     defaultHeaders: { 'X-PromptFence-Key': 'pf_live_...' }
 *   });
 *
 * Other providers — pass X-Upstream-Base-URL header:
 *   Grok:     X-Upstream-Base-URL: https://api.x.ai/v1
 *   Gemini:   X-Upstream-Base-URL: https://generativelanguage.googleapis.com/v1beta/openai
 *   Mistral:  X-Upstream-Base-URL: https://api.mistral.ai/v1
 *   Groq:     X-Upstream-Base-URL: https://api.groq.com/openai/v1
 *   Together: X-Upstream-Base-URL: https://api.together.xyz/v1
 *
 * Flow:
 *   1. Authenticate PromptFence API key
 *   2. Extract text from request body (messages, prompt, input)
 *   3. Scan for PII using project rules
 *   4. If BLOCK → return 400 with explanation (never forwards)
 *   5. If ALLOW/WARN → forward to upstream with original Authorization header
 *   6. Stream response back to client
 *   7. Log metadata (no content stored)
 *
 * Supports: /chat/completions, /completions, /embeddings, /moderations
 * Streaming: yes (passes through chunked responses)
 * Note: For Anthropic Claude, use /api/v1/proxy/anthropic instead.
 */

'use strict';

import { NextResponse } from 'next/server';
import { requireApiKey } from '../../../../../../lib/apiKeyAuth';
import { scan } from '../../../../../../lib/scanner';
import { getDb } from '../../../../../../lib/db';
import { randomUUID } from 'crypto';

const OPENAI_BASE = 'https://api.openai.com/v1';

// Allowlist of known OpenAI-compatible upstream base URLs
const ALLOWED_UPSTREAM_HOSTS = new Set([
  'api.openai.com',
  'api.x.ai',                              // Grok
  'generativelanguage.googleapis.com',     // Gemini
  'api.mistral.ai',                        // Mistral
  'api.groq.com',                          // Groq
  'api.together.xyz',                      // Together AI
  'api.cohere.com',                        // Cohere
  'api.perplexity.ai',                     // Perplexity
  'api.deepseek.com',                      // DeepSeek
  'openrouter.ai',                         // OpenRouter
]);

// Extract text content from OpenAI request body for scanning
function extractTextFromBody(body) {
  const parts = [];

  // chat/completions: messages array
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      if (typeof msg.content === 'string') {
        parts.push(msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text') parts.push(part.text);
        }
      }
    }
  }

  // completions: prompt (string or array)
  if (typeof body.prompt === 'string') parts.push(body.prompt);
  if (Array.isArray(body.prompt)) parts.push(...body.prompt.filter(p => typeof p === 'string'));

  // embeddings / moderations: input
  if (typeof body.input === 'string') parts.push(body.input);
  if (Array.isArray(body.input)) parts.push(...body.input.filter(p => typeof p === 'string'));

  return parts.join('\n');
}

async function handler(request, { params }) {
  const startMs = Date.now();

  // 1. Authenticate PromptFence key
  const auth = requireApiKey(request);
  if (auth.error) return NextResponse.json(auth.error, { status: auth.status });
  const { key, project, orgId } = auth;

  // 2. Resolve upstream base URL
  //    Default: OpenAI. Override with X-Upstream-Base-URL for other OpenAI-compatible providers.
  let upstreamBase = OPENAI_BASE;
  const customUpstream = request.headers.get('x-upstream-base-url');
  if (customUpstream) {
    let parsedHost;
    try {
      parsedHost = new URL(customUpstream).hostname;
    } catch {
      return NextResponse.json({ code: 'INVALID_UPSTREAM', message: 'X-Upstream-Base-URL is not a valid URL' }, { status: 400 });
    }
    if (!ALLOWED_UPSTREAM_HOSTS.has(parsedHost)) {
      return NextResponse.json({
        code: 'UPSTREAM_NOT_ALLOWED',
        message: `Upstream host '${parsedHost}' is not in the allowlist. Contact support to add it.`,
      }, { status: 400 });
    }
    upstreamBase = customUpstream.replace(/\/$/, '');
  }

  // 3. Get the downstream API key from Authorization header
  //    Client must pass: Authorization: Bearer <provider-api-key>
  //    AND X-PromptFence-Key: pf_live_... (PromptFence key)
  const upstreamAuth = request.headers.get('authorization') || '';
  if (!upstreamAuth.startsWith('Bearer ')) {
    return NextResponse.json({
      code: 'MISSING_UPSTREAM_KEY',
      message: 'Pass your upstream provider API key via Authorization: Bearer <key> header',
    }, { status: 400 });
  }

  // 3. Parse request body
  let body;
  const contentType = request.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (isJson) {
    try { body = await request.json(); } catch {
      return NextResponse.json({ code: 'INVALID_JSON', message: 'Invalid JSON body' }, { status: 400 });
    }
  } else {
    // Forward non-JSON requests (e.g. audio, images) without scanning
    body = null;
  }

  // 4. Scan extracted text
  let scanResult = { action: 'ALLOW', detectedTypes: [], matches: [], clean: true };
  let textScanned = '';

  if (body) {
    textScanned = extractTextFromBody(body);
    if (textScanned) {
      const projectRules = project.rules || {};
      const scanOptions = {
        ...projectRules,
        customTerms: project.customTerms || [],
      };
      scanResult = scan(textScanned, scanOptions);
    }
  }

  // 5. Handle BLOCK
  if (scanResult.action === 'BLOCK') {
    const latencyMs = Date.now() - startMs;

    // Log the block (no content stored)
    const db = getDb();
    db.prepare(`
      INSERT INTO proxy_logs (id, org_id, project_id, key_id, provider, model, detected_types, action, prompt_tokens, latency_ms, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'BLOCK', ?, ?, datetime('now'))
    `).run(
      randomUUID(), orgId, project.id, key.id,
      customUpstream ? new URL(upstreamBase).hostname.split('.')[1] || 'custom' : 'openai',
      body?.model || null,
      JSON.stringify(scanResult.detectedTypes),
      Math.ceil(textScanned.length / 4),
      latencyMs,
    );

    // Trigger webhook if configured
    if (project.webhookUrl) {
      triggerWebhook(project, orgId, 'scan.blocked', {
        action: 'BLOCK',
        detected_types: scanResult.detectedTypes,
        model: body?.model,
      }).catch(() => {}); // fire-and-forget
    }

    return NextResponse.json({
      error: {
        code:    'PROMPTFENCE_BLOCK',
        message: `Request blocked: sensitive data detected (${scanResult.detectedTypes.join(', ')})`,
        types:   scanResult.detectedTypes,
      }
    }, { status: 400 });
  }

  // 6. Forward to upstream provider
  const pathSegments = params.path || [];
  const upstreamPath = pathSegments.join('/');
  const upstreamUrl = `${upstreamBase}/${upstreamPath}`;

  // Build forwarding headers — strip PromptFence-specific ones
  const forwardHeaders = new Headers();
  forwardHeaders.set('authorization', upstreamAuth);
  forwardHeaders.set('content-type', 'application/json');

  // Forward provider-specific headers
  const passthroughHeaders = ['openai-organization', 'openai-project', 'x-request-id', 'anthropic-version'];
  for (const h of passthroughHeaders) {
    const v = request.headers.get(h);
    if (v) forwardHeaders.set(h, v);
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: body ? JSON.stringify(body) : null,
    });
  } catch (err) {
    return NextResponse.json({ code: 'UPSTREAM_ERROR', message: `Failed to reach upstream provider at ${upstreamBase}` }, { status: 502 });
  }

  const latencyMs = Date.now() - startMs;

  // 7. Log metadata
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO proxy_logs (id, org_id, project_id, key_id, provider, model, detected_types, action, prompt_tokens, latency_ms, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      randomUUID(), orgId, project.id, key.id,
      customUpstream ? new URL(upstreamBase).hostname.split('.')[1] || 'custom' : 'openai',
      body?.model || null,
      JSON.stringify(scanResult.detectedTypes),
      scanResult.action,
      Math.ceil(textScanned.length / 4),
      latencyMs,
    );
  } catch { /* don't fail the request for logging errors */ }

  // 8. Trigger WARN webhook if configured
  if (scanResult.action === 'WARN' && project.webhookUrl) {
    triggerWebhook(project, orgId, 'scan.warned', {
      action: 'WARN',
      detected_types: scanResult.detectedTypes,
      model: body?.model,
    }).catch(() => {});
  }

  // 9. Stream response back (preserves SSE streaming for chat completions)
  const responseHeaders = new Headers();
  responseHeaders.set('content-type', upstreamResponse.headers.get('content-type') || 'application/json');

  // Add PromptFence metadata headers
  responseHeaders.set('x-promptfence-action', scanResult.action);
  if (scanResult.detectedTypes.length > 0) {
    responseHeaders.set('x-promptfence-detected', scanResult.detectedTypes.join(','));
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

// Webhook delivery (fire-and-forget)
async function triggerWebhook(project, orgId, eventType, data) {
  if (!project.webhookUrl) return;

  const payload = {
    event: eventType,
    project_id: project.id,
    org_id: orgId,
    timestamp: new Date().toISOString(),
    data,
  };

  try {
    const db = getDb();
    const deliveryId = randomUUID();

    const resp = await fetch(project.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-PromptFence-Event': eventType },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    db.prepare(`
      INSERT INTO webhook_deliveries (id, org_id, project_id, event_type, payload, response_status, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(deliveryId, orgId, project.id, eventType, JSON.stringify(payload), resp.status);
  } catch (err) {
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO webhook_deliveries (id, org_id, project_id, event_type, payload, failed_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(randomUUID(), orgId, project.id, eventType, JSON.stringify(payload));
    } catch { /* best effort */ }
  }
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const PATCH  = handler;
export const DELETE = handler;
