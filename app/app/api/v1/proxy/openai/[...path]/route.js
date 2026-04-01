/**
 * app/api/v1/proxy/openai/[...path]/route.js
 *
 * OpenAI-compatible proxy with PII scanning.
 *
 * One-line integration:
 *   const openai = new OpenAI({
 *     baseURL: 'https://app.promptfence.ai/api/v1/proxy/openai',
 *     defaultHeaders: { 'X-PromptFence-Key': 'pf_live_...' }
 *   });
 *
 * Flow:
 *   1. Authenticate PromptFence API key
 *   2. Extract text from request body (messages, prompt, input)
 *   3. Scan for PII using project rules
 *   4. If BLOCK → return 400 with explanation (never forwards)
 *   5. If ALLOW/WARN → forward to OpenAI with original Authorization header
 *   6. Stream response back to client
 *   7. Log metadata (no content stored)
 *
 * Supports: /chat/completions, /completions, /embeddings, /moderations
 * Streaming: yes (passes through chunked responses)
 */

'use strict';

import { NextResponse } from 'next/server';
import { requireApiKey } from '../../../../../../lib/apiKeyAuth';
import { scan } from '../../../../../../lib/scanner';
import { getDb } from '../../../../../../lib/db';
import { randomUUID } from 'crypto';

const OPENAI_BASE = 'https://api.openai.com/v1';

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

  // 2. Get the downstream OpenAI API key from Authorization header
  //    Client must pass: Authorization: Bearer sk-... (their OpenAI key)
  //    AND X-PromptFence-Key: pf_live_... (PromptFence key)
  const openAiAuth = request.headers.get('authorization') || '';
  if (!openAiAuth.startsWith('Bearer sk-') && !openAiAuth.startsWith('Bearer org-')) {
    return NextResponse.json({
      code: 'MISSING_OPENAI_KEY',
      message: 'Pass your OpenAI API key via Authorization: Bearer sk-... header',
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
      VALUES (?, ?, ?, ?, 'openai', ?, ?, 'BLOCK', ?, ?, datetime('now'))
    `).run(
      randomUUID(), orgId, project.id, key.id,
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

  // 6. Forward to OpenAI
  const pathSegments = params.path || [];
  const upstreamPath = pathSegments.join('/');
  const upstreamUrl = `${OPENAI_BASE}/${upstreamPath}`;

  // Build forwarding headers — strip PromptFence-specific ones
  const forwardHeaders = new Headers();
  forwardHeaders.set('authorization', openAiAuth);
  forwardHeaders.set('content-type', 'application/json');

  // Forward any OpenAI-specific headers
  const passthroughHeaders = ['openai-organization', 'openai-project', 'x-request-id'];
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
    return NextResponse.json({ code: 'UPSTREAM_ERROR', message: 'Failed to reach OpenAI API' }, { status: 502 });
  }

  const latencyMs = Date.now() - startMs;

  // 7. Log metadata
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO proxy_logs (id, org_id, project_id, key_id, provider, model, detected_types, action, prompt_tokens, latency_ms, timestamp)
      VALUES (?, ?, ?, ?, 'openai', ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      randomUUID(), orgId, project.id, key.id,
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
