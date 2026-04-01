#!/usr/bin/env node
/**
 * @promptfence/mcp — MCP server for AI agent tool-calling workflows
 *
 * Tools:
 *   scan_text    — scan text for PII, returns action + detected types
 *   scan_file    — scan file URL or base64 content
 *   redact_text  — redact PII from text, returns cleaned version
 *   check_policy — check if text violates org policy (boolean)
 *
 * Usage in claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "promptfence": {
 *       "command": "npx",
 *       "args": ["@promptfence/mcp"],
 *       "env": { "PROMPTFENCE_API_KEY": "pf_live_..." }
 *     }
 *   }
 * }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

const API_KEY  = process.env.PROMPTFENCE_API_KEY || '';
const BASE_URL = (process.env.PROMPTFENCE_BASE_URL || 'https://app.promptfence.ai').replace(/\/$/, '');
const API_BASE = `${BASE_URL}/api/v1`;

if (!API_KEY) {
  console.error('[PromptFence MCP] PROMPTFENCE_API_KEY environment variable is required');
  process.exit(1);
}

async function pfFetch(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PromptFence-Key': API_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

const TOOLS: Tool[] = [
  {
    name: 'scan_text',
    description: 'Scan text for PII and sensitive data. Returns action (ALLOW/WARN/BLOCK), detected types, and match positions. Use this before sending user-provided text to any AI model or storing it.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to scan for PII',
        },
        custom_terms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional terms to block (e.g. company names, project codenames)',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'redact_text',
    description: 'Remove PII from text and return a clean version safe to use with AI. Replaces detected PII with [TYPE REDACTED] tags.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to redact PII from',
        },
        replacement: {
          type: 'string',
          enum: ['tag', 'blank', 'hash'],
          description: 'Replacement mode: tag=[EMAIL REDACTED], blank=████████, hash=deterministic prefix',
          default: 'tag',
        },
        custom_terms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional terms to redact',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'check_policy',
    description: 'Check if text violates data protection policy. Returns a simple boolean — use this as a gate before processing user input.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to check against policy',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'scan_and_redact',
    description: 'In one call: scan text for PII, then return both the scan result AND a redacted version. Most efficient when you need both.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The text to scan and redact',
        },
        custom_terms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional terms to block',
        },
      },
      required: ['text'],
    },
  },
];

const server = new Server(
  { name: 'promptfence', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'scan_text') {
      const result = await pfFetch('/scan/text', {
        text: args?.text,
        options: { custom_terms: args?.custom_terms },
      }) as any;

      const summary = result.clean
        ? '✅ No PII detected. Text is safe to use.'
        : `${result.action === 'BLOCK' ? '🚫 BLOCKED' : '⚠️ WARNING'}: Found ${result.detectedTypes.join(', ')} (${result.matches.length} match${result.matches.length !== 1 ? 'es' : ''})`;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            action: result.action,
            clean: result.clean,
            detectedTypes: result.detectedTypes,
            matchCount: result.matches?.length || 0,
            matches: result.matches?.map((m: any) => ({
              type: m.type,
              position: `${m.start}-${m.end}`,
            })),
            summary,
          }, null, 2),
        }],
        isError: result.action === 'BLOCK',
      };
    }

    if (name === 'redact_text') {
      const result = await pfFetch('/redact', {
        text: args?.text,
        options: {
          replacement: args?.replacement || 'tag',
          custom_terms: args?.custom_terms,
        },
      }) as any;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            redacted: result.redacted,
            redactedCount: result.redactedCount,
            detectedTypes: result.detectedTypes,
            clean: result.clean,
          }, null, 2),
        }],
      };
    }

    if (name === 'check_policy') {
      const result = await pfFetch('/scan/text', { text: args?.text }) as any;
      const allowed = result.action !== 'BLOCK';

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            allowed,
            action: result.action,
            reason: allowed
              ? 'Text complies with policy'
              : `Policy violation: ${result.detectedTypes.join(', ')} detected`,
            detectedTypes: result.detectedTypes,
          }, null, 2),
        }],
        isError: !allowed,
      };
    }

    if (name === 'scan_and_redact') {
      // Run both in parallel
      const [scanResult, redactResult] = await Promise.all([
        pfFetch('/scan/text', {
          text: args?.text,
          options: { custom_terms: args?.custom_terms },
        }),
        pfFetch('/redact', {
          text: args?.text,
          options: { custom_terms: args?.custom_terms },
        }),
      ]) as [any, any];

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            scan: {
              action: scanResult.action,
              clean: scanResult.clean,
              detectedTypes: scanResult.detectedTypes,
              matchCount: scanResult.matches?.length || 0,
            },
            redacted: redactResult.redacted,
            redactedCount: redactResult.redactedCount,
          }, null, 2),
        }],
        isError: scanResult.action === 'BLOCK',
      };
    }

    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };

  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `PromptFence error: ${err.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[PromptFence MCP] Server running — connected to', BASE_URL);
}

main().catch(err => {
  console.error('[PromptFence MCP] Fatal error:', err);
  process.exit(1);
});
