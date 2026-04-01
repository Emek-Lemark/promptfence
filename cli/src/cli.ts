#!/usr/bin/env node
/**
 * @promptfence/cli — Scan files for PII in CI/CD pipelines
 *
 * Usage:
 *   pf scan <file>                   — scan a single file
 *   pf scan <dir>                    — scan all files in directory
 *   pf scan <file> --format json     — JSON output (for CI)
 *   pf scan <file> --fail-on warn    — exit 1 on WARN or BLOCK
 *   pf scan <file> --fail-on block   — exit 1 only on BLOCK (default)
 *   pf redact <file>                 — redact file and print to stdout
 *   pf redact <file> -o clean.txt    — write redacted version to file
 *
 * Environment variables:
 *   PROMPTFENCE_API_KEY   — your pf_live_... or pf_test_... key
 *   PROMPTFENCE_BASE_URL  — override API base URL
 *
 * GitHub Actions example:
 *   - name: Scan for PII
 *     run: npx @promptfence/cli scan ./prompts --fail-on block
 *     env:
 *       PROMPTFENCE_API_KEY: ${{ secrets.PROMPTFENCE_API_KEY }}
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

const API_KEY  = process.env.PROMPTFENCE_API_KEY || '';
const BASE_URL = (process.env.PROMPTFENCE_BASE_URL || 'https://app.promptfence.ai').replace(/\/$/, '');
const API_BASE = `${BASE_URL}/api/v1`;

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.md', '.csv', '.pdf', '.docx', '.xlsx']);

// ── ANSI colors ──────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
};

const useColor = process.stdout.isTTY;
const col = (code: string, s: string) => useColor ? `${code}${s}${c.reset}` : s;

// ── CLI parsing ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const command = args[0];
const target  = args[1];

function flag(name: string, defaultVal?: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? (args[idx + 1] || defaultVal) : defaultVal;
}
function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getMimeType(filepath: string): string {
  const ext = extname(filepath).toLowerCase();
  const map: Record<string, string> = {
    '.pdf':  'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt':  'text/plain',
    '.csv':  'text/csv',
    '.md':   'text/markdown',
  };
  return map[ext] || 'text/plain';
}

async function scanFile(filepath: string): Promise<any> {
  const buffer  = readFileSync(filepath);
  const mime    = getMimeType(filepath);
  const name    = basename(filepath);

  const formData = new FormData();
  const blob = new Blob([buffer], { type: mime });
  formData.append('file', blob, name);

  const res = await fetch(`${API_BASE}/scan/file`, {
    method: 'POST',
    headers: { 'X-PromptFence-Key': API_KEY },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json() as any;
    throw new Error(err?.message || `API error ${res.status}`);
  }
  return res.json();
}

async function redactFile(filepath: string): Promise<string> {
  const text = readFileSync(filepath, 'utf-8');
  const res = await fetch(`${API_BASE}/redact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PromptFence-Key': API_KEY },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json() as any;
  return data.redacted;
}

function collectFiles(targetPath: string): string[] {
  const stat = statSync(targetPath);
  if (stat.isFile()) return [targetPath];
  if (stat.isDirectory()) {
    const files: string[] = [];
    for (const f of readdirSync(targetPath, { recursive: true }) as string[]) {
      const full = join(targetPath, f);
      if (statSync(full).isFile() && SUPPORTED_EXTENSIONS.has(extname(f).toLowerCase())) {
        files.push(full);
      }
    }
    return files;
  }
  return [];
}

function printUsage() {
  console.log(`
${col(c.bold + c.cyan, 'PromptFence CLI')} — PII scanner for AI pipelines

${col(c.bold, 'Usage:')}
  pf scan <file|dir>                Scan file or directory
  pf redact <file>                  Redact PII and print result
  pf redact <file> -o <output>      Write redacted file

${col(c.bold, 'Options:')}
  --format json       Output JSON instead of human-readable
  --fail-on block     Exit 1 if any file is BLOCKED (default)
  --fail-on warn      Exit 1 if any file is WARNED or BLOCKED
  --fail-on never     Always exit 0 (useful for reporting only)
  -o <file>           Output file (redact command)

${col(c.bold, 'Environment:')}
  PROMPTFENCE_API_KEY    Your pf_live_... or pf_test_... key
  PROMPTFENCE_BASE_URL   Override API base (default: https://app.promptfence.ai)

${col(c.bold, 'Examples:')}
  pf scan ./training-data
  pf scan report.pdf --format json
  pf redact messy.txt -o clean.txt
  pf scan . --fail-on warn   # strict CI mode
`);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printUsage();
    process.exit(0);
  }

  if (!API_KEY) {
    console.error(col(c.red, '✗ PROMPTFENCE_API_KEY is not set'));
    console.error('  Export it: export PROMPTFENCE_API_KEY=pf_live_...');
    process.exit(1);
  }

  if (!target) {
    console.error(col(c.red, `✗ Missing file/directory argument`));
    printUsage();
    process.exit(1);
  }

  if (!existsSync(target)) {
    console.error(col(c.red, `✗ Path not found: ${target}`));
    process.exit(1);
  }

  const format   = flag('format', 'human');
  const failOn   = flag('fail-on', 'block') as 'block' | 'warn' | 'never';
  const outFile  = flag('o');
  const isJson   = format === 'json';

  // ── REDACT ──────────────────────────────────────────────────────────────
  if (command === 'redact') {
    try {
      const redacted = await redactFile(target);
      if (outFile) {
        writeFileSync(outFile, redacted, 'utf-8');
        if (!isJson) console.log(col(c.green, `✓ Redacted output written to ${outFile}`));
      } else {
        process.stdout.write(redacted);
      }
      process.exit(0);
    } catch (err: any) {
      console.error(col(c.red, `✗ Redact failed: ${err.message}`));
      process.exit(1);
    }
  }

  // ── SCAN ──────────────────────────────────────────────────────────────
  if (command === 'scan') {
    const files = collectFiles(target);

    if (files.length === 0) {
      console.error(col(c.yellow, `⚠ No supported files found in ${target}`));
      console.error(`  Supported: ${[...SUPPORTED_EXTENSIONS].join(', ')}`);
      process.exit(0);
    }

    const results: Array<{ file: string; result: any; error?: string }> = [];
    let exitCode = 0;

    for (const filepath of files) {
      if (!isJson) {
        process.stdout.write(`  ${col(c.dim, 'Scanning')} ${filepath}... `);
      }

      try {
        const result = await scanFile(filepath);
        results.push({ file: filepath, result });

        const actionColor = result.action === 'BLOCK' ? c.red : result.action === 'WARN' ? c.yellow : c.green;
        const icon = result.action === 'BLOCK' ? '🚫' : result.action === 'WARN' ? '⚠️' : '✅';

        if (!isJson) {
          console.log(`${icon} ${col(actionColor, result.action)}${result.detectedTypes.length > 0 ? ` — ${result.detectedTypes.join(', ')}` : ''}`);
        }

        // Check exit code
        if (failOn === 'block' && result.action === 'BLOCK') exitCode = 1;
        if (failOn === 'warn' && (result.action === 'BLOCK' || result.action === 'WARN')) exitCode = 1;
      } catch (err: any) {
        results.push({ file: filepath, result: null, error: err.message });
        if (!isJson) console.log(col(c.red, `✗ Error: ${err.message}`));
        exitCode = 1;
      }
    }

    if (isJson) {
      console.log(JSON.stringify({
        summary: {
          total: results.length,
          blocked: results.filter(r => r.result?.action === 'BLOCK').length,
          warned:  results.filter(r => r.result?.action === 'WARN').length,
          allowed: results.filter(r => r.result?.action === 'ALLOW').length,
          errors:  results.filter(r => r.error).length,
        },
        results: results.map(r => ({
          file: r.file,
          action: r.result?.action,
          detectedTypes: r.result?.detectedTypes || [],
          matchCount: r.result?.matches?.length || 0,
          error: r.error || null,
        })),
      }, null, 2));
    } else {
      // Summary
      const blocked = results.filter(r => r.result?.action === 'BLOCK').length;
      const warned  = results.filter(r => r.result?.action === 'WARN').length;
      console.log('');
      console.log(col(c.bold, `Results: ${files.length} file${files.length !== 1 ? 's' : ''} scanned`));
      if (blocked > 0) console.log(col(c.red, `  ${blocked} blocked`));
      if (warned > 0)  console.log(col(c.yellow, `  ${warned} warned`));
      if (blocked === 0 && warned === 0) console.log(col(c.green, `  All clear — no PII detected`));
    }

    process.exit(exitCode);
  }

  console.error(col(c.red, `✗ Unknown command: ${command}`));
  printUsage();
  process.exit(1);
}

main().catch(err => {
  console.error(col(c.red, `✗ Unexpected error: ${err.message}`));
  process.exit(1);
});
