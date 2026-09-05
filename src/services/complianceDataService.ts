import {
  ComplianceOfficer,
  KycVerificationRecord,
  KybVerificationRecord,
  AmlAlert,
  SanctionsAlert,
  ComplianceCase,
  AccountRestriction,
  RealtimeRiskTelemetry,
  RegulatoryReport,
  CompliancePolicy,
  ComplianceCalendarEvent,
  ComplianceAuditEntry,
} from '@/types/compliance';

// ==========================================
// 1. COMPLIANCE OFFICERS
// ==========================================
export const MOCK_COMPLIANCE_OFFICERS: ComplianceOfficer[] = [
  {
    id: 'OFF-001',
    fullName: 'Amina Bello, CAMS',
    email: 'amina.bello@koriepay.internal',
    role: 'HEAD_OF_COMPLIANCE',
    jurisdiction: 'NG',
    assignedCasesCount: 5,
    status: 'ACTIVE',
  },
  {
    id: 'OFF-002',
    fullName: 'Mamadou Ousmane',
    email: 'mamadou.ousmane@koriepay.internal',
    role: 'MLRO',
    jurisdiction: 'NE',
    assignedCasesCount: 3,
    status: 'ACTIVE',
  },
  {
    id: 'OFF-003',
    fullName: 'Chukwuemeka Nnamdi',
    email: 'c.nnamdi@koriepay.internal',
    role: 'AML_ANALYST',
    jurisdiction: 'NG',
    assignedCasesCount: 7,
    status: 'ACTIVE',
  },
  {
    id: 'OFF-004',
    fullName: 'Fatima Garba',
    email: 'fatima.garba@koriepay.internal',
    role: 'KYC_ANALYST',
    jurisdiction: 'NG',
    assignedCasesCount: 4,
    status: 'ACTIVE',
  },
];

export const COMPLIANCE_OFFICERS = MOCK_COMPLIANCE_OFFICERS;

// ==========================================
// 2. KYC VERIFICATION RECORDS (CUSTOMERS)
// ==========================================
export const MOCK_KYC_RECORDS: KycVerificationRecord[] = [
  {
    id: 'KYC-NG-88912',
    customerId: 'CUST-NG-88912',
    customerName: 'Ibrahim Danladi',
    email: 'i.danladi@kanotrades.com',
    phone: '+234 803 123 4567',
    jurisdiction: 'NG',
    tier: 'TIER_3',
    status: 'VERIFIED',
    riskRating: 'LOW',
    maskedNin: '2938******492',
    maskedBvn: '2283******912',
    ninVerificationStatus: 'VERIFIED_NIMC',
    bvnVerificationStatus: 'MATCHED_NIBSS',
    address: 'Plot 44 Sabon Gari Market Road, Fagge LGA, Kano State',
    addressVerificationStatus: 'VERIFIED',
    documents: [
      { type: 'NIN_SLIP', fileName: 'nin_danladi_verified.pdf', status: 'VERIFIED' },
      { type: 'UTILITY_BILL', fileName: 'kedco_electricity_bill_jul2026.pdf', status: 'VERIFIED' },
      { type: 'BIOMETRIC_SELFIE', fileName: 'liveness_capture_danladi.png', status: 'VERIFIED' },
    ],
    submittedAt: '2026-08-28T09:15:00Z',
    updatedAt: '2026-08-29T11:30:00Z',
    assignedOfficer: 'Fatima Garba',
    verificationNotes: 'NIN biometric match score 98.4%. Utility address physically verified by Kano field team.',
  },
  {
    id: 'KYC-NG-88944',
    customerId: 'CUST-NG-88944',
    customerName: 'Blessing Adebayo',
    email: 'blessing.adebayo@lagosb2b.ng',
    phone: '+234 812 987 6543',
    jurisdiction: 'NG',
    tier: 'TIER_2',
    status: 'IN_REVIEW',
    riskRating: 'MEDIUM',
    maskedNin: '5849******109',
    maskedBvn: '2211******849',
    ninVerificationStatus: 'VERIFIED_NIMC',
    bvnVerificationStatus: 'MATCHED_NIBSS',
    address: '12 Awolowo Way, Ikeja, Lagos State',
    addressVerificationStatus: 'PENDING_DOCUMENT',
    documents: [
      { type: 'NIN_SLIP', fileName: 'nin_adebayo.pdf', status: 'VERIFIED' },
      { type: 'DRIVERS_LICENSE', fileName: 'frsc_license_adebayo.jpg', status: 'VERIFIED' },
    ],
    submittedAt: '2026-09-01T14:20:00Z',
    assignedOfficer: 'Fatima Garba',
    verificationNotes: 'Awaiting submission of recent utility bill for Tier 3 upgrade.',
  },
  {
    id: 'KYC-NE-44019',
    customerId: 'CUST-NE-44019',
    customerName: 'Moussa Boubacar',
    email: 'm.boubacar@sahelgrain.ne',
    phone: '+227 90 12 34 56',
    jurisdiction: 'NE',
    tier: 'TIER_3',
    status: 'VERIFIED',
    riskRating: 'LOW',
    maskedNin: 'NE-NIN-99120',
    ninVerificationStatus: 'VERIFIED_BCEAO_REGISTRY',
    address: 'Quartier Plateau, Avenue de la République, Niamey, Niger',
    addressVerificationStatus: 'VERIFIED',
    documents: [
      { type: 'PASSPORT_NIGERIEN', fileName: 'passeport_boubacar.pdf', status: 'VERIFIED' },
      { type: 'NIGELEC_BILL', fileName: 'nigelec_facture_aout2026.pdf', status: 'VERIFIED' },
    ],
    submittedAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-21T08:45:00Z',
    assignedOfficer: 'Mamadou Ousmane',
    verificationNotes: 'Passport verified with Direction Générale de la Police Nationale Niamey.',
  },
];

