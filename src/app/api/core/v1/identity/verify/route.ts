import { NextRequest } from 'next/server';
import { VerificationProviderFramework } from '@/lib/identity/VerificationProviderFramework';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identityId, identityType, verificationType, idNumber, countryCode, dateOfBirth, companyName } = body;

    if (!identityId || !verificationType || !idNumber) {
      return ApiResponse.badRequest('identityId, verificationType, and idNumber are required.');
    }

    const evidence = await VerificationProviderFramework.verifyIdentity({
      identityId,
      identityType: identityType || 'PERSON',
      verificationType,
      idNumber,
      countryCode: countryCode || 'NG',
      dateOfBirth,
      companyName,
    });

    return ApiResponse.success(evidence, `Identity verification verified via ${evidence.providerCode}. Evidence hash: ${evidence.evidenceSha256Hash}`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'IDENTITY_VERIFICATION_ERROR', 400);
  }
}
