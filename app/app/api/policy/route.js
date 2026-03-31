// GET /api/policy - Full policy for admin dashboard
// POST /api/policy - Update policy (admin only)
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { requireAdmin } = require('@/lib/auth');

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const db = getDb();
    const config = db.prepare('SELECT * FROM org_config WHERE org_id = ?').get(auth.user.orgId);
    if (!config) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Config not found' } }, { status: 404 });
    }

    return NextResponse.json({
      preset: config.preset,
      rules: {
        EMAIL: config.action_email,
        PHONE: config.action_phone,
        IBAN: config.action_iban,
        CREDIT_CARD: config.action_credit_card,
        ADDRESS: config.action_address,
        PASSWORD: config.action_password,
      },
      platforms: {
        chatgpt: Boolean(config.ai_chatgpt),
        claude: Boolean(config.ai_claude),
        gemini: Boolean(config.ai_gemini),
        perplexity: Boolean(config.ai_perplexity),
        copilot: Boolean(config.ai_copilot),
        mistral: Boolean(config.ai_mistral),
        slack: Boolean(config.ai_slack),
        gmail: Boolean(config.ai_gmail),
        notion: Boolean(config.ai_notion),
        linear: Boolean(config.ai_linear),
        outlook: Boolean(config.ai_outlook),
        other: Boolean(config.ai_other),
      },
      customTerms: JSON.parse(config.custom_terms || '[]'),
      approvedAiUrl: config.approved_ai_url,
      fileUploadWarning: Boolean(config.file_upload_warning),
    });
  } catch (error) {
    console.error('Policy GET error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { preset, rules, platforms, customTerms, approvedAiUrl, fileUploadWarning } = body;
    const validActions = ['ALLOW', 'WARN', 'BLOCK'];

    const db = getDb();
    const updates = [];
    const params = [];

    if (preset) { updates.push('preset = ?'); params.push(preset); }

    if (rules) {
      const ruleMap = { EMAIL: 'action_email', PHONE: 'action_phone', IBAN: 'action_iban', CREDIT_CARD: 'action_credit_card', ADDRESS: 'action_address', PASSWORD: 'action_password' };
      for (const [key, col] of Object.entries(ruleMap)) {
        if (rules[key] && validActions.includes(rules[key])) {
          updates.push(`${col} = ?`); params.push(rules[key]);
        }
      }
    }

    if (platforms) {
      const platMap = { chatgpt: 'ai_chatgpt', claude: 'ai_claude', gemini: 'ai_gemini', perplexity: 'ai_perplexity', copilot: 'ai_copilot', mistral: 'ai_mistral', slack: 'ai_slack', gmail: 'ai_gmail', notion: 'ai_notion', linear: 'ai_linear', outlook: 'ai_outlook', other: 'ai_other' };
      for (const [key, col] of Object.entries(platMap)) {
        if (platforms[key] !== undefined) {
          updates.push(`${col} = ?`); params.push(platforms[key] ? 1 : 0);
        }
      }
    }

    if (Array.isArray(customTerms)) {
      // Validate: max 50 terms, each max 100 chars
      const cleaned = customTerms.filter(t => typeof t === 'string' && t.trim()).slice(0, 50).map(t => t.trim().slice(0, 100));
      updates.push('custom_terms = ?'); params.push(JSON.stringify(cleaned));
    }

    if (approvedAiUrl !== undefined) {
      updates.push('approved_ai_url = ?'); params.push(approvedAiUrl || null);
    }

    if (fileUploadWarning !== undefined) {
      updates.push('file_upload_warning = ?'); params.push(fileUploadWarning ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(auth.user.orgId);
      db.prepare(`UPDATE org_config SET ${updates.join(', ')} WHERE org_id = ?`).run(...params);
    }

    return NextResponse.json({ success: true, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Policy POST error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }, { status: 500 });
  }
}
