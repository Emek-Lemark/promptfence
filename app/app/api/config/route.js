// GET /api/config - Extension fetches org config
// POST /api/config - Admin updates org config (admin-only, sole write path)
import { NextResponse } from 'next/server';
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('@/lib/db');
const { requireAdmin, requireInstallCode } = require('@/lib/auth');

// GET - Extension fetches config
export async function GET(request) {
  try {
    // Check for admin Bearer token first
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const auth = await requireAdmin(request);
      if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }

      const db = getDb();
      const config = db.prepare('SELECT * FROM org_config WHERE org_id = ?').get(auth.user.orgId);

      if (!config) {
        return NextResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Config not found' } },
          { status: 500 }
        );
      }

      return NextResponse.json({
        orgId: auth.user.orgId,
        userId: auth.user.userId,
        aiTools: {
          chatgpt: Boolean(config.ai_chatgpt),
          claude: Boolean(config.ai_claude),
          gemini: Boolean(config.ai_gemini),
          other: Boolean(config.ai_other)
        },
        rules: {
          EMAIL: config.action_email,
          PHONE: config.action_phone,
          IBAN: config.action_iban
        },
        approvedAiUrl: config.approved_ai_url
      });
    }

    // Otherwise, require install code (extension auth)
    const auth = await requireInstallCode(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const db = getDb();
    const config = db.prepare('SELECT * FROM org_config WHERE org_id = ?').get(auth.org.id);

    if (!config) {
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Config not found' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orgId: auth.org.id,
      userId: auth.user.id,
      aiTools: {
        chatgpt: Boolean(config.ai_chatgpt),
        claude: Boolean(config.ai_claude),
        gemini: Boolean(config.ai_gemini),
        other: Boolean(config.ai_other)
      },
      rules: {
        EMAIL: config.action_email,
        PHONE: config.action_phone,
        IBAN: config.action_iban
      },
      approvedAiUrl: config.approved_ai_url
    });
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}

// POST - Admin updates config (ONLY config write endpoint)
export async function POST(request) {
  try {
    // Require admin auth - this is the ONLY way to write config
    const auth = await requireAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { aiTools, rules, approvedAiUrl } = body;

    // Validate rules
    const validActions = ['WARN', 'BLOCK'];
    if (rules) {
      if (rules.EMAIL && !validActions.includes(rules.EMAIL)) {
        return NextResponse.json(
          { error: { code: 'INVALID_REQUEST', message: 'EMAIL action must be WARN or BLOCK' } },
          { status: 400 }
        );
      }
      if (rules.PHONE && !validActions.includes(rules.PHONE)) {
        return NextResponse.json(
          { error: { code: 'INVALID_REQUEST', message: 'PHONE action must be WARN or BLOCK' } },
          { status: 400 }
        );
      }
      if (rules.IBAN && !validActions.includes(rules.IBAN)) {
        return NextResponse.json(
          { error: { code: 'INVALID_REQUEST', message: 'IBAN action must be WARN or BLOCK' } },
          { status: 400 }
        );
      }
    }

    const db = getDb();

    // Get current config
    let config = db.prepare('SELECT * FROM org_config WHERE org_id = ?').get(auth.user.orgId);

    if (!config) {
      // Create config if doesn't exist
      const configId = uuidv4();
      db.prepare('INSERT INTO org_config (id, org_id) VALUES (?, ?)').run(configId, auth.user.orgId);
      config = db.prepare('SELECT * FROM org_config WHERE id = ?').get(configId);
    }

    // Update config
    const updates = [];
    const params = [];

    if (aiTools) {
      if (aiTools.chatgpt !== undefined) {
        updates.push('ai_chatgpt = ?');
        params.push(aiTools.chatgpt ? 1 : 0);
      }
      if (aiTools.claude !== undefined) {
        updates.push('ai_claude = ?');
        params.push(aiTools.claude ? 1 : 0);
      }
      if (aiTools.gemini !== undefined) {
        updates.push('ai_gemini = ?');
        params.push(aiTools.gemini ? 1 : 0);
      }
      if (aiTools.other !== undefined) {
        updates.push('ai_other = ?');
        params.push(aiTools.other ? 1 : 0);
      }
    }

    if (rules) {
      if (rules.EMAIL) {
        updates.push('action_email = ?');
        params.push(rules.EMAIL);
      }
      if (rules.PHONE) {
        updates.push('action_phone = ?');
        params.push(rules.PHONE);
      }
      if (rules.IBAN) {
        updates.push('action_iban = ?');
        params.push(rules.IBAN);
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

    return NextResponse.json({
      success: true,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update config error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}
