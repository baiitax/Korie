/**
 * Compliance Command Center — centralized DEMO data service.
 *
 * Single source of truth for all sample records shown across the portal demo.
 * Every dataset is clearly demo/sample; pages consume them through the portal
 * context, so this module can be replaced by live API adapters without touching UI.
 *
 * Non-negotiable: XOF first, NGN second, no USD customer balances, "Coris Bank"
 * (never "Koris"), masked PII, no real secrets.
 */
import { ComplianceOfficer } from '@/types/compliance';
import {
  AmlRule,
  KybDirector,
  PortalAccount,
  PortalActivityItem,
  PortalAlert,
  PortalApproval,
  PortalAuditEntry,
  PortalCase,
  PortalCustomer,
  PortalDoc,
  PortalEscalation,
  PortalHealthService,
  PortalIntegration,
  PortalKybApplication,
  PortalKycApplication,
  PortalReportDef,
  PortalTask,
  PortalTxn,
  ScreeningMatch,
  ScreeningSummary,
  Watchlist,
} from '@/types/compliancePortal';

export const PORTAL_DEMO_MODE = true;

/* ---------- time helpers (relative to "now" so demo never ages) ---------- */
const MIN = 60_000;
const ago = (mins: number) => new Date(Date.now() - mins * MIN).toISOString();
const later = (mins: number) => new Date(Date.now() + mins * MIN).toISOString();
const daysAgo = (d: number) => ago(d * 24 * 60);

/* ---------- platform totals (illustrative demo volumes) ---------- */
export const PLATFORM_TOTALS = {
  totalCustomers: 24582,
  pendingKyc: 182,
  highRiskCustomers: 37,
  openAmlAlerts: 46,
  criticalAmlAlerts: 12,
  openCases: 12,
  escalatedCases: 3,
  screeningMatches: 8,
  screeningRequireReview: 2,
  riskDistribution: [
    { level: 'LOW', count: 17426 },
    { level: 'MEDIUM', count: 5162 },
    { level: 'HIGH', count: 1475 },
    { level: 'CRITICAL', count: 519 },
  ] as { level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; count: number }[],
  kycVolume: { submitted: 3641, pending: 182, verified: 2984, rejected: 306, expired: 41, manualReview: 128 },
  monitoredToday: 14820,
} as const;

/* ================================================================== */
/* Officers                                                            */
/* ================================================================== */
export const MOCK_PORTAL_OFFICERS: ComplianceOfficer[] = [
  { id: 'OFF-001', fullName: 'Amina Bello', email: 'amina.bello@koriepay.internal', role: 'HEAD_OF_COMPLIANCE', jurisdiction: 'NE', country: 'NE', assignedCasesCount: 2, status: 'ACTIVE', lastActiveAt: ago(4) },
  { id: 'OFF-002', fullName: 'Mamadou Ousmane', email: 'mamadou.ousmane@koriepay.internal', role: 'MLRO', jurisdiction: 'NE', country: 'NE', assignedCasesCount: 3, status: 'ACTIVE', lastActiveAt: ago(9) },
  { id: 'OFF-003', fullName: 'Chukwuemeka Nnamdi', email: 'chukwuemeka.nnamdi@koriepay.internal', role: 'COMPLIANCE_MANAGER', jurisdiction: 'NG', country: 'NG', assignedCasesCount: 4, status: 'ACTIVE', lastActiveAt: ago(22) },
  { id: 'OFF-004', fullName: 'Fatima Garba', email: 'fatima.garba@koriepay.internal', role: 'KYC_ANALYST', jurisdiction: 'NG', country: 'NG', assignedCasesCount: 0, status: 'ACTIVE', lastActiveAt: ago(1) },
  { id: 'OFF-005', fullName: 'Salifou Maiga', email: 'salifou.maiga@koriepay.internal', role: 'AML_ANALYST', jurisdiction: 'NE', country: 'NE', assignedCasesCount: 5, status: 'ACTIVE', lastActiveAt: ago(31) },
  { id: 'OFF-006', fullName: 'Zainab Yusuf', email: 'zainab.yusuf@koriepay.internal', role: 'KYB_ANALYST', jurisdiction: 'NG', country: 'NG', assignedCasesCount: 0, status: 'ACTIVE', lastActiveAt: ago(48) },
  { id: 'OFF-007', fullName: 'Ibrahim Danladi', email: 'ibrahim.danladi@koriepay.internal', role: 'RISK_ANALYST', jurisdiction: 'CROSS_BORDER', country: 'ALL', assignedCasesCount: 2, status: 'ACTIVE', lastActiveAt: ago(64) },
  { id: 'OFF-008', fullName: 'Hadiza Souley', email: 'hadiza.souley@koriepay.internal', role: 'AML_ANALYST', jurisdiction: 'CROSS_BORDER', country: 'ALL', assignedCasesCount: 0, status: 'ACTIVE', lastActiveAt: ago(17) },
  { id: 'OFF-009', fullName: 'Kelechi Okafor', email: 'kelechi.okafor@koriepay.internal', role: 'AUDITOR', jurisdiction: 'NG', country: 'NG', assignedCasesCount: 0, status: 'ACTIVE', lastActiveAt: ago(120) },
];

/* ================================================================== */
/* Small factories                                                     */
/* ================================================================== */
const D = (
  id: string,
  docType: string,
  category: PortalDoc['category'],
  status: PortalDoc['status'],
  refMasked: string,
  opts: Partial<PortalDoc> = {},
): PortalDoc => ({
  id,
  docType,
  category,
  refMasked,
  status,
  method: 'AUTOMATED',
  submittedAt: daysAgo(40 + (id.length % 90)),
  ...opts,
});

const A = (opts: Omit<PortalAccount, 'id'> & { id: string }): PortalAccount => opts;

export const MOCK_DOC_STATUS_COLORS: Record<string, string> = {};

/* ================================================================== */
/* Customers                                                           */
/* XOF-first market: Niger Republic primary, Nigeria second.           */
/* ================================================================== */
type Row = [
  firstName: string, lastName: string, country: 'NE' | 'NG', currency: 'XOF' | 'NGN',
  city: string, occupation: string, sinceDays: number, tier: 'TIER_1' | 'TIER_2' | 'TIER_3',
  vStatus: PortalCustomer['verificationStatus'], risk: PortalCustomer['riskLevel'], score: number,
  acct: CustomerAccountStatusLike, alerts: number, cases: number, sanc: number, pep: number,
];
type CustomerAccountStatusLike = PortalCustomer['accountStatus'];

