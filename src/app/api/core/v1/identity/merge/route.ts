import { NextRequest } from 'next/server';
import { MasterIdentityEngine } from '@/lib/identity/MasterIdentityEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { primaryIdentityId, duplicateIdentityId, reason, reviewedBy, approvedBy } = body;

    if (!primaryIdentityId || !duplicateIdentityId || !reason || !reviewedBy || !approvedBy) {
      return ApiResponse.badRequest('primaryIdentityId, duplicateIdentityId, reason, reviewedBy, and approvedBy are required.');
    }

    MasterIdentityEngine.mergeIdentities(primaryIdentityId, duplicateIdentityId, reason);

    return ApiResponse.success({
      primaryIdentityId,
      duplicateIdentityId,
      status: 'MERGED',
      mergedAt: new Date().toISOString(),
      approvedBy,
    }, 'Duplicate identity successfully merged with alias retained.');
  } catch (err: any) {
    return ApiResponse.error(err.message, 'IDENTITY_MERGE_ERROR', 400);
  }
}
