// GET /api/compliance/report - Download compliance audit report (CSV)
import { NextResponse } from 'next/server';
const { getDb } = require('@/lib/db');
const { requireAdmin } = require('@/lib/auth');
const { v4: uuidv4 } = require('uuid');

export async function GET(request) {
  try {
    const auth = await requireAdmin(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const db = getDb();
    const orgId = auth.user.orgId;
    const { searchParams } = new URL(request.url);

    const from = searchParams.get('from') || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const to   = searchParams.get('to')   || new Date().toISOString();

    const org = db.prepare('SELECT name, domain FROM orgs WHERE id = ?').get(orgId);

    // ── Events ────────────────────────────────────────────────────────
    const events = db.prepare(`
      SELECT e.timestamp, e.ai_domain, e.data_types, e.action,
             e.acknowledged, e.acknowledged_at, e.acknowledged_note,
             u.email as user_email
      FROM events e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.org_id = ? AND e.timestamp BETWEEN ? AND ?
      ORDER BY e.timestamp DESC
    `).all(orgId, from, to);

    // ── Team training status ──────────────────────────────────────────
    const members = db.prepare(`
      SELECT email, role, extension_installed, policy_acknowledged_at,
             block_count, warn_count, last_seen_at
      FROM users WHERE org_id = ?
      ORDER BY role DESC, email ASC
    `).all(orgId);

    // ── AI tool inventory ─────────────────────────────────────────────
    const discovered = db.prepare(`
      SELECT ai_domain, COUNT(DISTINCT user_id) as users, COUNT(*) as visits, MAX(visited_at) as last_seen
      FROM platform_visits
      WHERE org_id = ? AND visited_at BETWEEN ? AND ?
      GROUP BY ai_domain ORDER BY visits DESC
    `).all(orgId, from, to);

    const toolRows = db.prepare('SELECT * FROM ai_tools WHERE org_id = ?').all(orgId);
    const toolMap = {};
    for (const t of toolRows) toolMap[t.domain] = t;

    // ── Build CSV ─────────────────────────────────────────────────────
    const lines = [];
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const ts = new Date().toISOString();

    // Header block
    lines.push(`PromptFence Compliance Audit Report`);
    lines.push(`Organisation,${q(org?.name || org?.domain || orgId)}`);
    lines.push(`Generated,${q(ts)}`);
    lines.push(`Period,${q(from)} to ${q(to)}`);
    lines.push(``);

    // Section 1: Team AI Literacy
    lines.push(`SECTION 1 — TEAM AI LITERACY`);
    lines.push(`EU AI Act Art. 4 | ISO 27001 A.6.3 (Awareness & Training) | SOC 2 CC1.4 (Competence)`);
    lines.push(`Email,Role,Extension Installed,Policy Acknowledged,Acknowledged At,Blocks,Warnings,Last Active`);
    for (const m of members) {
      lines.push([
        q(m.email || 'anonymous'),
        q(m.role),
        m.extension_installed ? 'Yes' : 'No',
        m.policy_acknowledged_at ? 'Yes' : 'No',
        q(m.policy_acknowledged_at || ''),
        m.block_count,
        m.warn_count,
        q(m.last_seen_at || ''),
      ].join(','));
    }
    const trained = members.filter((m) => m.policy_acknowledged_at).length;
    lines.push(`Total,${members.length} members,${trained} trained (${Math.round((trained / (members.length || 1)) * 100)}%)`);
    lines.push(``);

    // Section 2: AI Events Log
    lines.push(`SECTION 2 — AI INTERACTION LOG`);
    lines.push(`EU AI Act Art. 12 | ISO 27001 A.8.16 (Monitoring) + A.8.22 (Filtering) | SOC 2 CC7.2 (System Monitoring) + CC6.7 (Data Transmission Controls)`);
    lines.push(`Timestamp,User,AI Platform,Data Types Detected,Action,Reviewed,Reviewed At,Note`);
    for (const e of events) {
      let types = e.data_types;
      try { types = JSON.parse(e.data_types).join('; '); } catch { /* keep raw */ }
      lines.push([
        q(e.timestamp),
        q(e.user_email || 'anonymous'),
        q(e.ai_domain),
        q(types),
        q(e.action),
        e.acknowledged ? 'Yes' : 'No',
        q(e.acknowledged_at || ''),
        q(e.acknowledged_note || ''),
      ].join(','));
    }
    lines.push(`Total events in period,${events.length}`);
    const blocks = events.filter((e) => e.action === 'BLOCK');
    const reviewed = blocks.filter((e) => e.acknowledged);
    lines.push(`Blocks,${blocks.length}`);
    lines.push(`Blocks reviewed,${reviewed.length}`);
    lines.push(``);

    // Section 3: AI Tool Inventory
    lines.push(`SECTION 3 — AI TOOL INVENTORY`);
    lines.push(`EU AI Act Art. 10 | ISO 27001 A.5.10 (Acceptable Use) + A.5.9 (Asset Inventory) | SOC 2 CC6.3 (Access to Data)`);
    lines.push(`AI Platform,Users,Sessions,Status,Risk Level,Last Seen,Notes`);
    for (const d of discovered) {
      const tool = toolMap[d.ai_domain] || {};
      lines.push([
        q(d.ai_domain),
        d.users,
        d.visits,
        q(tool.status || 'discovered'),
        q(tool.risk_level || 'limited'),
        q(d.last_seen || ''),
        q(tool.notes || ''),
      ].join(','));
    }
    lines.push(``);

    // Section 4: Control Framework Mapping
    lines.push(`SECTION 4 — CONTROL FRAMEWORK MAPPING`);
    lines.push(`Framework,Control ID,Control Name,PromptFence Implementation,Evidence Location`);
    const controlMap = [
      ['EU AI Act', 'Art. 4',  'AI Literacy',                     'Policy acknowledgement tracking per team member',         'Section 1 of this report'],
      ['EU AI Act', 'Art. 10', 'Data Governance',                  'AI tool inventory with approval status and risk rating',   'Section 3 of this report'],
      ['EU AI Act', 'Art. 12', 'Record Keeping',                   'Immutable event log of all AI interactions with data types','Section 2 of this report'],
      ['EU AI Act', 'Art. 14', 'Human Oversight',                  'Block event review workflow with acknowledgement and notes','Section 2 of this report'],
      ['ISO 27001', 'A.5.1',   'Policies for Information Security','Generated AI Use Policy document available in dashboard',   'PromptFence Compliance tab'],
      ['ISO 27001', 'A.5.9',   'Inventory of Assets',              'Automatic discovery and classification of AI tools used',   'Section 3 of this report'],
      ['ISO 27001', 'A.5.10',  'Acceptable Use',                   'Configurable allow/warn/block policy per data type',        'PromptFence Policy tab'],
      ['ISO 27001', 'A.6.3',   'Awareness & Training',             'Team training completion rate and policy acknowledgement',  'Section 1 of this report'],
      ['ISO 27001', 'A.8.16',  'Monitoring Activities',            'Real-time detection and logging of sensitive data in prompts','Section 2 of this report'],
      ['ISO 27001', 'A.8.22',  'Filtering of Web Services',        'Browser extension blocks/warns on AI platforms per policy', 'Section 2 of this report'],
      ['SOC 2',     'CC1.4',   'Competence',                       'AI literacy training completion tracked per employee',      'Section 1 of this report'],
      ['SOC 2',     'CC6.1',   'Logical Access Controls',          'Role-based admin access; install code required to join org','PromptFence Team tab'],
      ['SOC 2',     'CC6.3',   'Access to Data',                   'Policy-enforced restrictions on data types sent to AI',     'PromptFence Policy tab'],
      ['SOC 2',     'CC6.7',   'Data Transmission Controls',       'Prevents transmission of PII to external AI services',     'Section 2 of this report'],
      ['SOC 2',     'CC7.2',   'System Monitoring',                'Event log captures all AI interactions in the audit period','Section 2 of this report'],
    ];
    for (const row of controlMap) {
      lines.push(row.map(q).join(','));
    }
    lines.push(``);

    // Footer
    lines.push(`This report was generated automatically by PromptFence.`);
    lines.push(`It documents active technical controls for EU AI Act compliance and maps to ISO 27001:2022 Annex A and SOC 2 Trust Service Criteria.`);
    lines.push(`For questions contact: privacy@promptfence.ai`);

    const csv = lines.join('\n');

    // Log report generation
    try {
      db.prepare(`
        INSERT INTO compliance_reports (id, org_id, generated_by, period_from, period_to, generated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(uuidv4(), orgId, auth.user.userId, from, to);
    } catch { /* table may not exist yet — non-fatal */ }

    const filename = `promptfence-audit-${ts.split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Compliance report error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Server error' } },
      { status: 500 },
    );
  }
}
