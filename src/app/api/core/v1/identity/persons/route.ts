import { NextRequest } from 'next/server';
import { MasterIdentityEngine } from '@/lib/identity/MasterIdentityEngine';
import { ApiResponse } from '@/lib/security/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const persons = MasterIdentityEngine.getAllPersons();
    return ApiResponse.success({
      count: persons.length,
      persons,
    });
  } catch (err: any) {
    return ApiResponse.error(err.message, 'PERSONS_FETCH_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, middleName, lastName, dateOfBirth, gender, nationality, countryCode, phonePrimary, emailPrimary } = body;

    if (!firstName || !lastName || !phonePrimary || !emailPrimary) {
      return ApiResponse.badRequest('firstName, lastName, phonePrimary, and emailPrimary are required.');
    }

    const created = MasterIdentityEngine.createPerson({
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      nationality,
      countryCode,
      phonePrimary,
      emailPrimary,
    });

    return ApiResponse.created(created, `Master Identity Person [${created.identityReference}] registered successfully.`);
  } catch (err: any) {
    return ApiResponse.error(err.message, 'PERSON_CREATION_ERROR', 400);
  }
}
