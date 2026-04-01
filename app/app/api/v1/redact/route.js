/**
 * app/api/v1/redact/route.js — Redact PII from text, returning clean version
 *
 * POST /api/v1/redact
 * Headers: X-PromptFence-Key or Authorization: Bearer pf_...
 * Body: { text: string, options?: { custom_terms?: [], replacement?: 'tag'|'blank'|'hash' } }
 *
 * Response: { original_length, redacted, detectedTypes, redactedCount }
 *
 * replacement modes:
 *   'tag'   (default) → [EMAIL REDACTED], [IBAN REDACTED]
 *   'blank' → replaced with ████████
 *   'hash'  → replaced with SHA-256 prefix (for consistency checks)
 */

'use strict';

import { NextResponse } from 'next/server';
import { requireApiKey } from '../../../../lib/apiKeyAuth';
import { scan, redact } from '../../../../lib/scanner';
import { getDb } from '../../../../lib/db';
import { createHash, randomUUID } from 'crypto';

export async function POST(request) {
  const auth = requireApiKey(request);
  if (auth.error) return NextResponse.json(auth.error, { status: auth.status });
  const { key, project, orgId } = auth;

  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: 'Request body must be valid JSON' }, { status: 400 });
  }

  const { text, options = {} } = body;
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ code: 'MISSING_TEXT', message: 'text field (string) is required' }, { status: 400 });
  }
  if (text.length > 500_000) {
    return NextResponse.json({ code: 'TEXT_TOO_LARGE', message: 'text must be under 500,000 characters' }, { status: 413 });
  }

  const replacement = options.replacement || 'tag'; // 'tag' | 'blank' | 'hash'

  const projectRules = project.rules || {};
  const scanOptions = {
    ...projectRules,
    ...(options.action_overrides || {}),
    customTerms: [
      ...(project.customTerms || []),
      ...(options.custom_terms || []),
    ],
  };

  const scanResult = scan(text, scanOptions);

  // Apply redaction based on mode
  let redacted;
  if (replacement === 'blank') {
    // Replace with uniform block characters
    redacted = redact(text, scanResult.matches, () => '████████');
  } else if (replacement === 'hash') {
    // Replace with deterministic hash prefix (useful for dedup)
    redacted = redact(text, scanResult.matches, (match) => {
      const h = createHash('sha256').update(match.value).digest('hex').slice(0, 8);
      return `[${match.type}:${h}]`;
    });
  } else {
    // Default 'tag' mode — uses scanner's built-in redact
    redacted = scanResult.redacted;
  }

  // Log
  const db = getDb();
  db.prepare(`
    INSERT INTO proxy_logs (id, org_id, project_id, key_id, provider, model, detected_types, action, prompt_tokens, latency_ms, timestamp)
    VALUES (?, ?, ?, ?, 'redact', null, ?, 'ALLOW', ?, null, datetime('now'))
  `).run(
    randomUUID(),
    orgId,
    project.id,
    key.id,
    JSON.stringify(scanResult.detectedTypes),
    Math.ceil(text.length / 4),
  );

  return NextResponse.json({
    original_length: text.length,
    redacted,
    detectedTypes:  scanResult.detectedTypes,
    redactedCount:  scanResult.matches.length,
    clean:          scanResult.clean,
  });
}
