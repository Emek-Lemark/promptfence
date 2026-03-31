// POST /api/setup - Complete onboarding setup
// GET /api/setup - Check setup status
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { requireAdmin } = require('@/lib/auth');

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const db = getDb();
    const org = db.prepare('SELECT * FROM orgs WHERE id = ?').get(auth.user.orgId);
    const config = db.prepare('SELECT * FROM org_config WHERE org_id = ?').get(auth.user.orgId);

    return NextResponse.json({
      setupCompleted: Boolean(org?.setup_completed),
      orgName: org?.name,
      industry: org?.industry,
      domain: org?.domain,
      installCode: org?.install_code,
      preset: config?.preset,
    });
  } catch (error) {
    console.error('Setup GET error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { step, data } = body;

    const db = getDb();

    if (step === 'company') {
      const { name, industry } = data;
      db.prepare(`
        UPDATE orgs SET name = ?, industry = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(name || null, industry || null, auth.user.orgId);

    } else if (step === 'policy') {
      const { preset, rules, customTerms } = data;
      const validActions = ['ALLOW', 'WARN', 'BLOCK'];
      const updates = [];
      const params = [];

      if (preset) { updates.push('preset = ?'); params.push(preset); }
      if (rules) {
        if (rules.EMAIL && validActions.includes(rules.EMAIL)) { updates.push('action_email = ?'); params.push(rules.EMAIL); }
        if (rules.PHONE && validActions.includes(rules.PHONE)) { updates.push('action_phone = ?'); params.push(rules.PHONE); }
        if (rules.IBAN && validActions.includes(rules.IBAN)) { updates.push('action_iban = ?'); params.push(rules.IBAN); }
        if (rules.CREDIT_CARD && validActions.includes(rules.CREDIT_CARD)) { updates.push('action_credit_card = ?'); params.push(rules.CREDIT_CARD); }
        if (rules.ADDRESS && validActions.includes(rules.ADDRESS)) { updates.push('action_address = ?'); params.push(rules.ADDRESS); }
        if (rules.PASSWORD && validActions.includes(rules.PASSWORD)) { updates.push('action_password = ?'); params.push(rules.PASSWORD); }
      }
      if (Array.isArray(customTerms)) {
        updates.push('custom_terms = ?');
        params.push(JSON.stringify(customTerms));
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(auth.user.orgId);
        db.prepare(`UPDATE org_config SET ${updates.join(', ')} WHERE org_id = ?`).run(...params);
      }

    } else if (step === 'platforms') {
      const { platforms, approvedAiUrl } = data;
      const platformMap = {
        chatgpt: 'ai_chatgpt', claude: 'ai_claude', gemini: 'ai_gemini',
        perplexity: 'ai_perplexity', copilot: 'ai_copilot', mistral: 'ai_mistral',
        slack: 'ai_slack', gmail: 'ai_gmail', notion: 'ai_notion',
        linear: 'ai_linear', outlook: 'ai_outlook', other: 'ai_other'
      };

      const updates = [];
      const params = [];
      if (platforms) {
        for (const [key, col] of Object.entries(platformMap)) {
          updates.push(`${col} = ?`);
          params.push(platforms[key] ? 1 : 0);
        }
      }
      if (approvedAiUrl !== undefined) {
        updates.push('approved_ai_url = ?');
        params.push(approvedAiUrl || null);
      }
      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(auth.user.orgId);
        db.prepare(`UPDATE org_config SET ${updates.join(', ')} WHERE org_id = ?`).run(...params);
      }

    } else if (step === 'complete') {
      db.prepare(`
        UPDATE orgs SET setup_completed = 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(auth.user.orgId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Setup POST error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } }, { status: 500 });
  }
}
