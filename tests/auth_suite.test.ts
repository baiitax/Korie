import { AuthService } from '../src/lib/auth/authService';

async function runAuthValidationSuite() {
  console.log('================================================================');
  console.log('KORIEPAY TIER-1 AUTHENTICATION VALIDATION SUITE');
  console.log('================================================================\n');

  const authService = AuthService.getInstance();
  let passedTests = 0;
  let totalTests = 0;

  function assert(testName: string, condition: boolean, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}: ${details || 'Assertion failed'}`);
    }
  }

  // TEST 1: Password Strength Evaluator
  console.log('--- TEST GROUP 1: Password Security & Entropy ---');
  const weakPass = authService.evaluatePasswordStrength('short');
  assert('Rejects short/weak password', weakPass.score <= 1 && weakPass.label === 'Weak');

  const strongPass = authService.evaluatePasswordStrength('KoriePay@2026!Secure');
  assert('Accepts high entropy strong password', strongPass.score >= 3 && strongPass.label === 'Strong' || strongPass.label === 'Good');

  // TEST 2: Phone Normalization
  console.log('\n--- TEST GROUP 2: Multi-Jurisdiction Phone Normalization ---');
  const ngPhone1 = authService.normalizePhone('08031234567', 'NG');
  assert('Normalizes Nigerian local 080... format to +2348031234567', ngPhone1 === '+2348031234567');

  const nePhone1 = authService.normalizePhone('90123456', 'NE');
  assert('Normalizes Nigerien local format to +22790123456', nePhone1 === '+22790123456');

  // TEST 3: Masking Utilities
  console.log('\n--- TEST GROUP 3: Data Minimization & Privacy Masking ---');
  const maskedEmail = authService.maskEmail('ibrahim.bello@koriepay.ng');
  assert('Masks email without leaking full user identity', maskedEmail.startsWith('i') && maskedEmail.includes('***') && maskedEmail.endsWith('@koriepay.ng'));

  const maskedPhone = authService.maskPhone('+2348099887766');
  assert('Masks phone number preserving only jurisdiction and last 4 digits', maskedPhone === '+234 ••• ••• 7766');

  // TEST 4: Role-Based Dashboard Resolution
  console.log('\n--- TEST GROUP 4: Server-Authoritative Role Resolution ---');
  assert('Routes CUSTOMER to /customer', authService.resolveDashboardRoute('CUSTOMER', 'VERIFIED') === '/customer');
  assert('Routes AGENT to /agent', authService.resolveDashboardRoute('AGENT', 'VERIFIED') === '/agent');
  assert('Routes AGGREGATOR to /aggregator', authService.resolveDashboardRoute('AGGREGATOR', 'VERIFIED') === '/aggregator');
  assert('Routes MERCHANT to /merchant', authService.resolveDashboardRoute('MERCHANT', 'VERIFIED') === '/merchant');
  assert('Routes ADMIN to /admin', authService.resolveDashboardRoute('ADMIN', 'VERIFIED') === '/admin');
  assert('Routes COMPLIANCE to /compliance', authService.resolveDashboardRoute('COMPLIANCE', 'VERIFIED') === '/compliance');
  assert('Routes SUPPORT to /support', authService.resolveDashboardRoute('SUPPORT', 'VERIFIED') === '/support');
  assert('Routes DEVELOPER to /developers', authService.resolveDashboardRoute('DEVELOPER', 'VERIFIED') === '/developers');
  assert('Redirects unverified KYC customer to /customer/kyc', authService.resolveDashboardRoute('CUSTOMER', 'UNVERIFIED') === '/customer/kyc');

  // TEST 5: Customer Registration
  console.log('\n--- TEST GROUP 5: Registration Validation ---');
  const regResult = await authService.registerCustomer({
    country: 'NG',
    firstName: 'Amina',
    lastName: 'Bello',
    email: 'amina.bello@example.ng',
    phone: '08030000001',
    password: 'KoriePay@2026!Secure',
    agreeTerms: true,
    agreeAml: true,
  });
  assert('Successfully creates new customer record with OTP requirement', regResult.success && regResult.requiresOtp === true);

  const missingConsent = await authService.registerCustomer({
    country: 'NE',
    firstName: 'Amadou',
    lastName: 'Seydou',
    email: 'amadou.seydou@example.ne',
    phone: '90000001',
    password: 'KoriePay@2026!Secure',
    agreeTerms: false,
    agreeAml: true,
  });
  assert('Rejects registration when terms consent is missing', missingConsent.success === false && missingConsent.errorCode === 'CONSENT_REQUIRED');

  // TEST 6: Authentication & MFA Step-Up
  console.log('\n--- TEST GROUP 6: Authentication & Step-Up Logic ---');
  const custLogin = await authService.authenticate({
    identifier: 'amina.bello@example.ng',
    password: 'password',
    selectedRoleOverride: 'CUSTOMER',
  });
  assert('Authenticates customer and provides direct dashboard route', custLogin.success && custLogin.redirectTo === '/customer');

  const adminLogin = await authService.authenticate({
    identifier: 'super.admin@koriepay.com',
    password: 'password',
    selectedRoleOverride: 'ADMIN',
  });
  assert('Forces MFA step-up challenge for administrative login', adminLogin.success && adminLogin.requiresMfa === true && adminLogin.redirectTo === '/mfa');

  // TEST 7: Rate Limiting & Lockout
  console.log('\n--- TEST GROUP 7: Rate Limiting & Anti-Brute Force Protection ---');
  const testId = 'brute.force.test@koriepay.com';
  for (let i = 0; i < 4; i++) {
    authService.recordFailedAttempt(testId);
  }
  const fifthAttempt = authService.recordFailedAttempt(testId);
  assert('Locks account after 5 consecutive failed attempts', fifthAttempt.isNowLocked === true);

  const lockedAuth = await authService.authenticate({
    identifier: testId,
    password: 'any-password',
  });
  assert('Rejects authentication attempts while locked with generic security message', lockedAuth.success === false && lockedAuth.errorCode === 'ACCOUNT_LOCKED');

  console.log('\n================================================================');
  console.log(`AUTH TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAuthValidationSuite();
