import { NextRequest, NextResponse } from 'next/server';
import { VaultManagementEngine } from '@/lib/cash/VaultManagementEngine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const engine = VaultManagementEngine.getInstance();

    const res = engine.authorizeVaultAccess({
      vaultId: id,
      makerCustodian: body.makerCustodian,
      checkerCustodian: body.checkerCustodian,
      supervisor: body.supervisor,
      accessReason: body.accessReason || 'Standard Operations Access',
      authorizedAmount: body.authorizedAmount,
    });

    return NextResponse.json({
      ...res,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
