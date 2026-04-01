/**
 * @promptfence/sdk
 *
 * PII scanning SDK for AI applications.
 *
 * @example
 * ```typescript
 * import { PromptFence } from '@promptfence/sdk';
 *
 * const pf = new PromptFence({ apiKey: 'pf_live_...' });
 *
 * // Scan before sending to AI
 * const result = await pf.scan('My email is alice@company.com');
 * if (result.action === 'BLOCK') throw new Error('PII detected');
 *
 * // Or use the OpenAI-compatible proxy (zero config)
 * const openai = new OpenAI({
 *   baseURL: pf.proxyUrl,
 *   defaultHeaders: { 'X-PromptFence-Key': 'pf_live_...' }
 * });
 * ```
 */

export interface ScanMatch {
  type: string;
  value: string;
  start: number;
  end: number;
}

export interface ScanResult {
  action: 'ALLOW' | 'WARN' | 'BLOCK';
  detectedTypes: string[];
  matches: ScanMatch[];
  clean: boolean;
}

export interface RedactResult {
  original_length: number;
  redacted: string;
  detectedTypes: string[];
  redactedCount: number;
  clean: boolean;
}

export interface FileScanResult extends ScanResult {
  filename: string;
  mimeType: string;
  pageCount?: number;
}

export interface ScanOptions {
  /** Override action for specific types: { EMAIL: 'ALLOW', IBAN: 'BLOCK' } */
  action_overrides?: Record<string, 'ALLOW' | 'WARN' | 'BLOCK'>;
  /** Additional custom terms to scan for */
  custom_terms?: string[];
}

export interface RedactOptions extends ScanOptions {
  /** Replacement mode: 'tag' (default) | 'blank' | 'hash' */
  replacement?: 'tag' | 'blank' | 'hash';
}

export interface PromptFenceConfig {
  /** Your API key: pf_live_... or pf_test_... */
  apiKey: string;
  /** Override the base URL (default: https://app.promptfence.ai) */
  baseUrl?: string;
}

export class PromptFenceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'PromptFenceError';
  }
}

export class PromptFence {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  /** Base URL for the OpenAI-compatible proxy */
  readonly proxyUrl: string;

  constructor(config: PromptFenceConfig) {
    if (!config.apiKey) throw new Error('apiKey is required');
    if (!config.apiKey.startsWith('pf_live_') && !config.apiKey.startsWith('pf_test_')) {
      throw new Error('apiKey must start with pf_live_ or pf_test_');
    }
    this.apiKey  = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://app.promptfence.ai').replace(/\/$/, '');
    this.proxyUrl = `${this.baseUrl}/api/v1/proxy/openai`;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        'X-PromptFence-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });

    const data = await res.json() as any;

    if (!res.ok) {
      throw new PromptFenceError(
        data?.message || `Request failed with status ${res.status}`,
        data?.code || 'API_ERROR',
        res.status,
      );
    }

    return data as T;
  }

  /**
   * Scan text for PII and sensitive data.
   *
   * @example
   * const result = await pf.scan('Contact: alice@corp.com, IBAN: GB33BUKB20201555555555');
   * // { action: 'BLOCK', detectedTypes: ['EMAIL', 'IBAN'], ... }
   */
  async scan(text: string, options?: ScanOptions): Promise<ScanResult> {
    return this.request<ScanResult>('/scan/text', {
      method: 'POST',
      body: JSON.stringify({ text, options }),
    });
  }

  /**
   * Scan a file (PDF, DOCX, XLSX, TXT, CSV) for PII.
   * Accepts a File object (browser) or Buffer + filename (Node.js).
   *
   * @example Node.js
   * const buffer = fs.readFileSync('report.pdf');
   * const result = await pf.scanFile(buffer, 'report.pdf', 'application/pdf');
   */
  async scanFile(
    file: File | Buffer,
    filenameOrMime?: string,
    mimeType?: string,
    options?: ScanOptions,
  ): Promise<FileScanResult> {
    const formData = new FormData();

    if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
      formData.append('file', file as Blob);
    } else {
      // Node.js Buffer
      const blob = new Blob([file as Buffer], { type: mimeType || 'application/octet-stream' });
      formData.append('file', blob, filenameOrMime || 'upload');
    }

    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    const url = `${this.baseUrl}/api/v1/scan/file`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-PromptFence-Key': this.apiKey },
      body: formData,
    });

    const data = await res.json() as any;
    if (!res.ok) {
      throw new PromptFenceError(data?.message || `Scan failed`, data?.code || 'SCAN_ERROR', res.status);
    }
    return data as FileScanResult;
  }

  /**
   * Redact PII from text and return the cleaned version.
   *
   * @example
   * const result = await pf.redact('Email me at alice@corp.com');
   * // { redacted: 'Email me at [EMAIL REDACTED]', redactedCount: 1, ... }
   */
  async redact(text: string, options?: RedactOptions): Promise<RedactResult> {
    return this.request<RedactResult>('/redact', {
      method: 'POST',
      body: JSON.stringify({ text, options }),
    });
  }

  /**
   * Check if text is safe to send to an AI (returns false if action is BLOCK).
   * Convenience wrapper around scan().
   *
   * @example
   * if (!await pf.isSafe(userPrompt)) {
   *   return res.status(400).json({ error: 'Sensitive data detected' });
   * }
   */
  async isSafe(text: string, options?: ScanOptions): Promise<boolean> {
    const result = await this.scan(text, options);
    return result.action !== 'BLOCK';
  }

  /**
   * Express/Next.js middleware — scans req.body.messages or req.body.prompt.
   * Blocks the request if PII is found according to project rules.
   *
   * @example Express
   * app.post('/chat', pf.middleware(), async (req, res) => { ... });
   *
   * @example Next.js Route Handler
   * export const POST = pf.nextMiddleware(async (request) => { ... });
   */
  middleware(options?: ScanOptions) {
    return async (req: any, res: any, next: any) => {
      try {
        const body = req.body || {};
        const parts: string[] = [];

        if (Array.isArray(body.messages)) {
          for (const msg of body.messages) {
            if (typeof msg.content === 'string') parts.push(msg.content);
          }
        }
        if (typeof body.prompt === 'string') parts.push(body.prompt);
        if (typeof body.input === 'string') parts.push(body.input);

        const text = parts.join('\n');
        if (!text) return next();

        const result = await this.scan(text, options);

        // Attach scan result to request for downstream handlers
        req.promptFence = result;

        if (result.action === 'BLOCK') {
          return res.status(400).json({
            error: {
              code: 'PROMPTFENCE_BLOCK',
              message: `Sensitive data detected: ${result.detectedTypes.join(', ')}`,
              types: result.detectedTypes,
            }
          });
        }

        next();
      } catch (err) {
        // Don't block on PromptFence errors — fail open (configurable)
        console.error('[PromptFence] Middleware error:', err);
        next();
      }
    };
  }
}

export default PromptFence;
