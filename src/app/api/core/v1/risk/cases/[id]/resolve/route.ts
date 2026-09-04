import { NextRequest } from 'next/server';
import { FraudCaseManagementEngine } from '@/lib/risk/FraudCaseManagementEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { resolutionStatus, resolutionNotes, resolvedBy } = body;

    if (!resolutionStatus || !resolvedBy) {
      return ApiResponse.badRequest('resolutionStatus and resolvedBy are required to resolve a fraud case.');
    }

    const resolved = FraudCaseManagementEngine.resolveCase({
      caseId: params.id,
      resolutionStatus,
      resolutionNotes: resolutionNotes || 'Case reviewed and closed by risk officer.',
      resolvedBy,
    });

    return ApiResponse.success(resolved, `Fraud case ${resolved.caseReference} resolved as ${resolutionStatus}.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'FRAUD_CASE_RESOLUTION_ERROR', 400);
  }
}