const ROWS: Row[] = [
  ['Aminou', 'Ibrahim', 'NE', 'XOF', 'Maradi', 'Grain wholesale trader', 540, 'TIER_3', 'VERIFIED', 'MEDIUM', 52, 'ACTIVE', 2, 1, 0, 0],
  ['Hassane', 'Abdou', 'NE', 'XOF', 'Niamey', 'Importer / general goods', 420, 'TIER_3', 'VERIFIED', 'HIGH', 71, 'ACTIVE', 3, 1, 0, 0],
  ['Ramatou', 'Souley', 'NE', 'XOF', 'Zinder', 'Livestock trader', 380, 'TIER_2', 'VERIFIED', 'LOW', 22, 'ACTIVE', 0, 0, 0, 0],
  ['Mariama', 'Garba', 'NE', 'XOF', 'Maradi', 'Textile retailer', 300, 'TIER_2', 'VERIFIED', 'LOW', 18, 'ACTIVE', 0, 0, 0, 0],
  ['Salifou', 'Maiga', 'NE', 'XOF', 'Tahoua', 'Transport operator', 260, 'TIER_2', 'PENDING', 'MEDIUM', 47, 'ACTIVE', 1, 0, 0, 0],
  ['Halima', 'Dan Borno', 'NE', 'XOF', 'Niamey', 'Cross-border merchant', 500, 'TIER_3', 'VERIFIED', 'CRITICAL', 91, 'FROZEN', 4, 2, 1, 1],
  ['Oumarou', 'Sidikou', 'NE', 'XOF', 'Maradi', 'Rice mill operator', 190, 'TIER_2', 'VERIFIED', 'LOW', 15, 'ACTIVE', 0, 0, 0, 0],
  ['Fatouma', 'Amadou', 'NE', 'XOF', 'Niamey', 'Pharmacist', 210, 'TIER_2', 'VERIFIED', 'LOW', 12, 'ACTIVE', 0, 0, 0, 0],
  ['Boubacar', 'Kalla', 'NE', 'XOF', 'Maradi', 'Importer — electronics', 350, 'TIER_3', 'VERIFIED', 'HIGH', 78, 'ACTIVE', 2, 1, 0, 1],
  ['Aïchatou', 'Moussa', 'NE', 'XOF', 'Zinder', 'School proprietor', 150, 'TIER_1', 'IN_REVIEW', 'LOW', 25, 'ACTIVE', 0, 0, 0, 0],
  ['Sani', 'Lawali', 'NE', 'XOF', 'Agadez', 'Mining equipment dealer', 130, 'TIER_2', 'VERIFIED', 'MEDIUM', 44, 'ACTIVE', 1, 0, 0, 0],
  ['Nana', 'Aichatou', 'NE', 'XOF', 'Niamey', 'Fashion exporter', 90, 'TIER_1', 'PENDING', 'LOW', 20, 'ACTIVE', 0, 0, 0, 0],
  ['Ado', 'Zakari', 'NE', 'XOF', 'Maradi', 'Cattle dealer', 470, 'TIER_2', 'VERIFIED', 'MEDIUM', 55, 'DORMANT', 1, 0, 0, 0],
  ['Chukwudi', 'Okeke', 'NG', 'NGN', 'Kano', 'Grain merchant — Dawanau', 620, 'TIER_3', 'VERIFIED', 'MEDIUM', 58, 'ACTIVE', 2, 1, 0, 0],
  ['Aisha', 'Bello', 'NG', 'NGN', 'Kano', 'Super agent (network)', 560, 'TIER_3', 'VERIFIED', 'LOW', 30, 'ACTIVE', 0, 0, 0, 0],
  ['Ibrahim', 'Dikko', 'NG', 'NGN', 'Katsina', 'Border commodity trader', 340, 'TIER_2', 'VERIFIED', 'HIGH', 74, 'ACTIVE', 3, 1, 1, 0],
  ['Ngozi', 'Okonkwo', 'NG', 'NGN', 'Abuja', 'Logistics firm director', 290, 'TIER_2', 'VERIFIED', 'LOW', 14, 'ACTIVE', 0, 0, 0, 0],
  ['Bashir', 'Umar', 'NG', 'NGN', 'Kano', 'Textile manufacturer', 400, 'TIER_3', 'VERIFIED', 'MEDIUM', 49, 'ACTIVE', 1, 0, 0, 0],
  ['Hadiza', 'Lawan', 'NG', 'NGN', 'Kano', 'Clothing retailer', 180, 'TIER_1', 'IN_REVIEW', 'LOW', 16, 'ACTIVE', 0, 0, 0, 0],
  ['Suleiman', 'Abubakar', 'NG', 'NGN', 'Sokoto', 'Hides & skins exporter', 520, 'TIER_3', 'VERIFIED', 'HIGH', 82, 'ACTIVE', 2, 1, 0, 1],
  ['Blessing', 'Okafor', 'NG', 'NGN', 'Lagos', 'Import agent', 220, 'TIER_2', 'VERIFIED', 'MEDIUM', 51, 'ACTIVE', 1, 0, 0, 0],
  ['Yusuf', 'Garba', 'NG', 'NGN', 'Kano', 'Wholesale electronics', 310, 'TIER_2', 'VERIFIED', 'LOW', 27, 'ACTIVE', 0, 0, 0, 0],
  ['Khadijat', 'Musa', 'NG', 'NGN', 'Katsina', 'Cereal trader', 250, 'TIER_2', 'PENDING', 'MEDIUM', 41, 'ACTIVE', 1, 0, 0, 0],
  ['Emeka', 'Nwosu', 'NG', 'NGN', 'Abuja', 'Contractor', 140, 'TIER_1', 'VERIFIED', 'LOW', 19, 'ACTIVE', 0, 0, 0, 0],
  ['Tanimu', 'Abubakar', 'NG', 'NGN', 'Daura', 'Cross-border haulage', 460, 'TIER_3', 'VERIFIED', 'CRITICAL', 94, 'RESTRICTED', 5, 2, 1, 1],
  ['Rabi', 'Sani', 'NE', 'XOF', 'Maradi', 'Kola nut importer', 320, 'TIER_2', 'VERIFIED', 'MEDIUM', 53, 'ACTIVE', 1, 0, 0, 0],
];

const CUST_NAMES = new Map<string, string>();
ROWS.forEach((r) => CUST_NAMES.set(r[0] + ' ' + r[1], `${r[0]}_${r[1].toUpperCase()}`));

