import { NextRequest } from 'next/server';
import { MasterIdentityEngine } from '@/lib/identity/MasterIdentityEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const orgs = MasterIdentityEngine.getAllOrganizations();
    return ApiResponse.success({
      count: orgs.length,
      organizations: orgs,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'ORGANIZATIONS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { legalName, tradingName, registrationNumber, taxIdentifier, countryCode, businessType, industry, registeredAddress } = body;

    if (!legalName || !registrationNumber || !registeredAddress) {
      return ApiResponse.badRequest('legalName, registrationNumber, and registeredAddress are required.');
    }

    const created = MasterIdentityEngine.createOrganization({
      legalName,
      tradingName,
      registrationNumber,
      taxIdentifier,
      countryCode,
      businessType,
      industry,
      registeredAddress,
    });

    return ApiResponse.created(created, `Master Identity Organization [${created.identityReference}] registered successfully.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'ORGANIZATION_CREATION_ERROR', 400);
  }
}
