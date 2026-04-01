/**
 * app/api/v1/proxy/anthropic/[...path]/route.js
 *
 * Anthropic Claude proxy with PII scanning.
 * Handles Claude's native message format (different from OpenAI).
 *
 * One-line integration:
 *   import Anthropic from '@anthropic-ai/sdk';
 *   const client = new Anthropic({
 *     apiKey: process.env.ANTHROPIC_API_KEY,
 *     baseURL: 'https://app.promptfence.ai/api/v1/proxy/anthropic',
 *     defaultHeaders: { 'X-PromptFence-Key': 'pf_live_...' },
 *   });
 *
 * Claude message format scanned:
 *   - body.system (string)
 *   - body.messages[].content (string or array of text blocks)
 *
 * Supports: /v1/messages, /v1/messages/batches
 * Streaming: yes (passes through SSE stream)
 */

'use strict';

import { NextResponse } from 'next/server';
import { requireApiKey } from '../../../../../../lib/apiKeyAuth';
import { scan } from '../../../../../../lib/scanner';
import { getDb } from '../../../../../../lib/db';
import { randomUUID } from 'crypto';

const ANTHROPIC_BASE = 'https://api.anthropic.com';
const ANTHROPIC_VERSION = '2023-06-01';

// Extract text from Anthropic message format
function extractTextFromAnthropicBody(body) {
  const parts = [];

  // System prompt
  if (typeof body.system === 'string') {
    parts.push(body.system);
  } else if (Array.isArray(body.system)) {
    for (const block of body.system) {
      if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text);
    }
  }

  // Messages
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      if (typeof msg.content === 'string') {
        parts.push(msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text);
        }
      }
    }
  }

  return parts.join('\n');
}

async function handler(request, { params }) {
  const startMs = Date.now();

  // 1. Authenticate PromptFence key
  const auth = requireApiKey(request);
  if (auth.error) return NextResponse.json(auth.error, { status: auth.status });
  const { key, project, orgId } = auth;

  // 2. Get the Anthropic API key
  //    Client passes: Authorization: Bearer sk-ant-... OR x-api-key: sk-ant-...
  const bearerAuth = request.headers.get('authorization') || '';
  const xApiKey = request.headers.get('x-api-key') || '';
  const anthropicKey = xApiKey || (bearerAuth.startsWith('Bearer ') ? bearerAuth.slice(7) : '');

  if (!anthropicKey) {
    return NextResponse.json({
      type: 'error',
      error: {
        type: 'authentication_error',
        message: 'Pass your Anthropic API key via x-api-key or Authorization: Bearer sk-ant-... header',
      },
    }, { status: 401 });
  }

  // 3. Parse request body
  let body;
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try { body = await request.json(); } catch {
      return NextResponse.json({
        type: 'error',
        error: { type: 'invalid_request_error', message: 'Invalid JSON body' },
      }, { status: 400 });
    }
  } else {
    body = null;
  }

  // 4. Scan extracted text
  let scanResult = { action: 'ALLOW', detectedTypes: [], matches: [], clean: true };
  let textScanned = '';

  if (body) {
    textScanned = extractTextFromAnthropicBody(body);
    if (textScanned) {
      const projectRules = project.rules || {};
      scanResult = scan(textScanned, {
        ...projectRules,
        customTerms: project.customTerms || [],
      });
    }
  }

  // 5. Handle BLOCK — return in Anthropic error format
  if (scanResult.action === 'BLOCK') {
    const latencyMs = Date.now() - startMs;

    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO proxy_logs (id, org_id, project_id, key_id, provider, model, detected_types, action, prompt_tokens, latency_ms, timestamp)
        VALUES (?, ?, ?, ?, 'anthropic', ?, ?, 'BLOCK', ?, ?, datetime('now'))
      `).run(
        randomUUID(), orgId, project.id, key.id,
        body?.model || null,
        JSON.stringify(scanResult.detectedTypes),
        Math.ceil(textScanned.length / 4),
        latencyMs,
      );
    } catch { /* best effort */ }

    if (project.webhookUrl) {
      triggerWebhook(project, orgId, 'scan.blocked', {
        action: 'BLOCK',
        detected_types: scanResult.detectedTypes,
        model: body?.model,
      }).catch(() => {});
    }

    return NextResponse.json({
      type: 'error',
      error: {
        type: 'invalid_request_error',
        code: 'PROMPTFENCE_BLOCK',
        message: `Request blocked: sensitive data detected (${scanResult.detectedTypes.join(', ')})`,
        promptfence: {
          action: 'BLOCK',
          detected_types: scanResult.detectedTypes,
        },
      },
    }, { status: 400 });
  }

  // 6. Forward to Anthropic
  const pathSegments = params.path || [];
  const upstreamPath = pathSegments.join('/');
  const upstreamUrl = `${ANTHROPIC_BASE}/${upstreamPath}`;

  const forwardHeaders = new Headers();
  forwardHeaders.set('x-api-key', anthropicKey);
  forwardHeaders.set('content-type', 'application/json');
  forwardHeaders.set('anthropic-version', request.headers.get('anthropic-version') || ANTHROPIC_VERSION);

  // Forward beta headers if present
  const betaHeader = request.headers.get('anthropic-beta');
  if (betaHeader) forwardHeaders.set('anthropic-beta', betaHeader);

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: body ? JSON.stringify(body) : null,
    });
  } catch (err) {
    return NextResponse.json({
      type: 'error',
      error: { type: 'api_error', message: 'Failed to reach Anthropic API' },
    }, { status: 502 });
  }

  const latencyMs = Date.now() - startMs;

  // 7. Log metadata
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO proxy_logs (id, org_id, project_id, key_id, provider, model, detected_types, action, prompt_tokens, latency_ms, timestamp)
      VALUES (?, ?, ?, ?, 'anthropic', ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      randomUUID(), orgId, project.id, key.id,
      body?.model || null,
      JSON.stringify(scanResult.detectedTypes),
      scanResult.action,
      Math.ceil(textScanned.length / 4),
      latencyMs,
    );
  } catch { /* don't fail the request for logging errors */ }

  if (scanResult.action === 'WARN' && project.webhookUrl) {
    triggerWebhook(project, orgId, 'scan.warned', {
      action: 'WARN',
      detected_types: scanResult.detectedTypes,
      model: body?.model,
    }).catch(() => {});
  }

  // 8. Stream response back
  const responseHeaders = new Headers();
  responseHeaders.set('content-type', upstreamResponse.headers.get('content-type') || 'application/json');
  responseHeaders.set('x-promptfence-action', scanResult.action);
  if (scanResult.detectedTypes.length > 0) {
    responseHeaders.set('x-promptfence-detected', scanResult.detectedTypes.join(','));
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

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
    const resp = await fetch(project.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-PromptFence-Event': eventType },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    db.prepare(`
      INSERT INTO webhook_deliveries (id, org_id, project_id, event_type, payload, response_status, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(randomUUID(), orgId, project.id, eventType, JSON.stringify(payload), resp.status);
  } catch {
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