export const KYC_RECORDS = MOCK_KYC_RECORDS;

// ==========================================
// 3. KYB VERIFICATION RECORDS (MERCHANTS)
// ==========================================
export const MOCK_KYB_RECORDS: KybVerificationRecord[] = [
  {
    id: 'KYB-NG-1004',
    merchantId: 'MCH-NG-1004',
    businessName: 'Dawanau Grain Consolidated Enterprises Ltd',
    businessType: 'LIMITED_COMPANY',
    registrationNumber: 'RC-1849204',
    taxIdentificationNumber: '24910293-0001',
    jurisdiction: 'NG',
    status: 'VERIFIED',
    riskRating: 'LOW',
    cacValidationStatus: 'VERIFIED_CAC_PORTAL',
    beneficialOwners: [
      { name: 'Alhaji Sani Dawanau', ownershipPercentage: 60, nationality: 'Nigerian', maskedIdNumber: '2948******102', pepStatus: false },
      { name: 'Hajiya Maryam Dawanau', ownershipPercentage: 40, nationality: 'Nigerian', maskedIdNumber: '1940******847', pepStatus: false },
    ],
    operatingAddress: 'Warehouse Block 12, Dawanau International Market, Dawakin Tofa, Kano',
    documents: [
      { type: 'CAC_STATUS_REPORT', fileName: 'cac_cert_dawanau.pdf', status: 'VERIFIED' },
      { type: 'MEMART', fileName: 'memart_dawanau_cons.pdf', status: 'VERIFIED' },
      { type: 'TAX_CLEARANCE', fileName: 'firs_tcc_2025_2026.pdf', status: 'VERIFIED' },
    ],
    submittedAt: '2026-08-15T11:00:00Z',
    updatedAt: '2026-08-16T14:30:00Z',
    assignedOfficer: 'Amina Bello, CAMS',
    verificationNotes: 'Corporate Affairs Commission registration certified. Full UBO unmasking complete.',
  },
  {
    id: 'KYB-NE-2009',
    merchantId: 'MCH-NE-2009',
    businessName: 'Société Sahélienne de Transit & Logistique SARL',
    businessType: 'LIMITED_COMPANY',
    registrationNumber: 'RCCM-NE-NIA-2023-B-8491',
    taxIdentificationNumber: 'NIF-9920192834',
    jurisdiction: 'NE',
    status: 'VERIFIED',
    riskRating: 'LOW',
    cacValidationStatus: 'VERIFIED_RCCM_NIAMEY',
    beneficialOwners: [
      { name: 'Ousmane Mamane', ownershipPercentage: 100, nationality: 'Nigerien', maskedIdNumber: 'NE-NIN-8812', pepStatus: false },
    ],
    operatingAddress: 'Zone Industrielle, Boulevard du 15 Avril, Niamey, Niger',
    documents: [
      { type: 'RCCM_REGISTRATION', fileName: 'rccm_transitsahel.pdf', status: 'VERIFIED' },
      { type: 'STATUTS_SOCIETE', fileName: 'statuts_sarl_transitsahel.pdf', status: 'VERIFIED' },
    ],
    submittedAt: '2026-08-18T09:00:00Z',
    updatedAt: '2026-08-19T10:15:00Z',
    assignedOfficer: 'Mamadou Ousmane',
    verificationNotes: 'RCCM registry and NIF tax identifier verified through Niamey Chamber of Commerce.',
  },
];

