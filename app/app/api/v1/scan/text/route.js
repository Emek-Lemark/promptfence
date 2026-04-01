/**
 * app/api/v1/scan/text/route.js — Scan plain text for PII/sensitive data
 *
 * POST /api/v1/scan/text
 * Headers: X-PromptFence-Key or Authorization: Bearer pf_...
 * Body: { text: string, options?: { action_overrides?: {}, custom_terms?: [] } }
 *
 * Response: { matches, detectedTypes, action, clean }
 */

'use strict';

import { NextResponse } from 'next/server';
import { requireApiKey } from '../../../../../lib/apiKeyAuth';
import { scan } from '../../../../../lib/scanner';
import { getDb } from '../../../../../lib/db';
import { randomUUID } from 'crypto';

export async function POST(request) {
  // Authenticate
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
    return NextResponse.json({ code: 'TEXT_TOO_LARGE', message: 'text must be under 500,000 characters. Use scan/file for large documents.' }, { status: 413 });
  }

  // Merge project-level rules with per-request overrides
  const projectRules = project.rules || {};
  const scanOptions = {
    ...projectRules,
    ...(options.action_overrides || {}),
    customTerms: [
      ...(project.customTerms || []),
      ...(options.custom_terms || []),
    ],
  };

  const result = scan(text, scanOptions);

  // Log to proxy_logs (no content stored)
  const db = getDb();
  db.prepare(`
    INSERT INTO proxy_logs (id, org_id, project_id, key_id, provider, model, detected_types, action, prompt_tokens, latency_ms, timestamp)
    VALUES (?, ?, ?, ?, 'direct', null, ?, ?, ?, null, datetime('now'))
  `).run(
    randomUUID(),
    orgId,
    project.id,
    key.id,
    JSON.stringify(result.detectedTypes),
    result.action,
    Math.ceil(text.length / 4), // rough token estimate
  );

  return NextResponse.json({
    action:        result.action,        // 'ALLOW' | 'WARN' | 'BLOCK'
    detectedTypes: result.detectedTypes, // e.g. ['EMAIL', 'IBAN']
    matches:       result.matches,       // [{ type, value, start, end }]
    clean:         result.clean,         // true if no PII found
  });
}
