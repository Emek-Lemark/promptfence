/**
 * app/api/v1/scan/file/route.js — Scan uploaded file for PII/sensitive data
 *
 * POST /api/v1/scan/file
 * Headers: X-PromptFence-Key or Authorization: Bearer pf_...
 * Body: multipart/form-data  { file: File, options?: JSON string }
 *
 * Supported: PDF, DOCX, XLSX, TXT, CSV, MD
 * Max size: 20MB
 *
 * Response: { filename, mimeType, matches, detectedTypes, action, clean }
 * Privacy: file content is never stored or logged
 */

'use strict';

import { NextResponse } from 'next/server';
import { requireApiKey } from '../../../../../lib/apiKeyAuth';
import { scanFile } from '../../../../../lib/scanner';
import { getDb } from '../../../../../lib/db';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request) {
  const auth = requireApiKey(request);
  if (auth.error) return NextResponse.json(auth.error, { status: auth.status });
  const { key, project, orgId } = auth;

  // Parse multipart form data
  let formData;
  try { formData = await request.formData(); } catch {
    return NextResponse.json({ code: 'INVALID_FORM', message: 'Request must be multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ code: 'MISSING_FILE', message: 'file field is required' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ code: 'FILE_TOO_LARGE', message: 'File must be under 20MB' }, { status: 413 });
  }

  // Parse options if provided
  let options = {};
  const optionsRaw = formData.get('options');
  if (optionsRaw) {
    try { options = JSON.parse(optionsRaw); } catch { /* ignore bad options */ }
  }

  // Read file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const mimeType = file.type || 'application/octet-stream';
  const filename = file.name || 'upload';

  // Merge project rules with per-request overrides
  const projectRules = project.rules || {};
  const scanOptions = {
    ...projectRules,
    ...(options.action_overrides || {}),
    customTerms: [
      ...(project.customTerms || []),
      ...(options.custom_terms || []),
    ],
  };

  const startMs = Date.now();
  let result;
  try {
    result = await scanFile(buffer, mimeType, scanOptions);
  } catch (err) {
    if (err.code === 'UNSUPPORTED_FILE_TYPE') {
      return NextResponse.json({
        code: 'UNSUPPORTED_FILE_TYPE',
        message: err.message,
        supportedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv', 'text/markdown'],
      }, { status: 415 });
    }
    throw err;
  }
  const latencyMs = Date.now() - startMs;

  // Log (no content stored — only metadata)
  const db = getDb();
  db.prepare(`
    INSERT INTO proxy_logs (id, org_id, project_id, key_id, provider, model, detected_types, action, prompt_tokens, latency_ms, timestamp)
    VALUES (?, ?, ?, ?, 'file_scan', ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    randomUUID(),
    orgId,
    project.id,
    key.id,
    filename,
    JSON.stringify(result.detectedTypes),
    result.action,
    result.tokenEstimate || null,
    latencyMs,
  );

  return NextResponse.json({
    filename,
    mimeType,
    action:        result.action,
    detectedTypes: result.detectedTypes,
    matches:       result.matches,
    clean:         result.clean,
    pageCount:     result.pageCount || null,
  });
}