export const MOCK_PORTAL_CUSTOMERS: PortalCustomer[] = ROWS.map((r, i) => {
  const id = `KP-${10230 + i}`;
  const [fn, ln, country, currency, city, occupation, sinceDays, tier, vStatus, riskLevel, riskScore, accountStatus, openAlerts, openCases, sanc, pep] = r;
  const accounts: PortalAccount[] = [];
  const walletCur = country === 'NE' ? 'XOF' : 'NGN';
  const secondCur: 'XOF' | 'NGN' = country === 'NE' ? 'NGN' : 'XOF';
  accounts.push(
    A({ id: `KPA-${90010 + i}`, label: `${walletCur} Wallet`, kind: 'WALLET', currency: walletCur, status: accountStatus === 'ACTIVE' ? 'ACTIVE' : accountStatus === 'FROZEN' ? 'FROZEN' : accountStatus === 'RESTRICTED' ? 'RESTRICTED' : 'DORMANT', openedAt: daysAgo(sinceDays), balance: Math.round((1200 + ((i * 883) % 9000)) * (currency === 'XOF' ? 1 : 1)) }),
  );
  if (i % 3 !== 0) {
    accounts.push(
      A({ id: `KPA-${90050 + i}`, label: `${secondCur} Virtual Account`, kind: 'VIRTUAL_ACCOUNT', currency: secondCur, status: 'ACTIVE', openedAt: daysAgo(Math.max(30, sinceDays - 60)), balance: Math.round(400 + ((i * 347) % 3000)) }),
    );
  }
  const docs: PortalDoc[] = [];
  if (country === 'NE') {
    docs.push(D(`DOC-NIN-${900 + i}`, 'National ID (CNI)', 'IDENTITY', vStatus === 'VERIFIED' ? 'VERIFIED' : vStatus === 'REJECTED' ? 'REJECTED' : 'PENDING', `NE-****-${String(1000 + i)}`, { country: 'NE', score: vStatus === 'VERIFIED' ? 96 + (i % 3) : undefined, verifiedAt: vStatus === 'VERIFIED' ? daysAgo(sinceDays - 10) : undefined }));
  } else {
    docs.push(D(`DOC-NIN-${900 + i}`, 'NIN Slip', 'IDENTITY', vStatus === 'VERIFIED' ? 'VERIFIED' : vStatus === 'REJECTED' ? 'REJECTED' : 'PENDING', `NIN-*****-${String(7100 + i)}`, { country: 'NG', score: vStatus === 'VERIFIED' ? 95 + (i % 4) : undefined, verifiedAt: vStatus === 'VERIFIED' ? daysAgo(sinceDays - 10) : undefined }));
    if (i % 2 === 0) docs.push(D(`DOC-BVN-${700 + i}`, 'BVN Record', 'IDENTITY', 'VERIFIED', `BVN-****-${String(4400 + i)}`, { country: 'NG', score: 97 }));
  }
  docs.push(D(`DOC-SLF-${300 + i}`, 'Liveness Selfie', 'BIOMETRIC', vStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING', `SELFIE-${900 + i}`, { score: vStatus === 'VERIFIED' ? 92 + (i % 6) : undefined }));
  if (i % 2 === 1) docs.push(D(`DOC-ADR-${500 + i}`, 'Utility Bill', 'ADDRESS', i % 4 === 3 ? 'EXPIRED' : 'VERIFIED', `ADR-${2000 + i}`, { country }));
  return {
    id,
    firstName: fn,
    lastName: ln,
    country,
    currency,
    city,
    occupation,
    customerSince: daysAgo(sinceDays),
    lastActivityAt: ago((i * 47) % 300),
    phoneMasked: country === 'NE' ? `+227 96 ** ** ${String(10 + i).padStart(2, '0')}` : `+234 80* *** ${String(100 + i).slice(-3)}`,
    emailMasked: `${fn.slice(0, 2).toLowerCase()}${ln.slice(0, 2).toLowerCase()}**@koriepay.test`,
    idNumberMasked: country === 'NE' ? `NE-****-${String(1000 + i)}` : `NIN-*****-${String(7100 + i)}`,
    kycTier: tier,
    verificationStatus: vStatus,
    riskLevel,
    riskScore,
    accountStatus,
    openAlerts,
    openCases,
    sanctionsMatches: sanc,
    pepMatches: pep,
    accounts,
    documents: docs,
    screeningClean: sanc + pep === 0,
  };
});

/* ================================================================== */
/* KYC queue                                                           */
/* ================================================================== */
const KYC_ROWS: [string, number, 'NE' | 'NG', 'TIER_1' | 'TIER_2' | 'TIER_3', KycStatusLike, RiskLevelLike, number, string, string][] = [
  ['Salifou Maiga', 3, 'NE', 'TIER_2', 'PENDING', 'MEDIUM', 47, 'AUTOMATED', 'Tahoua'],
  ['Nana Aichatou', 11, 'NE', 'TIER_1', 'PENDING', 'LOW', 20, 'AUTOMATED', 'Niamey'],
  ['Aïchatou Moussa', 9, 'NE', 'TIER_1', 'IN_REVIEW', 'LOW', 25, 'MANUAL', 'Zinder'],
  ['Hadiza Lawan', 18, 'NG', 'TIER_1', 'IN_REVIEW', 'LOW', 16, 'MANUAL', 'Kano'],
  ['Khadijat Musa', 22, 'NG', 'TIER_2', 'PENDING', 'MEDIUM', 41, 'AUTOMATED', 'Katsina'],
  ['Boubacar Kalla', 8, 'NE', 'TIER_3', 'PENDING', 'HIGH', 78, 'MANUAL', 'Maradi'],
  ['Emeka Nwosu', 23, 'NG', 'TIER_1', 'VERIFIED', 'LOW', 19, 'AUTOMATED', 'Abuja'],
  ['Ramatou Souley', 2, 'NE', 'TIER_2', 'VERIFIED', 'LOW', 22, 'AUTOMATED', 'Zinder'],
  ['Aminou Ibrahim', 0, 'NE', 'TIER_3', 'VERIFIED', 'MEDIUM', 52, 'AUTOMATED', 'Maradi'],
  ['Sani Lawali', 10, 'NE', 'TIER_2', 'VERIFIED', 'MEDIUM', 44, 'AUTOMATED', 'Agadez'],
  ['Aisha Bello', 14, 'NG', 'TIER_3', 'VERIFIED', 'LOW', 30, 'AUTOMATED', 'Kano'],
  ['Yusuf Garba', 21, 'NG', 'TIER_2', 'VERIFIED', 'LOW', 27, 'AUTOMATED', 'Kano'],
  ['Tanimu Abubakar', 24, 'NG', 'TIER_3', 'REJECTED', 'CRITICAL', 94, 'MANUAL', 'Daura'],
  ['Fatouma Amadou', 7, 'NE', 'TIER_2', 'VERIFIED', 'LOW', 12, 'AUTOMATED', 'Niamey'],
  ['Blessing Okafor', 20, 'NG', 'TIER_2', 'EXPIRED', 'MEDIUM', 51, 'AUTOMATED', 'Lagos'],
  ['Mariama Garba', 3, 'NE', 'TIER_2', 'VERIFIED', 'LOW', 18, 'AUTOMATED', 'Maradi'],
  ['Halima Dan Borno', 5, 'NE', 'TIER_3', 'IN_REVIEW', 'CRITICAL', 91, 'MANUAL', 'Niamey'],
  ['Rabi Sani', 25, 'NE', 'TIER_2', 'VERIFIED', 'MEDIUM', 53, 'AUTOMATED', 'Maradi'],
];
type KycStatusLike = PortalKycApplication['status'];
type RiskLevelLike = PortalKycApplication['riskLevel'];

export const MOCK_PORTAL_KYC: PortalKycApplication[] = KYC_ROWS.map(([name, custIdx, country, tier, status, riskLevel, riskScore, method, city], i) => {
  const customer = MOCK_PORTAL_CUSTOMERS[custIdx];
  const pending = status === 'PENDING' || status === 'IN_REVIEW';
  return {
    id: `KYC-${18400 + i}`,
    customerId: customer.id,
    customerName: name,
    country: country as 'NE' | 'NG',
    currency: (country === 'NE' ? 'XOF' : 'NGN') as 'XOF' | 'NGN',
    tier,
    status,
    submittedAt: ago((40 + i * 130) % 900 + 30),
    updatedAt: ago((10 + i * 9) % 200),
    riskLevel,
    riskScore,
    reviewerName: pending ? undefined : i % 2 ? 'Fatima Garba' : 'Mamadou Ousmane',
    emailMasked: `${name.split(' ')[0].slice(0, 2).toLowerCase()}${name.split(' ')[1].slice(0, 2).toLowerCase()}**@koriepay.test`,
    phoneMasked: country === 'NE' ? `+227 96 ** ** ${String(10 + i).padStart(2, '0')}` : `+234 80* *** ${String(100 + i).slice(-3)}`,
    ninMasked: country === 'NE' ? `NE-****-${String(2000 + i)}` : `NIN-*****-${String(8100 + i)}`,
    bvnMasked: country === 'NG' && i % 2 === 0 ? `BVN-****-${String(5200 + i)}` : undefined,
    addressStatus: i % 4 === 3 ? 'PENDING' : 'VERIFIED',
    documents: [
      D(`DOC-KN-${1900 + i}`, country === 'NE' ? 'National ID (CNI)' : 'NIN Slip', 'IDENTITY', status === 'VERIFIED' ? 'VERIFIED' : status === 'REJECTED' ? 'REJECTED' : 'PENDING', country === 'NE' ? `NE-****-${String(2000 + i)}` : `NIN-*****-${String(8100 + i)}`, { country, score: 90 + (i % 9), method: method === 'AUTOMATED' ? 'AUTOMATED' : 'MANUAL' }),
      D(`DOC-KS-${2300 + i}`, 'Liveness Selfie', 'BIOMETRIC', status === 'VERIFIED' ? 'VERIFIED' : 'PENDING', `SELFIE-${3000 + i}`, { score: 88 + ((i * 3) % 10), method: 'AUTOMATED' }),
      ...(country === 'NG' && i % 2 === 0
        ? [D(`DOC-KB-${2700 + i}`, 'BVN Record', 'IDENTITY', 'VERIFIED', `BVN-****-${String(5200 + i)}`, { country, score: 97, method: 'AUTOMATED' })]
        : []),
      ...(i % 3 === 0 ? [D(`DOC-KA-${3100 + i}`, 'Utility Bill', 'ADDRESS', i % 6 === 0 ? 'PENDING' : 'VERIFIED', `ADR-${4000 + i}`, { country })] : []),
    ],
    screening: {
      sanctions: i === 9 ? 'POTENTIAL_MATCH' : 'CLEAN',
      pep: i === 13 ? 'POTENTIAL_MATCH' : 'CLEAN',
    },
    notes: pending ? 'Waiting on address verification.' : undefined,
    decisionAt: status === 'VERIFIED' || status === 'REJECTED' ? ago((30 + i * 17) % 900) : undefined,
    decisionReason: status === 'REJECTED' ? 'Document mismatch — NIN photograph differs from liveness selfie.' : undefined,
  };
});

/* ================================================================== */
/* KYB queue                                                           */
/* ================================================================== */
const KYB_ROWS: [string, string, 'NE' | 'NG', string, number, RiskLevelLike, KybStatusLike][] = [
  ['Maradi Grain Traders SARL', 'RCCM-NE-****-8210', 'NE', 'LIMITED_COMPANY', 6, 'HIGH', 'PENDING'],
  ['Dawanau Commodities Ltd', 'RC-*****-14322', 'NG', 'LIMITED_COMPANY', 13, 'MEDIUM', 'VERIFIED'],
  ['Sahel Import-Export SARL', 'RCCM-NE-****-7044', 'NE', 'LIMITED_COMPANY', 1, 'CRITICAL', 'PENDING'],
  ['Kano Textile Mills Ltd', 'RC-*****-12981', 'NG', 'LIMITED_COMPANY', 17, 'MEDIUM', 'VERIFIED'],
  ['Alheri Trading Company', 'RC-*****-27741', 'NG', 'PARTNERSHIP', 20, 'LOW', 'VERIFIED'],
  ['Grain de Vie SARL', 'RCCM-NE-****-9912', 'NE', 'LIMITED_COMPANY', 8, 'MEDIUM', 'IN_REVIEW'],
  ['Katsina Livestock Cooperative', 'RC-*****-5540', 'NG', 'PARTNERSHIP', 18, 'LOW', 'VERIFIED'],
  ['Énergie Sahel SARL', 'RCCM-NE-****-1130', 'NE', 'LIMITED_COMPANY', 12, 'HIGH', 'REJECTED'],
  ['Zinder Agro Supplies', 'RCCM-NE-****-3347', 'NE', 'SOLE_PROPRIETORSHIP', 2, 'LOW', 'VERIFIED'],
];
type KybStatusLike = PortalKybApplication['status'];

export const MOCK_PORTAL_KYB: PortalKybApplication[] = KYB_ROWS.map(([businessName, regNumberMasked, country, businessType, custIdx, riskLevel, status], i) => {
  const customer = MOCK_PORTAL_CUSTOMERS[custIdx];
  const pending = status === 'PENDING' || status === 'IN_REVIEW';
  const directors: KybDirector[] = [
    { name: customer.firstName + ' ' + customer.lastName, role: 'Managing Director', idMasked: country === 'NE' ? 'NE-****-3121' : 'NIN-*****-9044', riskLevel },
    ...(i % 2 === 0 ? [{ name: 'M. Lawali Issoufou', role: 'Finance Director', idMasked: country === 'NE' ? 'NE-****-5877' : 'NIN-*****-6672', riskLevel: 'MEDIUM' as RiskLevelLike }] : []),
  ];
  return {
    id: `KYB-${4200 + i}`,
    customerId: customer.id,
    businessName,
    regNumberMasked,
    country: country as 'NE' | 'NG',
    businessType: businessType as PortalKybApplication['businessType'],
    industry: i % 3 === 0 ? 'Agriculture & Commodities' : i % 3 === 1 ? 'Trade & Distribution' : 'Manufacturing',
    status,
    submittedAt: ago((200 + i * 400) % 1200 + 60),
    updatedAt: ago((20 + i * 13) % 300),
    riskLevel,
    riskScore: riskLevel === 'CRITICAL' ? 93 : riskLevel === 'HIGH' ? 76 : riskLevel === 'MEDIUM' ? 48 : 20,
    reviewerName: pending ? undefined : i % 2 ? 'Zainab Yusuf' : 'Amina Bello',
    directors,
    documents: [
      D(`DOC-CAC-${5000 + i}`, 'Registration Certificate', 'CORPORATE', status === 'VERIFIED' ? 'VERIFIED' : status === 'REJECTED' ? 'REJECTED' : 'PENDING', regNumberMasked, { country, score: 93 + (i % 6) }),
      D(`DOC-TX-${5400 + i}`, 'Tax Clearance', 'CORPORATE', status === 'REJECTED' ? 'EXPIRED' : status === 'PENDING' ? 'PENDING' : 'VERIFIED', `TX-${8000 + i}`, { country }),
      ...(i % 2 === 0 ? [D(`DOC-PR-${5600 + i}`, 'Proof of Registered Address', 'ADDRESS', 'VERIFIED', `PR-${9000 + i}`, { country })] : []),
    ],
    screening: {
      sanctions: i === 2 ? 'CONFIRMED_MATCH' : 'CLEAN',
      pep: i === 1 ? 'POTENTIAL_MATCH' : 'CLEAN',
    },
    notes: pending ? 'Beneficial ownership structure under review.' : undefined,
  };
});

/* ================================================================== */
/* Transactions — XOF first                                            */
/* ================================================================== */
const TX_ROWS: [custIdx: number, mins: number, amount: number, cur: 'XOF' | 'NGN', ch: PortalTxn['channel'], dir: 'IN' | 'OUT', score: number, dec: PortalTxn['decision'], st: PortalTxn['status'], node: PortalTxn['node'], cp: string, rules: [string, AmlRuleLike, string][]][] = [
  [0, 12, 2480000, 'XOF', 'CROSS_BORDER', 'OUT', 58, 'FLAG', 'FLAGGED', 'KORIEPAY_RAILS', 'Maradi Grain Traders SARL', [['AML-VEL-4', 'HIGH', 'Rapid successive outbound transfers'], ['AML-XB-2', 'MEDIUM', 'Large cross-border transfer']]],
  [24, 25, 1865000, 'XOF', 'WALLET_TRANSFER', 'OUT', 92, 'BLOCK', 'BLOCKED', 'CORIS_BANK_NE', 'KANo***-Hassane A', [['AML-STR-1', 'CRITICAL', 'Structuring pattern detected'], ['AML-CTS-3', 'HIGH', 'Counterparty sanctions hit']]],
  [5, 41, 420000, 'XOF', 'WALLET_TRANSFER', 'OUT', 88, 'FLAG', 'FLAGGED', 'CORIS_BANK_NE', '***LTD Kano', [['AML-VEL-4', 'HIGH', 'Rapid successive outbound transfers']]],
  [0, 68, 920000, 'XOF', 'AGENT_CASH_OUT', 'OUT', 42, 'PASS', 'SETTLED', 'CORIS_BANK_NE', 'Agent POS — Maradi M1', []],
  [1, 95, 3100000, 'XOF', 'CROSS_BORDER', 'IN', 61, 'FLAG', 'FLAGGED', 'KORIEPAY_RAILS', 'Alheri Trading Co', [['AML-XB-1', 'MEDIUM', 'High-value inbound corridor']]],
  [8, 130, 7400000, 'XOF', 'WALLET_TRANSFER', 'OUT', 76, 'REVIEW', 'PENDING', 'CORIS_BANK_NE', 'Boubacar Kalla Ent.', [['AML-AMT-1', 'HIGH', 'Amount above threshold']]],
  [2, 160, 250000, 'XOF', 'BILL_PAYMENT', 'OUT', 8, 'PASS', 'SETTLED', 'CORIS_BANK_NE', 'NIGELEC', []],
  [13, 200, 1850000, 'NGN', 'CROSS_BORDER', 'IN', 55, 'FLAG', 'FLAGGED', 'KORIEPAY_RAILS', 'Maradi Grain Traders SARL', [['AML-XB-1', 'MEDIUM', 'High-value inbound corridor']]],
  [3, 240, 96000, 'XOF', 'QR_PAYMENT', 'OUT', 6, 'PASS', 'SETTLED', 'CORIS_BANK_NE', 'Market stand QR — Maradi', []],
  [15, 300, 4200000, 'NGN', 'CROSS_BORDER', 'OUT', 66, 'FLAG', 'FLAGGED', 'KORIEPAY_RAILS', 'Sahel Import-Export SARL', [['AML-VEL-4', 'HIGH', 'Rapid successive outbound transfers']]],
  [19, 380, 6600000, 'NGN', 'WALLET_TRANSFER', 'OUT', 84, 'FLAG', 'FLAGGED', 'PROVIDUS_BANK_NG', 'Suleiman Abubakar Ent', [['AML-AMT-1', 'HIGH', 'Amount above threshold'], ['AML-GEO-2', 'MEDIUM', 'Origin/beneficiary geo divergence']]],
  [24, 430, 1200000, 'NGN', 'FX_CONVERSION', 'IN', 71, 'REVIEW', 'PENDING', 'KORIEPAY_RAILS', 'KoriePay FX desk', [['AML-AMT-2', 'MEDIUM', 'FX conversion threshold']]],
  [6, 500, 64000, 'XOF', 'BILL_PAYMENT', 'OUT', 5, 'PASS', 'SETTLED', 'CORIS_BANK_NE', 'NIGELEC', []],
  [5, 580, 1550000, 'XOF', 'WALLET_TRANSFER', 'IN', 79, 'FLAG', 'FLAGGED', 'CORIS_BANK_NE', 'Oumarou Sidikou', [['AML-STR-1', 'CRITICAL', 'Structuring pattern detected']]],
  [16, 650, 2600000, 'NGN', 'AGENT_CASH_OUT', 'OUT', 33, 'PASS', 'SETTLED', 'PROVIDUS_BANK_NG', 'Agent POS — Katsina K3', []],
  [0, 740, 410000, 'XOF', 'WALLET_TRANSFER', 'IN', 12, 'PASS', 'SETTLED', 'CORIS_BANK_NE', 'Oumarou Sidikou', []],
  [10, 900, 850000, 'XOF', 'AGENT_CASH_OUT', 'OUT', 22, 'PASS', 'SETTLED', 'CORIS_BANK_NE', 'Agent POS — Agadez', []],
  [25, 1080, 130000, 'XOF', 'QR_PAYMENT', 'OUT', 7, 'PASS', 'SETTLED', 'CORIS_BANK_NE', 'Kiosk QR — Maradi', []],
  [4, 1220, 90000, 'XOF', 'BILL_PAYMENT', 'OUT', 9, 'PASS', 'SETTLED', 'CORIS_BANK_NE', 'Orange Niger', []],
  [14, 1330, 800000, 'NGN', 'WALLET_TRANSFER', 'OUT', 26, 'PASS', 'SETTLED', 'PROVIDUS_BANK_NG', 'Aisha Bello', []],
  [5, 1500, 2500000, 'XOF', 'CROSS_BORDER', 'OUT', 90, 'BLOCK', 'BLOCKED', 'KORIEPAY_RAILS', '***DAN BORNO SUPPLY**', [['AML-CTS-1', 'CRITICAL', 'Sanctions list match (UN/OFAC)']]],
  [1, 1720, 380000, 'XOF', 'AGENT_CASH_IN', 'IN', 30, 'PASS', 'SETTLED', 'CORIS_BANK_NE', 'Agent POS — Niamey', []],
];
type AmlRuleLike = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const MOCK_PORTAL_TXNS: PortalTxn[] = TX_ROWS.map(([custIdx, mins, amount, currency, channel, direction, riskScore, decision, status, node, cp, rules], i) => {
  const c = MOCK_PORTAL_CUSTOMERS[custIdx];
  return {
    id: `TXN-${893800 - i}`,
    customerId: c.id,
    customerName: `${c.firstName} ${c.lastName}`,
    counterpartyMasked: cp,
    direction,
    amount,
    currency,
    channel,
    node,
    riskScore,
    riskLevel: riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW',
    decision,
    status,
    timestamp: ago(mins),
    narration: undefined,
    rulesTriggered: rules.map(([code, sev, description]) => ({ code, name: code, severity: sev as AmlRule['severity'], description })),
    alertId: status === 'FLAGGED' || status === 'BLOCKED' ? undefined : undefined,
  };
});

/* ================================================================== */
/* Unified alerts                                                      */
/* ================================================================== */
const ALERT_ROWS: [kind: PortalAlert['kind'], sev: PortalAlert['severity'], st: PortalAlert['status'], title: string, desc: string, custIdx: number, amount: number, cur: 'XOF' | 'NGN', mins: number, slaMins: number, rule: string, by?: string][] = [
  ['AML', 'CRITICAL', 'OPEN', 'Structuring pattern — multiple sub-threshold transfers', 'Five outbound transfers within 90 minutes, each just under the reporting threshold, to a counterparty flagged in screening.', 5, 420000, 'XOF', 41, 600, 'AML-STR-1'],
  ['AML', 'CRITICAL', 'OPEN', 'Sanctions list hit on beneficiary', 'Beneficiary name is a partial match against UN 1267/ISIL listings at 94% confidence.', 24, 1865000, 'XOF', 25, 520, 'AML-CTS-1'],
  ['SCREENING', 'HIGH', 'INVESTIGATING', 'Sanctions match — potential alias', 'Customer matches list entry alias “Halima Borno” (score 78). Awaiting name/DOB comparison.', 5, 0, 'XOF', 130, 1400, 'SCR-UN-1267', 'Mamadou Ousmane'],
  ['AML', 'HIGH', 'INVESTIGATING', 'High-value corridor transfer without prior pattern', 'Inbound XOF 3,100,000 from Nigerian corporate — first cross-border credit of this size on profile.', 1, 3100000, 'XOF', 95, 1080, 'AML-XB-1', 'Salifou Maiga'],
  ['FRAUD', 'CRITICAL', 'OPEN', 'Velocity + geolocation anomaly', 'Cash-out attempts from two devices 900 km apart within 35 minutes; SIM changed 2h earlier.', 25, 660000, 'NGN', 200, 700, 'RSK-VEL-9'],
  ['AML', 'HIGH', 'ESCALATED', 'Rapid successive outbound transfers', '12 transfers in 50 minutes to 9 distinct counterparties following large FX conversion.', 0, 2480000, 'XOF', 12, 480, 'AML-VEL-4', 'Mamadou Ousmane'],
  ['RISK', 'MEDIUM', 'ACKNOWLEDGED', 'Risk score drift — high band', 'Customer risk score moved from 44 → 71 after transaction behaviour change (30d window).', 8, 0, 'XOF', 320, 2000, 'RSK-DRIFT-2', 'Ibrahim Danladi'],
  ['SCREENING', 'HIGH', 'OPEN', 'PEP match on business director', 'Director of KYB applicant appears in PEP database (score 82) — enhanced due diligence required.', 1, 0, 'XOF', 300, 1600, 'SCR-PEP-GL'],
  ['AML', 'MEDIUM', 'INVESTIGATING', 'Unusual FX conversion pattern', 'Repeated NGN→XOF conversions at rates within 1% of official window across 6 days.', 24, 1200000, 'NGN', 430, 2000, 'AML-FX-1', 'Hadiza Souley'],
  ['FRAUD', 'HIGH', 'OPEN', 'Device mismatch on login + transfer', 'New device (unregistered) initiated outbound transfer after failed OTP attempts.', 19, 6600000, 'NGN', 380, 900, 'RSK-DEV-3'],
  ['AML', 'MEDIUM', 'DISMISSED', 'Round-number cash-out clustering', 'Three cash-outs of XOF 250,000 each — consistent with documented livestock sale cycle.', 2, 750000, 'XOF', 1600, 0, 'AML-STR-3', 'Fatima Garba'],
  ['RISK', 'LOW', 'RESOLVED', 'Address verification stale', 'Utility bill older than 6 months triggered address re-verification; new bill uploaded.', 3, 0, 'XOF', 2700, 0, 'RSK-ADR-1', 'Fatima Garba'],
  ['SCREENING', 'MEDIUM', 'RESOLVED', 'Name similarity — false positive', 'Common West African name match cleared after full-name + DOB comparison.', 16, 0, 'NGN', 2900, 0, 'SCR-OFAC-SDN', 'Salifou Maiga'],
  ['AML', 'HIGH', 'OPEN', 'Counterparty sanctions advisory', 'Beneficiary corporate is subject to EU restrictive measures (partial match 61%).', 13, 4200000, 'NGN', 300, 720, 'AML-CTS-3'],
  ['RISK', 'MEDIUM', 'OPEN', 'Seasonal volume anomaly', 'October cash-in volume 4.2× monthly median — consistent with harvest trade but flagged for review.', 15, 0, 'NGN', 5200, 4200, 'RSK-SEASON-1'],
];
type AlertMins = number;

export const MOCK_PORTAL_ALERTS: PortalAlert[] = ALERT_ROWS.map(
  ([kind, severity, status, title, description, custIdx, amount, currency, mins, slaMins, ruleCode, assigned], i) => {
    const c = MOCK_PORTAL_CUSTOMERS[custIdx];
    return {
      id: `${kind === 'AML' ? 'AML' : kind === 'SCREENING' ? 'SCR' : 'RSK'}-${9030 + i * 7}`,
      kind,
      severity,
      status,
      title,
      description,
      customerId: c.id,
      customerName: `${c.firstName} ${c.lastName}`,
      country: c.country,
      amount: amount || undefined,
      currency: currency,
      ruleCode,
      triggeredAt: ago(mins),
      slaAt: slaMins ? later(slaMins) : undefined,
      assignedTo: assigned,
      evidence: [description, `Source: ${ruleCode}`, `Profile baseline: 30-day rolling`],
      timeline: [
        { at: ago(mins), text: `Alert generated — ${title}`, by: 'KoriePay AML engine' },
        ...(assigned ? [{ at: ago(Math.max(5, mins - 20)), text: `Assigned to ${assigned}`, by: 'Auto-assignment' }] : []),
        ...(status === 'ACKNOWLEDGED' || status === 'INVESTIGATING' || status === 'ESCALATED' ? [{ at: ago(18), text: `Status → ${status}`, by: assigned || 'Unassigned' }] : []),
      ],
    };
  },
);

/* ================================================================== */
/* Screening matches + watchlists                                      */
/* ================================================================== */
const SCR_ROWS: [kind: ScreeningMatch['kind'], list: string, custIdx: number, score: number, st: ScreeningMatch['status'], mins: number, fields: string[]][] = [
  ['SANCTIONS', 'UN 1267 / ISIL & Al-Qaida', 5, 94, 'POTENTIAL_MATCH', 130, ['Full name', 'Alias 1', 'Country']],
  ['SANCTIONS', 'OFAC SDN', 24, 78, 'UNDER_REVIEW', 500, ['Name (fuzzy)', 'Region']],
  ['SANCTIONS', 'CBN — Nigeria', 16, 64, 'FALSE_POSITIVE', 2900, ['Surname']],
  ['SANCTIONS', 'EU CFSP', 19, 61, 'UNDER_REVIEW', 900, ['Partial name']],
  ['SANCTIONS', 'BCEAO CENTIF (Niger)', 8, 87, 'POTENTIAL_MATCH', 760, ['Full name', 'DOB year']],
  ['PEP', 'PEP Global Database', 1, 82, 'POTENTIAL_MATCH', 300, ['Director name']],
  ['PEP', 'PEP Global Database', 19, 45, 'FALSE_POSITIVE', 3100, ['Surname only']],
  ['PEP', 'National Assembly (NE)', 5, 71, 'UNDER_REVIEW', 1400, ['Family name']],
  ['SANCTIONS', 'CBN — Nigeria', 24, 90, 'CONFIRMED_MATCH', 12, ['Full name', 'Alias', 'City']],
];
export const MOCK_SCREENING_MATCHES: ScreeningMatch[] = SCR_ROWS.map(([kind, listName, custIdx, score, status, mins, matchedFields], i) => {
  const c = MOCK_PORTAL_CUSTOMERS[custIdx];
  return {
    id: `SM-${8200 + i}`,
    kind,
    listName,
    customerId: c.id,
    customerName: `${c.firstName} ${c.lastName}`,
    country: c.country,
    matchedFields,
    score,
    status,
    triggeredAt: ago(mins),
    reviewedAt: status === 'FALSE_POSITIVE' || status === 'CONFIRMED_MATCH' ? ago(Math.max(5, mins - 60)) : undefined,
    reviewedBy: status === 'FALSE_POSITIVE' || status === 'CONFIRMED_MATCH' ? 'Salifou Maiga' : undefined,
    notes: status === 'FALSE_POSITIVE' ? 'Common-name false positive; cleared on DOB + NIN comparison.' : undefined,
  };
});

export const MOCK_WATCHLISTS: Watchlist[] = [
  { id: 'WL-1', name: 'UN Security Council 1267/1989', source: 'UN (automated feed)', jurisdiction: 'GLOBAL', records: 1240, updatedAt: ago(45), status: 'SYNCED', screenings24h: 1840, matches24h: 3 },
  { id: 'WL-2', name: 'OFAC SDN', source: 'US Treasury (automated feed)', jurisdiction: 'GLOBAL', records: 9611, updatedAt: ago(45), status: 'SYNCED', screenings24h: 1840, matches24h: 2 },
  { id: 'WL-3', name: 'EU Consolidated Financial Sanctions', source: 'EU CFSP (automated feed)', jurisdiction: 'GLOBAL', records: 3205, updatedAt: ago(180), status: 'SYNCED', screenings24h: 1840, matches24h: 1 },
  { id: 'WL-4', name: 'CBN — Nigeria sanctions & PFAs', source: 'CBN circulars', jurisdiction: 'NG', records: 318, updatedAt: ago(1440), status: 'SYNCED', screenings24h: 760, matches24h: 1 },
  { id: 'WL-5', name: 'BCEAO CENTIF (Niger Republic)', source: 'CENTIF advisories', jurisdiction: 'NE', records: 96, updatedAt: ago(300), status: 'UPDATING', screenings24h: 1080, matches24h: 2 },
  { id: 'WL-6', name: 'KoriePay internal risk registry', source: 'Internal sanctions desk', jurisdiction: 'CROSS_BORDER', records: 41, updatedAt: ago(60), status: 'SYNCED', screenings24h: 1840, matches24h: 0 },
];

/* ================================================================== */
/* Portal cases                                                        */
/* ================================================================== */
const CASE_ROWS: [num: string, title: string, type: PortalCase['caseType'], custIdx: number, risk: PortalCase['riskLevel'], pr: PortalCase['priority'], st: PortalCase['status'], officer: number, mins: number, sla: number, amount: number, cur: 'XOF' | 'NGN', alerts: string[]][] = [
  ['CS-2201', 'Suspected structuring — Maradi corridor', 'AML_INVESTIGATION', 5, 'CRITICAL', 'URGENT', 'ESCALATED', 2, 200, 400, 420000, 'XOF', ['AML-9030']],
  ['CS-2202', 'Sanctions confirmation review (UN 1267)', 'SANCTIONS_MATCH', 24, 'CRITICAL', 'URGENT', 'OPEN', 1, 260, 300, 1865000, 'XOF', ['AML-9037']],
  ['CS-2203', 'High-value inbound corridor — first occurrence', 'SUSPICIOUS_ACTIVITY', 1, 'HIGH', 'HIGH', 'ASSIGNED', 5, 340, 2200, 3100000, 'XOF', ['AML-9051']],
  ['CS-2204', 'Device takeover attempt', 'FRAUD_INVESTIGATION', 19, 'HIGH', 'HIGH', 'OPEN', 7, 430, 900, 6600000, 'NGN', ['RSK-9093']],
  ['CS-2205', 'KYB beneficial-ownership EDD', 'ENHANCED_DILIGENCE', 8, 'HIGH', 'MEDIUM', 'WAITING_FOR_INFO', 3, 1600, 6000, 7400000, 'XOF', []],
  ['CS-2206', 'Geographic anomaly — POS cash-out pattern', 'AML_INVESTIGATION', 25, 'HIGH', 'MEDIUM', 'UNDER_REVIEW', 6, 2200, 7200, 660000, 'NGN', ['RSK-9058']],
  ['CS-2207', 'Counterparty EU restrictive measures', 'SANCTIONS_MATCH', 13, 'MEDIUM', 'MEDIUM', 'PENDING_DECISION', 2, 1500, 3600, 4200000, 'NGN', ['RSK-9072']],
];
export const MOCK_PORTAL_CASES: PortalCase[] = CASE_ROWS.map(([num, title, caseType, custIdx, riskLevel, priority, status, officerIdx, mins, slaMins, amount, currency, alerts], i) => {
  const c = MOCK_PORTAL_CUSTOMERS[custIdx];
  const officer = MOCK_PORTAL_OFFICERS[officerIdx];
  return {
    id: `PC-${100 + i}`,
    caseNumber: num,
    caseType,
    title,
    customerId: c.id,
    customerName: `${c.firstName} ${c.lastName}`,
    jurisdiction: c.country,
    riskLevel,
    priority,
    status,
    assignedOfficerId: officer.id,
    assignedOfficerName: officer.fullName,
    createdAt: ago(mins),
    updatedAt: ago(Math.max(3, mins - 40)),
    deadlineSla: later(slaMins),
    summary: `${title} — ${c.firstName} ${c.lastName} (${c.id})`,
    amount,
    currency,
    relatedAlertIds: alerts,
    timeline: [
      { at: ago(mins), text: `Case opened from alert ${alerts[0] || 'manual intake'}`, by: officer.fullName },
      { at: ago(Math.max(4, mins - 60)), text: 'Customer risk profile attached', by: 'KoriePay engine' },
      { at: ago(25), text: `Status → ${status}`, by: officer.fullName },
    ],
    notes: ['Initial review: obtain bank statement history for the flagged window.'],
  };
});

/* ================================================================== */
/* Tasks / approvals / escalations                                     */
/* ================================================================== */
const TASK_ROWS: [title: string, kind: PortalTask['kind'], custIdx: number, dueIn: number, pr: PortalTask['priority'], st: PortalTask['status'], assignee: number, mins: number, ref?: string][] = [
  ['Review KYC application — Maradi trader', 'KYC_REVIEW', 8, 240, 'HIGH', 'OPEN', 4, 60, 'KYC-18405'],
  ['Complete sanctions name comparison (UN 1267)', 'SCREENING_REVIEW', 5, 90, 'URGENT', 'OPEN', 5, 30, 'SM-8200'],
  ['Approve restriction request — frozen wallet', 'APPROVAL', 24, 400, 'URGENT', 'OPEN', 2, 90, 'APR-5100'],
  ['Review alert: velocity anomaly', 'ALERT_REVIEW', 0, 150, 'HIGH', 'IN_PROGRESS', 5, 45, 'AML-9065'],
  ['Follow up KYB beneficial ownership docs', 'DOC_REQUEST', 1, 1800, 'MEDIUM', 'OPEN', 6, 300, 'KYB-4202'],
  ['SAR filing review with MLRO', 'REPORT', 5, 2600, 'HIGH', 'OPEN', 2, 400, 'CS-2201'],
  ['Re-verify expired utility bill', 'KYC_REVIEW', 20, 5000, 'LOW', 'OPEN', 4, 1440, 'KYC-18413'],
  ['Prepare monthly AML board pack', 'REPORT', 0, 7200, 'MEDIUM', 'OPEN', 1, 2000],
  ['Clear resolved alerts batch', 'ALERT_REVIEW', 16, 60, 'LOW', 'OVERDUE', 8, 3000],
  ['Close pending decision case', 'CASE_REVIEW', 13, 140, 'MEDIUM', 'OPEN', 2, 220, 'CS-2207'],
];
export const MOCK_PORTAL_TASKS: PortalTask[] = TASK_ROWS.map(([title, kind, custIdx, dueIn, priority, status, assigneeIdx, mins, ref], i) => {
  const c = MOCK_PORTAL_CUSTOMERS[custIdx];
  const officer = MOCK_PORTAL_OFFICERS[assigneeIdx];
  return {
    id: `TSK-${6100 + i}`,
    kind,
    title,
    customerId: c.id,
    customerName: `${c.firstName} ${c.lastName}`,
    dueAt: later(dueIn),
    priority,
    status: status === 'OVERDUE' ? 'OVERDUE' : status,
    assigneeId: officer.id,
    assigneeName: officer.fullName,
    createdAt: ago(mins),
    relatedRef: ref,
  };
});

const APPROVAL_ROWS: [type: PortalApproval['type'], title: string, summary: string, custIdx: number, by: number, mins: number, pr: PortalApproval['priority'], st: PortalApproval['status']][] = [
  ['ACCOUNT_RESTRICTION', 'Freeze wallet — critical sanctions match', 'Freeze XOF wallet pending UN 1267 confirmation review.', 24, 2, 90, 'URGENT', 'PENDING'],
  ['SAR_FILING', 'SAR filing — structuring case CS-2201', 'STR report to CENTIF (Niger) for structuring pattern.', 5, 2, 400, 'HIGH', 'PENDING'],
  ['KYC_OVERRIDE', 'KYC tier override — wholesale trader', 'Request TIER_3→TIER_3 exception on document age policy.', 0, 3, 300, 'MEDIUM', 'PENDING'],
  ['RISK_OVERRIDE', 'Risk score manual recalibration', 'Request to adjust engine score 71→62 after contextual review.', 8, 1, 60, 'HIGH', 'PENDING'],
  ['CASE_RESOLUTION', 'Close case CS-2202 as confirmed match', 'Confirm sanctions match and refer to enforcement.', 24, 1, 30, 'URGENT', 'PENDING'],
  ['ESCALATION', 'Escalate device takeover to management', 'Management attention for fraud case CS-2204.', 19, 2, 700, 'MEDIUM', 'APPROVED'],
  ['UNFREEZE', 'Unfreeze wallet after false positive', 'Lift restriction; screening cleared (FP).', 16, 4, 1600, 'LOW', 'DENIED'],
  ['ACCOUNT_RESTRICTION', 'Restrict account — EDD incomplete', 'Apply spending restriction until KYB docs received.', 8, 3, 500, 'MEDIUM', 'PENDING'],
];
export const MOCK_PORTAL_APPROVALS: PortalApproval[] = APPROVAL_ROWS.map(([type, title, summary, custIdx, byIdx, mins, priority, status], i) => {
  const c = MOCK_PORTAL_CUSTOMERS[custIdx];
  const by = MOCK_PORTAL_OFFICERS[byIdx];
  return {
    id: `APR-${5100 + i}`,
    type,
    title,
    summary,
    customerId: c.id,
    customerName: `${c.firstName} ${c.lastName}`,
    requestedById: by.id,
    requestedByName: by.fullName,
    requestedAt: ago(mins),
    priority,
    status,
    decidedById: status !== 'PENDING' ? 'OFF-001' : undefined,
    decidedByName: status !== 'PENDING' ? 'Amina Bello' : undefined,
    decidedAt: status !== 'PENDING' ? ago(Math.max(10, mins - 100)) : undefined,
    decisionNote: status === 'APPROVED' ? 'Approved — supported by screening evidence.' : status === 'DENIED' ? 'Denied — restriction lifted after FP confirmation; no further action.' : undefined,
  };
});

const ESC_ROWS: [level: PortalEscalation['level'], title: string, summary: string, by: number, to: PortalEscalation['assignedRole'], custIdx: number, mins: number, sla: number, st: PortalEscalation['status'], refs: string[]][] = [
  ['CRITICAL', 'UN 1267 confirmed match — immediate freeze', 'Beneficiary name confirmed against UN listing at 90%; wallet freeze approved, awaiting regulator notification.', 1, 'MLRO', 24, 260, 120, 'ACKNOWLEDGED', ['CS-2202', 'SM-8208']],
  ['MANAGEMENT', 'Device takeover — customer exposure', 'Possible fraud: new device + failed OTPs. Recommend fraud desk + customer call.', 2, 'HEAD_OF_COMPLIANCE', 19, 430, 1440, 'OPEN', ['CS-2204']],
  ['REGULATORY', 'STR — structuring pattern (Maradi)', 'SAR package prepared for CENTIF (Niger).', 2, 'REGULATORY_LIAISON', 5, 500, 2880, 'OPEN', ['CS-2201']],
  ['RISK', 'KYB beneficial ownership opacity', 'Ownership chain incomplete; recommend EDD and potential restriction.', 3, 'COMPLIANCE_MANAGER', 8, 1600, 7200, 'RESOLVED', ['CS-2205']],
  ['OPERATIONAL', 'Screening feed delay — CENTIF', 'CENTIF watchlist feed updating; fallback to manual advisories active.', 6, 'COMPLIANCE_MANAGER', 0, 700, 300, 'OPEN', ['WL-5']],
];
export const MOCK_PORTAL_ESCALATIONS: PortalEscalation[] = ESC_ROWS.map(([level, title, summary, byIdx, assignedRole, custIdx, mins, sla, status, refs], i) => {
  const by = MOCK_PORTAL_OFFICERS[byIdx];
  const c = MOCK_PORTAL_CUSTOMERS[custIdx];
  return {
    id: `ESC-${3400 + i}`,
    level,
    title,
    summary,
    raisedById: by.id,
    raisedByName: by.fullName,
    assignedRole,
    customerId: c.id,
    customerName: `${c.firstName} ${c.lastName}`,
    refs,
    createdAt: ago(mins),
    slaAt: later(sla),
    status,
    resolutionNote: status === 'RESOLVED' ? 'Ownership documentation received; risk recalibrated to MEDIUM.' : undefined,
  };
});

/* ================================================================== */
/* Reports / audit / activity                                          */
/* ================================================================== */
export const MOCK_PORTAL_REPORTS: PortalReportDef[] = [
  { id: 'RPT-KYC', kind: 'KYC', title: 'KYC Verification Report', description: 'Submission, approval, rejection and expiry volumes by tier, country and channel.', cadence: 'Daily', lastGeneratedAt: ago(240), status: 'READY', formats: ['PDF', 'CSV'] },
  { id: 'RPT-KYB', kind: 'KYB', title: 'KYB & Business Due Diligence Report', description: 'Business verification pipeline, director screening and document status.', cadence: 'Weekly', lastGeneratedAt: ago(1400), status: 'READY', formats: ['PDF', 'CSV'] },
  { id: 'RPT-AML', kind: 'AML', title: 'AML Alerts & Disposition Report', description: 'Alerts generated, resolved, dismissed and converted, by rule and severity.', cadence: 'Daily', lastGeneratedAt: ago(240), status: 'READY', formats: ['PDF', 'CSV'] },
  { id: 'RPT-RSK', kind: 'RISK', title: 'Customer Risk Distribution Report', description: 'Risk-level migration, high-risk & critical population and review status.', cadence: 'Weekly', lastGeneratedAt: ago(3300), status: 'READY', formats: ['PDF'] },
  { id: 'RPT-TXM', kind: 'TRANSACTION_MONITORING', title: 'Transaction Monitoring Summary', description: 'Volumes monitored, flagged, blocked and cleared by corridor and channel.', cadence: 'Daily', lastGeneratedAt: ago(240), status: 'READY', formats: ['CSV'] },
  { id: 'RPT-SAN', kind: 'SANCTIONS', title: 'Sanctions & PEP Screening Report', description: 'Screening volumes, matches by list, false positives and confirmations.', cadence: 'Weekly', lastGeneratedAt: ago(900), status: 'READY', formats: ['PDF', 'CSV'] },
  { id: 'RPT-CSE', kind: 'CASES', title: 'Case & Investigation Report', description: 'Case ageing, SLA attainment, outcomes and officer workload.', cadence: 'Weekly', lastGeneratedAt: ago(3300), status: 'SCHEDULED', formats: ['PDF'] },
  { id: 'RPT-AUD', kind: 'AUDIT', title: 'Compliance Audit Trail Export', description: 'Immutable officer/action log for the selected window (no PII, masked sessions).', cadence: 'On demand', status: 'NOT_GENERATED', formats: ['CSV', 'XLSX'] },
];

const AUDIT_ROWS: [action: string, resource: string, resourceId: string, by: number, mins: number, result: PortalAuditEntry['result'], detail: string, after?: Record<string, string | number | boolean>][] = [
  ['KYC_DECISION_APPROVE', 'KYC_APPLICATION', 'KYC-18403', 3, 26, 'SUCCESS', 'KYC approved after NIN match 96%', { status: 'VERIFIED' }],
  ['KYC_DECISION_REJECT', 'KYC_APPLICATION', 'KYC-18412', 4, 140, 'SUCCESS', 'Rejected — document mismatch', { status: 'REJECTED' }],
  ['AML_ALERT_ASSIGN', 'AML_ALERT', 'AML-9065', 5, 60, 'SUCCESS', 'Alert assigned to AML analyst', { assignee: 'Salifou Maiga' }],
  ['SANCTIONS_FALSE_POSITIVE', 'SCREENING_MATCH', 'SM-8205', 5, 400, 'SUCCESS', 'Cleared as false positive', { status: 'FALSE_POSITIVE' }],
  ['RESTRICTION_APPLY', 'ACCOUNT', 'KPA-90034', 2, 95, 'SUCCESS', 'Wallet frozen pending sanctions confirmation', { status: 'FROZEN' }],
  ['CASE_ESCALATE', 'CASE', 'CS-2201', 2, 190, 'SUCCESS', 'Escalated to MLRO — SAR prep', { status: 'ESCALATED' }],
  ['REPORT_GENERATE', 'REPORT', 'RPT-AML', 1, 235, 'SUCCESS', 'Daily AML report generated', { format: 'PDF' }],
  ['APPROVAL_DECISION', 'APPROVAL', 'APR-5106', 1, 600, 'SUCCESS', 'Approved management escalation', { status: 'APPROVED' }],
  ['LOGIN', 'SESSION', 'SES-88a1', 0, 10, 'SUCCESS', 'Session opened (MFA OTP verified)', { ip: '197.210.xx.xx' }],
  ['SEARCH_EXPORT_BLOCKED', 'AUDIT_LOG', 'AUD-0091', 8, 55, 'BLOCKED', 'Attempted export of unmasked PII denied by policy', {}],
  ['KYC_DECISION_ESCALATE', 'KYC_APPLICATION', 'KYC-18416', 5, 310, 'SUCCESS', 'Escalated — name hit on internal risk registry', { status: 'IN_REVIEW' }],
  ['TASK_COMPLETE', 'TASK', 'TSK-6108', 8, 1300, 'SUCCESS', 'Batch of resolved alerts archived', { status: 'DONE' }],
];
export const MOCK_PORTAL_AUDIT: PortalAuditEntry[] = AUDIT_ROWS.map(([action, resource, resourceId, byIdx, mins, result, detail, after], i) => {
  const officer = MOCK_PORTAL_OFFICERS[byIdx];
  return {
    id: `AUD-${3100 + i}`,
    at: ago(mins),
    officerId: officer.id,
    officerName: officer.fullName,
    officerRole: officer.role,
    action,
    resource,
    resourceId,
    result,
    sessionMasked: `197.210.xx.xx · ${(900000 + i * 37).toString(16)}`,
    detail,
    after,
  };
});

export const MOCK_PORTAL_ACTIVITY: PortalActivityItem[] = [
  { id: 'ACT-1', at: ago(18), actorName: 'Fatima Garba', actorRole: 'KYC Analyst', type: 'KYC', headline: 'KYC approved', sub: 'KYC-18404 · Aminou Ibrahim', href: '/compliance/kyc/18404', tone: 'OK' },
  { id: 'ACT-2', at: ago(41), actorName: 'KoriePay AML engine', type: 'AML', headline: 'Critical AML alert generated', sub: 'AML-9030 · Structuring pattern', href: '/compliance/alerts/AML-9030', tone: 'CRITICAL' },
  { id: 'ACT-3', at: ago(60), actorName: 'Salifou Maiga', actorRole: 'AML Analyst', type: 'AML', headline: 'Alert assigned', sub: 'AML-9065 · Velocity anomaly', href: '/compliance/alerts/AML-9065', tone: 'HIGH' },
  { id: 'ACT-4', at: ago(95), actorName: 'Mamadou Ousmane', actorRole: 'MLRO', type: 'CASE', headline: 'Case escalated', sub: 'CS-2201 · to MLRO review', href: '/compliance/cases/CS-2201', tone: 'CRITICAL' },
  { id: 'ACT-5', at: ago(130), actorName: 'Screening engine', type: 'SCREENING', headline: 'Sanctions match detected', sub: 'SM-8200 · UN 1267 (94%)', href: '/compliance/sanctions/SM-8200', tone: 'HIGH' },
  { id: 'ACT-6', at: ago(190), actorName: 'Amina Bello', actorRole: 'Head of Compliance', type: 'APPROVAL', headline: 'Escalation approved', sub: 'APR-5105 · Device takeover → management', tone: 'HIGH' },
  { id: 'ACT-7', at: ago(235), actorName: 'Amina Bello', actorRole: 'Head of Compliance', type: 'REPORT', headline: 'Daily AML report generated', sub: 'RPT-AML · PDF', href: '/compliance/reports', tone: 'OK' },
  { id: 'ACT-8', at: ago(400), actorName: 'Salifou Maiga', actorRole: 'AML Analyst', type: 'SCREENING', headline: 'False positive cleared', sub: 'SM-8205 · OFAC SDN', href: '/compliance/sanctions/SM-8205', tone: 'OK' },
  { id: 'ACT-9', at: ago(520), actorName: 'Zainab Yusuf', actorRole: 'KYB Analyst', type: 'KYB', headline: 'KYB documents requested', sub: 'KYB-4206 · beneficial ownership', href: '/compliance/kyb/4206', tone: 'MEDIUM' },
  { id: 'ACT-10', at: ago(700), actorName: 'System', type: 'SYSTEM', headline: 'CENTIF watchlist updating', sub: 'WL-5 · BCEAO CENTIF', href: '/compliance/watchlists', tone: 'MEDIUM' },
];

/* ================================================================== */
/* AML rule catalogue (read-only — engine config lives in backend)    */
/* ================================================================== */
export const MOCK_AML_RULES: AmlRule[] = [
  { code: 'AML-STR-1', name: 'Structuring / smurfing detection', kind: 'STRUCTURING', severity: 'CRITICAL', active: true, triggered30d: 18, description: 'Multiple transfers just below threshold to a single beneficiary within a window.' },
  { code: 'AML-CTS-1', name: 'Sanctions list hit — beneficiary', kind: 'COUNTERPARTY', severity: 'CRITICAL', active: true, triggered30d: 6, description: 'Beneficiary name matches UN/OFAC/EU listings above 70% confidence.' },
  { code: 'AML-CTS-3', name: 'Sanctions advisory — corporate', kind: 'COUNTERPARTY', severity: 'HIGH', active: true, triggered30d: 11, description: 'Counterparty corporate subject to restrictive measures (partial match).' },
  { code: 'AML-VEL-4', name: 'Rapid successive outbound transfers', kind: 'VELOCITY', severity: 'HIGH', active: true, triggered30d: 74, description: '>8 outbound transfers within 60 minutes to distinct counterparties.' },
  { code: 'AML-AMT-1', name: 'Amount above corridor threshold', kind: 'AMOUNT', severity: 'HIGH', active: true, triggered30d: 32, description: 'Single transfer above 90th percentile for customer peer group.' },
  { code: 'AML-XB-1', name: 'High-value inbound cross-border', kind: 'AMOUNT', severity: 'MEDIUM', active: true, triggered30d: 41, description: 'Cross-border credit without matching historical pattern.' },
  { code: 'AML-GEO-2', name: 'Geo divergence', kind: 'GEO_ANOMALY', severity: 'MEDIUM', active: true, triggered30d: 23, description: 'Device/agent geography diverges from customer home city.' },
  { code: 'AML-FX-1', name: 'FX arbitrage / round-trip pattern', kind: 'BEHAVIOUR', severity: 'MEDIUM', active: true, triggered30d: 9, description: 'Repeated NGN↔XOF conversions at near-identical rates.' },
];

/* ================================================================== */
/* Integrations + health                                               */
/* ================================================================== */
export const MOCK_INTEGRATIONS: PortalIntegration[] = [
  { id: 'INT-1', provider: 'Coris Bank Niger Republic', purpose: 'Settlement switch, XOF rails & account enquiry', kind: 'PAYMENT', country: 'NE', status: 'CONNECTED', lastSyncAt: ago(2), latencyMs: 220, webhookPath: '/webhooks/banks/coris', authMode: 'MTLS' },
  { id: 'INT-2', provider: 'Providus Bank Nigeria', purpose: 'Settlement switch, NGN rails & account enquiry', kind: 'PAYMENT', country: 'NG', status: 'CONNECTED', lastSyncAt: ago(2), latencyMs: 190, webhookPath: '/webhooks/banks/providus', authMode: 'MTLS' },
  { id: 'INT-3', provider: 'NIBSS NIP Gateway', purpose: 'Interbank name enquiry & transfers (NG)', kind: 'PAYMENT', country: 'NG', status: 'CONNECTED', lastSyncAt: ago(3), latencyMs: 160, webhookPath: '/webhooks/nibss/nip', authMode: 'API_KEY' },
  { id: 'INT-4', provider: 'Identity provider — Niger (CNI/NINA)', purpose: 'National ID verification & liveness (NE)', kind: 'KYC', country: 'NE', status: 'CONNECTED', lastSyncAt: ago(6), latencyMs: 340, webhookPath: '/webhooks/kyc/ne-id', authMode: 'OAUTH' },
  { id: 'INT-5', provider: 'Identity provider — Nigeria (NIN/BVN)', purpose: 'NIN verification, BVN match & liveness (NG)', kind: 'KYC', country: 'NG', status: 'DEGRADED', lastSyncAt: ago(44), latencyMs: 980, webhookPath: '/webhooks/kyc/ng-id', authMode: 'OAUTH' },
  { id: 'INT-6', provider: 'Sanctions data — UN / OFAC / EU', purpose: 'Automated watchlist ingestion', kind: 'SCREENING', country: 'NG+NE', status: 'CONNECTED', lastSyncAt: ago(45), latencyMs: 210, webhookPath: '/webhooks/screening/lists', authMode: 'API_KEY' },
  { id: 'INT-7', provider: 'CENTIF Niger advisories', purpose: 'National sanctions advisories (NE)', kind: 'SCREENING', country: 'NE', status: 'CONNECTED', lastSyncAt: ago(300), latencyMs: 260, webhookPath: '/webhooks/screening/centif', authMode: 'API_KEY' },
  { id: 'INT-8', provider: 'Notification engine', purpose: 'Officer alerts, SMS/email & in-app events', kind: 'NOTIFICATION', country: 'NG+NE', status: 'CONNECTED', lastSyncAt: ago(1), latencyMs: 90, webhookPath: '/webhooks/notify', authMode: 'API_KEY' },
];

export const MOCK_HEALTH: PortalHealthService[] = [
  { id: 'HTH-API', name: 'API Gateway', category: 'Core', status: 'OPERATIONAL', latencyMs: 84, lastCheckAt: ago(0), detail: '237 route handlers healthy' },
  { id: 'HTH-DB', name: 'Database', category: 'Core', status: 'OPERATIONAL', latencyMs: 12, lastCheckAt: ago(0), detail: 'Ledger invariant PASSED' },
  { id: 'HTH-AUTH', name: 'Authentication & MFA', category: 'Identity', status: 'OPERATIONAL', latencyMs: 160, lastCheckAt: ago(1) },
  { id: 'HTH-KYC', name: 'KYC Service', category: 'Due diligence', status: 'OPERATIONAL', latencyMs: 320, lastCheckAt: ago(1) },
  { id: 'HTH-AML', name: 'AML Engine', category: 'Monitoring', status: 'OPERATIONAL', latencyMs: 210, lastCheckAt: ago(0), detail: '8 rules active' },
  { id: 'HTH-RISK', name: 'Risk Engine', category: 'Monitoring', status: 'OPERATIONAL', latencyMs: 150, lastCheckAt: ago(1) },
  { id: 'HTH-SCR', name: 'Screening Service', category: 'Monitoring', status: 'DEGRADED', latencyMs: 760, lastCheckAt: ago(2), detail: 'CENTIF feed updating — fallback active' },
  { id: 'HTH-TXM', name: 'Transaction Monitor', category: 'Monitoring', status: 'OPERATIONAL', latencyMs: 140, lastCheckAt: ago(0) },
  { id: 'HTH-NOT', name: 'Notification Engine', category: 'Core', status: 'OPERATIONAL', latencyMs: 90, lastCheckAt: ago(0) },
  { id: 'HTH-WHK', name: 'Webhooks', category: 'Core', status: 'OPERATIONAL', latencyMs: 110, lastCheckAt: ago(0), detail: 'Outbox empty' },
];

/* ================================================================== */
/* Helpers (masking + display order)                                   */
/* XOF is the primary market currency — NGN second. Never USD.        */
/* ================================================================== */
export const MARKET_CURRENCIES = ['XOF', 'NGN'] as const;

export function maskRef(s: string): string {
  return s.length <= 6 ? s : `${s.slice(0, 3)}****${s.slice(-3)}`;
}

export const screeningToSummary = (s: ScreeningSummary): 'CLEAN' | 'POTENTIAL_MATCH' | 'CONFIRMED_MATCH' => s;
