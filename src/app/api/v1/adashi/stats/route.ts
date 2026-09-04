// =============================================================================
// File: src/app/api/v1/adashi/stats/route.ts
// =============================================================================

import { NextResponse } from 'next/server';
import { AdashiStore } from '@/lib/adashi/AdashiStore';

export async function GET() {
  try {
    const stats = AdashiStore.getSummaryStats();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: stats,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retrieve stats' },
      { status: 500 }
    );
  }
}