export const KYB_RECORDS = MOCK_KYB_RECORDS;

// ==========================================
// 4. AML ALERTS
// ==========================================
export const MOCK_AML_ALERTS: AmlAlert[] = [
  {
    id: 'ALT-AML-2026-0041',
    ruleCode: 'AML-VEL-01',
    ruleName: 'Rapid Cashout Post-Inflow (Velocity Spike)',
    entityType: 'AGENT',
    entityId: 'AGT-NG-0188',
    entityName: 'Kantin Kwari Point 4 (Kabiru Lawan)',
    jurisdiction: 'NG',
    transactionAmount: 4850000,
    currency: 'NGN',
    severity: 'CRITICAL',
    riskLevel: 'CRITICAL',
    status: 'NEW',
    triggerReason: 'Account received ₦4.85M via 3 dynamic virtual NUBANs and attempted instant full cash-out within 4 minutes.',
    triggeredAt: '2026-09-03T11:28:00Z',
  },
  {
    id: 'ALT-AML-2026-0042',
    ruleCode: 'AML-STRUCT-03',
    ruleName: 'Potential Smurfing (Structuring Anomaly)',
    entityType: 'CUSTOMER',
    entityId: 'CUST-NG-88944',
    entityName: 'Blessing Adebayo',
    jurisdiction: 'NG',
    transactionAmount: 4950000,
    currency: 'NGN',
    severity: 'HIGH',
    riskLevel: 'HIGH',
    status: 'NEW',
    triggerReason: '3 consecutive transfers of ₦4,950,000 sent just under the statutory ₦5.0M NFIU CTR threshold within 2 hours.',
    triggeredAt: '2026-09-03T10:15:00Z',
  },
  {
    id: 'ALT-AML-2026-0043',
    ruleCode: 'AML-XBORDER-02',
    ruleName: 'Unusual Corridor Volume Surge (Kano-Niamey)',
    entityType: 'MERCHANT',
    entityId: 'MCH-NE-2009',
    entityName: 'Société Sahélienne de Transit & Logistique SARL',
    jurisdiction: 'NE',
    transactionAmount: 18500000,
    currency: 'XOF',
    severity: 'MEDIUM',
    riskLevel: 'MEDIUM',
    status: 'NEW',
    triggerReason: 'Cross-border settlement volume exceeds 30-day moving average by 380% without prior commercial invoice notice.',
    triggeredAt: '2026-09-03T08:45:00Z',
  },
];

export const AML_ALERTS = MOCK_AML_ALERTS;

// ==========================================
// 5. SANCTIONS & WATCHLIST ALERTS
// ==========================================
export const MOCK_SANCTIONS_ALERTS: SanctionsAlert[] = [
  {
    id: 'SNC-2026-0091',
    targetEntityId: 'CUST-NG-99018',
    targetEntityName: 'Al-Hassan Al-Mahmoud',
    entityType: 'CUSTOMER',
    jurisdiction: 'NG',
    watchlistName: 'UN Security Council 1267/1989 Sanctions List',
    matchedNameOnList: 'Al-Mahmoud, Hassan',
    matchScore: 88,
    matchType: 'FUZZY',
    category: 'TERRORISM',
    status: 'POTENTIAL_MATCH',
    screenedAt: '2026-09-03T09:30:00Z',
  },
  {
    id: 'SNC-2026-0092',
    targetEntityId: 'MCH-NE-77810',
    targetEntityName: 'Sahel Mining & Minerals Logistics SARL',
    entityType: 'MERCHANT',
    jurisdiction: 'NE',
    watchlistName: 'OFAC Specially Designated Nationals (SDN)',
    matchedNameOnList: 'Sahel Minerals Trade Ltd',
    matchScore: 79,
    matchType: 'FUZZY',
    category: 'NARCOTICS',
    status: 'POTENTIAL_MATCH',
    screenedAt: '2026-09-02T16:00:00Z',
  },
];

