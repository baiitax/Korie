import { NextRequest, NextResponse } from 'next/server';
import { VaultManagementEngine } from '@/lib/cash/VaultManagementEngine';

export async function GET(req: NextRequest) {
  try {
    const engine = VaultManagementEngine.getInstance();
    const vaults = engine.getVaults();

    return NextResponse.json({
      success: true,
      data: vaults,
      count: vaults.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
