// Health check endpoint for deployment monitoring
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Lazy-load db to avoid build-time env var access
    const { getDb } = require('@/lib/db');

    // Test database connection with simple query
    const db = getDb();
    const result = db.prepare('SELECT 1 as test').get();

    if (result && result.test === 1) {
      return NextResponse.json({
        ok: true,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { ok: false, error: 'Database check failed' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