export const SANCTIONS_MATCHES = MOCK_SANCTIONS_ALERTS;

// ==========================================
// 6. COMPLIANCE CASES
// ==========================================
export const MOCK_COMPLIANCE_CASES: ComplianceCase[] = [
  {
    id: 'CAS-2026-0041',
    caseNumber: 'CAS-2026-0041',
    caseType: 'SUSPICIOUS_ACTIVITY',
    title: 'High Velocity Card Cashout at Kantin Kwari Point 4',
    targetEntityType: 'AGENT',
    targetEntityId: 'AGT-NG-0188',
    targetEntityName: 'Kantin Kwari Point 4 (Kabiru Lawan)',
    jurisdiction: 'NG',
    riskLevel: 'CRITICAL',
    priority: 'URGENT',
    status: 'UNDER_REVIEW',
    assignedOfficerId: 'OFF-003',
    assignedOfficerName: 'Chukwuemeka Nnamdi',
    createdAt: '2026-09-03T11:35:00Z',
    updatedAt: '2026-09-03T12:00:00Z',
    deadlineSla: '2026-09-04T11:35:00Z',
    summary: 'Case initiated after AML velocity trigger AML-VEL-01 flagged ₦4.85M inflow dispersed to 4 sub-wallets within 4 minutes.',
    involvedAmount: 4850000,
    currency: 'NGN',
    relatedAlertIds: ['ALT-AML-2026-0041'],
    timeline: [
      { id: 'TL-1', timestamp: '2026-09-03T11:28:00Z', officerName: 'System Engine', action: 'ALERT_GENERATED', description: 'Triggered Rule AML-VEL-01' },
      { id: 'TL-2', timestamp: '2026-09-03T11:35:00Z', officerName: 'Chukwuemeka Nnamdi', action: 'CASE_OPENED', description: 'Escalated alert to formal case investigation' },
      { id: 'TL-3', timestamp: '2026-09-03T12:00:00Z', officerName: 'Amina Bello, CAMS', action: 'RESTRICTION_APPLIED', description: 'Temporary Post-No-Debit (PND) placed on wallet pending explanation' },
    ],
    evidence: [
      { id: 'EVD-1', title: 'PAX POS Terminal #04 Batch Audit Logs', fileType: 'TRANSACTION_LOG', fileUrl: '/vault/pax_04_batch.pdf', uploadedByOfficer: 'Chukwuemeka Nnamdi', uploadedAt: '2026-09-03T11:45:00Z' },
    ],
    internalNotes: [
      { id: 'NT-1', timestamp: '2026-09-03T11:50:00Z', officerName: 'Chukwuemeka Nnamdi', content: 'Agent contacted via telephone. Stated cash was for Kano grain trader wholesale purchase. Demanded invoice verification.', isConfidential: false },
    ],
    decision: {
      isResolved: false,
      requiresNfiuCentifFiling: true,
    },
  },
  {
    id: 'CAS-2026-0038',
    caseNumber: 'CAS-2026-0038',
    caseType: 'ENHANCED_DILIGENCE',
    title: 'Cross-Border FX Liquidity Arbitrage Surveillance',
    targetEntityType: 'MERCHANT',
    targetEntityId: 'MCH-NE-2009',
    targetEntityName: 'Société Sahélienne de Transit & Logistique SARL',
    jurisdiction: 'NE',
    riskLevel: 'MEDIUM',
    priority: 'MEDIUM',
    status: 'UNDER_REVIEW',
    assignedOfficerId: 'OFF-002',
    assignedOfficerName: 'Mamadou Ousmane',
    createdAt: '2026-09-01T14:00:00Z',
    updatedAt: '2026-09-02T16:30:00Z',
    deadlineSla: '2026-09-05T14:00:00Z',
    summary: 'Bi-annual Enhanced Due Diligence review of high-value cross-border trade transactions between Kano and Niamey.',
    involvedAmount: 18500000,
    currency: 'XOF',
    relatedAlertIds: ['ALT-AML-2026-0043'],
    timeline: [
      { id: 'TL-10', timestamp: '2026-09-01T14:00:00Z', officerName: 'Mamadou Ousmane', action: 'CASE_OPENED', description: 'Initiated bi-annual EDD review' },
    ],
    evidence: [
      { id: 'EVD-10', title: 'BCEAO Customs Declaration Bill of Lading (40MT Sorghum)', fileType: 'TRADE_INVOICE', fileUrl: '/vault/bceao_customs_40mt.pdf', uploadedByOfficer: 'Mamadou Ousmane', uploadedAt: '2026-09-02T10:00:00Z' },
    ],
    internalNotes: [
      { id: 'NT-10', timestamp: '2026-09-02T16:00:00Z', officerName: 'Mamadou Ousmane', content: 'Waybill matches declared commodities. Recommending clearance upon bank statement confirmation.', isConfidential: false },
    ],
    decision: {
      isResolved: false,
      requiresNfiuCentifFiling: false,
    },
  },
];

export const COMPLIANCE_CASES = MOCK_COMPLIANCE_CASES;

// ==========================================
// 7. ACCOUNT RESTRICTIONS
// ==========================================
export const MOCK_ACCOUNT_RESTRICTIONS: AccountRestriction[] = [
  {
    id: 'RST-00491',
    targetEntityType: 'AGENT',
    targetEntityId: 'AGT-NG-0188',
    targetEntityName: 'Kantin Kwari Point 4 (Kabiru Lawan)',
    jurisdiction: 'NG',
    restrictionType: 'DEBIT_SUSPENSION',
    reason: 'AML_VELOCITY_ANOMALY',
    rationale: 'Active investigation into rapid cash-out structuring under Case CAS-2026-0041.',
    courtOrderReference: 'NFIU/ENF/2026/092',
    makerOfficerId: 'OFF-003',
    makerOfficerName: 'Chukwuemeka Nnamdi',
    checkerOfficerId: 'OFF-001',
    checkerOfficerName: 'Amina Bello, CAMS',
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    appliedAt: '2026-09-03T12:00:00Z',
  },
  {
    id: 'RST-00489',
    targetEntityType: 'CUSTOMER',
    targetEntityId: 'CUST-NG-99018',
    targetEntityName: 'Al-Hassan Al-Mahmoud',
    jurisdiction: 'NG',
    restrictionType: 'TOTAL_FREEZE',
    reason: 'SANCTIONS_MATCH',
    rationale: 'Potential match with UN Security Council list awaiting MLRO final confirmation.',
    makerOfficerId: 'OFF-004',
    makerOfficerName: 'Fatima Garba',
    status: 'PENDING_MAKER_CHECKER',
    approvalStatus: 'PENDING_APPROVAL',
    appliedAt: '2026-09-03T09:45:00Z',
  },
];

// ==========================================
// 8. REALTIME RISK TELEMETRY
// ==========================================
export const MOCK_REALTIME_RISK_TELEMETRY: RealtimeRiskTelemetry[] = [
  {
    id: 'TEL-88901',
    transactionId: 'TX-NG-2026-99201',
    originEntityName: 'Alhaji Haruna Sani',
    destinationEntityName: 'Dan-Batta Agro Point',
    amount: 150000,
    currency: 'NGN',
    riskScore: 12,
    ruleDecision: 'PASS',
    timestamp: '2026-09-03T11:58:20Z',
    node: 'Providus Bank Core NG',
  },
  {
    id: 'TEL-88902',
    transactionId: 'TX-NG-2026-99202',
    originEntityName: 'Borno Food Security Trust',
    destinationEntityName: 'Dawanau Grain Consolidated',
    amount: 4500000,
    currency: 'NGN',
    riskScore: 28,
    ruleDecision: 'PASS',
    timestamp: '2026-09-03T11:52:10Z',
    node: 'Providus Virtual NUBAN',
  },
  {
    id: 'TEL-88903',
    transactionId: 'TX-NE-2026-99204',
    originEntityName: 'Moussa Boubacar',
    destinationEntityName: 'Société Sahélienne de Transit',
    amount: 2800000,
    currency: 'XOF',
    riskScore: 78,
    ruleDecision: 'FLAG',
    timestamp: '2026-09-03T11:30:15Z',
    node: 'Coris Bank Core NE',
  },
  {
    id: 'TEL-88904',
    transactionId: 'TX-NG-2026-99209',
    originEntityName: 'Anonymous POS Cashout',
    destinationEntityName: 'Kantin Kwari Point 4',
    amount: 4850000,
    currency: 'NGN',
    riskScore: 94,
    ruleDecision: 'BLOCK',
    timestamp: '2026-09-03T11:28:00Z',
    node: 'Interswitch Gateway Node',
  },
];

export const TRANSACTION_MONITORING = MOCK_REALTIME_RISK_TELEMETRY;

// ==========================================
// 9. STATUTORY REGULATORY REPORTS
// ==========================================
export const MOCK_REGULATORY_REPORTS: RegulatoryReport[] = [
  {
    id: 'REP-NFIU-2026-08',
    reportType: 'NFIU_CTR',
    regulator: 'NFIU',
    jurisdiction: 'NG',
    reportingPeriod: 'August 2026',
    includedTransactionCount: 1420,
    totalValueReported: 890000000,
    currency: 'NGN',
    filingStatus: 'SUBMITTED',
    submissionDate: '2026-09-01T10:00:00Z',
    submittedByOfficer: 'Amina Bello, CAMS',
    acknowledgementRef: 'ACK-NFIU-CTR-2026-08-9941',
  },
  {
    id: 'REP-CENTIF-2026-08',
    reportType: 'CENTIF_DECLARATION',
    regulator: 'CENTIF',
    jurisdiction: 'NE',
    reportingPeriod: 'August 2026',
    includedTransactionCount: 380,
    totalValueReported: 320000000,
    currency: 'XOF',
    filingStatus: 'READY_FOR_SUBMISSION',
  },
  {
    id: 'REP-CBN-2026-08',
    reportType: 'CBN_MONTHLY_AML',
    regulator: 'CBN',
    jurisdiction: 'NG',
    reportingPeriod: 'August 2026',
    includedTransactionCount: 45,
    totalValueReported: 125000000,
    currency: 'NGN',
    filingStatus: 'DRAFT',
  },
];

export const REGULATORY_REPORTS = MOCK_REGULATORY_REPORTS;

// ==========================================
// 10. COMPLIANCE POLICIES
// ==========================================
export const MOCK_COMPLIANCE_POLICIES: CompliancePolicy[] = [
  {
    id: 'POL-01',
    title: 'AML/CFT & Proliferation Financing Master Policy',
    code: 'POL-AML-CFT-v4',
    version: '4.2',
    jurisdiction: 'CROSS_BORDER',
    approvedBy: 'KoriePay Board Audit & Risk Committee',
    effectiveDate: '2026-01-01',
    nextReviewDate: '2026-12-31',
    status: 'ACTIVE',
    summary: 'Defines risk-based due diligence, automated transaction surveillance parameters, sanctions screening rules, and NFIU/CENTIF filing obligations.',
    documentUrl: '/policies/koriepay_aml_cft_master_v4.pdf',
  },
  {
    id: 'POL-02',
    title: 'Customer Identity (KYC) & Tiering Standards Policy',
    code: 'POL-KYC-TIER-v3',
    version: '3.1',
    jurisdiction: 'NG',
    approvedBy: 'Central Bank of Nigeria Regulatory Liaison',
    effectiveDate: '2026-03-01',
    nextReviewDate: '2027-02-28',
    status: 'ACTIVE',
    summary: 'Prescribes 3-tier customer onboarding limits, automated NIN/BVN biometric matching, and address verification requirements.',
    documentUrl: '/policies/koriepay_kyc_tiering_v3.pdf',
  },
  {
    id: 'POL-03',
    title: 'Sanctions, PEP & Adverse Media Screening Framework',
    code: 'POL-SNC-PEP-v2',
    version: '2.4',
    jurisdiction: 'CROSS_BORDER',
    approvedBy: 'Amina Bello, CAMS (MLRO)',
    effectiveDate: '2025-11-15',
    nextReviewDate: '2026-11-14',
    status: 'ACTIVE',
    summary: 'Mandates real-time automated fuzzy screening against OFAC, UN Security Council, EU, CBN, and CENTIF Niger watchlists.',
    documentUrl: '/policies/koriepay_sanctions_pep_framework_v2.pdf',
  },
];

export const COMPLIANCE_POLICIES = MOCK_COMPLIANCE_POLICIES;

// ==========================================
// 11. REGULATORY CALENDAR
// ==========================================
export const MOCK_COMPLIANCE_CALENDAR: ComplianceCalendarEvent[] = [
  {
    id: 'CAL-01',
    title: 'NFIU Monthly Currency Transaction Report (CTR) Filing',
    regulator: 'NFIU',
    jurisdiction: 'NG',
    dueDate: '2026-09-07T17:00:00Z',
    status: 'UPCOMING',
    description: 'Mandatory monthly electronic transmission of all transactions exceeding ₦5.0M for individuals and ₦10.0M for corporates.',
  },
  {
    id: 'CAL-02',
    title: 'BCEAO Quarterly AML/CFT Risk Returns (Niger Republic)',
    regulator: 'BCEAO',
    jurisdiction: 'NE',
    dueDate: '2026-09-15T16:00:00Z',
    status: 'UPCOMING',
    description: 'Quarterly compliance and foreign exchange trade reporting for the West African Monetary Union (UMOA).',
  },
  {
    id: 'CAL-03',
    title: 'CBN Annual Periodic KYC Remediations for Tier-3 Merchants',
    regulator: 'CBN',
    jurisdiction: 'NG',
    dueDate: '2026-08-31T23:59:59Z',
    status: 'OVERDUE',
    description: 'Annual re-certification of corporate certificates of incorporation and utility bill address proofs.',
  },
];

export const REGULATORY_CALENDAR = MOCK_COMPLIANCE_CALENDAR;

// ==========================================
// 12. IMMUTABLE AUDIT LOGS
// ==========================================
export const MOCK_COMPLIANCE_AUDIT_LOGS: ComplianceAuditEntry[] = [
  {
    id: 'AUD-2026-9901',
    timestamp: '2026-09-03T12:00:15Z',
    officerId: 'OFF-001',
    officerName: 'Amina Bello, CAMS',
    officerRole: 'HEAD_OF_COMPLIANCE',
    action: 'ACCOUNT_RESTRICTION_APPROVED',
    entityType: 'ACCOUNT_RESTRICTION',
    entityId: 'RST-00491',
    details: 'Dual-authorized debit suspension (PND) on Agent AGT-NG-0188 pending investigation under CAS-2026-0041.',
    jurisdiction: 'NG',
  },
  {
    id: 'AUD-2026-9900',
    timestamp: '2026-09-03T11:35:00Z',
    officerId: 'OFF-003',
    officerName: 'Chukwuemeka Nnamdi',
    officerRole: 'AML_ANALYST',
    action: 'AML_ALERT_ESCALATED',
    entityType: 'COMPLIANCE_CASE',
    entityId: 'CAS-2026-0041',
    details: 'Alert ALT-AML-2026-0041 converted to active investigation case.',
    jurisdiction: 'NG',
  },
  {
    id: 'AUD-2026-9899',
    timestamp: '2026-09-01T10:00:00Z',
    officerId: 'OFF-001',
    officerName: 'Amina Bello, CAMS',
    officerRole: 'HEAD_OF_COMPLIANCE',
    action: 'REGULATORY_REPORT_FILED',
    entityType: 'REGULATORY_REPORT',
    entityId: 'REP-NFIU-2026-08',
    details: 'August 2026 Cash Transaction Report filed with NFIU GoAML portal. Ref: ACK-NFIU-CTR-2026-08-9941.',
    jurisdiction: 'NG',
  },
];

export const COMPLIANCE_AUDIT_LOGS = MOCK_COMPLIANCE_AUDIT_LOGS;
