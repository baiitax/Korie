import {
  MerchantOrganization,
  MerchantBranch,
  MerchantStaffUser,
  MerchantPaymentTransaction,
  MerchantPaymentLink,
  MerchantInvoice,
  MerchantCustomerCRM,
  MerchantSettlementBatch,
  MerchantDisputeRecord,
  MerchantApiKey,
  MerchantWebhookEndpoint,
} from "@/types/merchant";

// ==========================================
// 1. AUTHENTICATED MERCHANT ORGANIZATION
// ==========================================
export const CURRENT_MERCHANT: MerchantOrganization = {
  id: "mch-org-001",
  businessName: "Sahara Wholesale Supermarket & Agro Ltd",
  tradingName: "Sahara Wholesale & Retail",
  merchantCode: "MCH-SAHARA-001",
  cacNumber: "RC-1920491",
  tinNumber: "23910293-0001",
  email: "admin@saharasupermarket.ng",
  phone: "+234 1 888 5674",
  country: "NG",
  currency: "NGN",
  category: "Retail, FMCG & Agricultural Trading",
  tier: "ENTERPRISE",
  kybStatus: "VERIFIED",
  availableBalance: 8630000,
  pendingSettlement: 1840000,
  totalGrossSalesToday: 3450000,
  totalGrossVolume: 94200000,
  settlementBank: "Providus Bank Nigeria",
  settlementAccountMasked: "0123****91",
  activeQRCodesCount: 14,
  activePOSCount: 6,
  branchesCount: 3,
  createdAt: "2024-03-15T09:00:00Z",
};

// ==========================================
// 2. MERCHANT BRANCH NETWORK
// ==========================================
export const MERCHANT_BRANCHES: MerchantBranch[] = [
  {
    id: "br-01",
    merchantId: "mch-org-001",
    branchName: "Victoria Island Flagship Store",
    branchCode: "BR-LOS-01",
    address: "Plot 12, Adeola Odeku Street, Victoria Island",
    city: "Lagos",
    state: "Lagos State",
    stateOrRegion: "Lagos State",
    country: "NG",
    managerName: "Tunde Bakare",
    virtualNuban: "9928193820",
    posTerminalsCount: 4,
    todaySales: 3450000,
    todayGrossSales: 3450000,
    todayTransactionsCount: 142,
    status: "ACTIVE",
  },
  {
    id: "br-02",
    merchantId: "mch-org-001",
    branchName: "Kano Central Distribution Depot",
    branchCode: "BR-KAN-02",
    address: "Bompai Industrial Area, Fagge",
    city: "Kano",
    state: "Kano State",
    stateOrRegion: "Kano State",
    country: "NG",
    managerName: "Alhaji Bello Sani",
    virtualNuban: "9928193821",
    posTerminalsCount: 2,
    todaySales: 2840000,
    todayGrossSales: 2840000,
    todayTransactionsCount: 88,
    status: "ACTIVE",
  },
  {
    id: "br-03",
    merchantId: "mch-org-001",
    branchName: "Niamey Commercial Cross-Border Depot",
    branchCode: "BR-NIA-03",
    address: "Zone Industrielle de Niamey",
    city: "Niamey",
    state: "Niamey Region",
    stateOrRegion: "Niamey Region",
    country: "NE",
    managerName: "Mamadou Oumarou",
    virtualNuban: "9928193822",
    posTerminalsCount: 2,
    todaySales: 1890000,
    todayGrossSales: 1890000,
    todayTransactionsCount: 46,
    status: "ACTIVE",
  },
];

// ==========================================
// 3. STAFF & RBAC TEAM
// ==========================================
export const MERCHANT_STAFF: MerchantStaffUser[] = [
  {
    id: "usr-01",
    fullName: "Tunde Bakare",
    email: "tunde.bakare@saharasupermarket.com",
    phone: "+234 803 123 4567",
    role: "MERCHANT_OWNER",
    branchId: "ALL",
    status: "ACTIVE",
    lastLoginAt: "2026-09-03T09:15:00Z",
    permissions: ["ALL_ACCESS", "MANAGE_BANK_ACCOUNTS", "INVITE_ADMIN", "API_ROTATION"],
  },
  {
    id: "usr-02",
    fullName: "Fatima Al-Hassan",
    email: "fatima.finance@saharasupermarket.com",
    phone: "+234 802 881 9920",
    role: "FINANCE_MANAGER",
    branchId: "ALL",
    status: "ACTIVE",
    lastLoginAt: "2026-09-03T08:30:00Z",
    permissions: ["VIEW_SETTLEMENTS", "REQUEST_PAYOUT", "VIEW_REPORTS", "REFUND_PAYMENT"],
  },
  {
    id: "usr-03",
    fullName: "Aliyu Harouna",
    email: "aliyu.kano@saharasupermarket.com",
    phone: "+234 803 441 2290",
    role: "BRANCH_MANAGER",
    branchId: "br-02",
    branchName: "Kano Central Distribution Depot",
    status: "ACTIVE",
    lastLoginAt: "2026-09-02T16:45:00Z",
    permissions: ["VIEW_BRANCH_SALES", "CREATE_PAYMENT", "VIEW_TRANSACTIONS"],
  },
];

// ==========================================
// 4. MERCHANT PAYMENT COLLECTIONS FEED
// ==========================================
export const MERCHANT_PAYMENTS: MerchantPaymentTransaction[] = [
  {
    id: "pay-tx-001",
    reference: "KP-2026-MCH-88410",
    providerReference: "PRV-NIP-990412",
    orderId: "ORD-99120",
    customerName: "Dawanau Agro Traders Ltd",
    customerEmail: "finance@dawanau-agro.com",
    customerPhone: "+234 803 123 4567",
    amount: 1500000,
    fee: 22500,
    netAmount: 1477500,
    currency: "NGN",
    paymentMethod: "BANK_TRANSFER",
    narration: "Bulk Maize Shipment B2B Transfer",
    status: "SUCCESSFUL",
    branchId: "br-01",
    branchName: "Victoria Island Flagship Store",
    createdAt: "2026-09-03T11:42:00Z",
    settledAt: "2026-09-03T11:42:02Z",
  },
  {
    id: "pay-tx-002",
    reference: "KP-2026-QR-88409",
    providerReference: "PRV-QR-881204",
    customerName: "Aisha Mohammed",
    customerPhone: "+234 802 881 2004",
    amount: 45000,
    fee: 675,
    netAmount: 44325,
    currency: "NGN",
    paymentMethod: "QR_CODE",
    narration: "In-Store Groceries Dynamic QR",
    status: "SUCCESSFUL",
    branchId: "br-01",
    branchName: "Victoria Island Flagship Store",
    createdAt: "2026-09-03T11:15:00Z",
    settledAt: "2026-09-03T11:15:01Z",
  },
  {
    id: "pay-tx-003",
    reference: "KP-2026-LNK-88408",
    providerReference: "PRV-LNK-774019",
    customerName: "Maradi Grain Importers SARL",
    customerPhone: "+227 90 12 34 56",
    amount: 850000,
    fee: 12750,
    netAmount: 837250,
    currency: "NGN",
    paymentMethod: "PAYMENT_LINK",
    narration: "Cross-Border Sahel Order Link",
    status: "SUCCESSFUL",
    branchId: "br-03",
    branchName: "Niamey Commercial Cross-Border Depot",
    createdAt: "2026-09-03T10:05:00Z",
    settledAt: "2026-09-03T10:05:03Z",
  },
  {
    id: "pay-tx-004",
    reference: "KP-2026-POS-88407",
    providerReference: "SWT-POS-339102",
    customerName: "Chukwudi Okafor",
    customerPhone: "+234 818 991 2233",
    amount: 28500,
    fee: 427.5,
    netAmount: 28072.5,
    currency: "NGN",
    paymentMethod: "CARD_POS",
    narration: "POS Terminal Checkout Slips",
    status: "SUCCESSFUL",
    branchId: "br-01",
    branchName: "Victoria Island Flagship Store",
    createdAt: "2026-09-03T09:30:00Z",
    settledAt: "2026-09-03T09:30:01Z",
  },
];

// ==========================================
// 5. PAYMENT LINKS
// ==========================================
export const MERCHANT_PAYMENT_LINKS: MerchantPaymentLink[] = [
  {
    id: "lnk-01",
    title: "Wholesale Grain Delivery (50 Bags)",
    description: "Direct bank or card checkout for certified grain shipments",
    slug: "sahara-wholesale-grain",
    url: "https://pay.koriepay.com/m/sahara-wholesale-grain",
    type: "REUSABLE",
    amount: 750000,
    currency: "NGN",
    status: "ACTIVE",
    totalCollected: 13500000,
    successfulPaymentsCount: 18,
    redirectUrl: "https://saharasupermarket.com/order-confirmed",
    createdAt: "2026-08-10T10:00:00Z",
  },
  {
    id: "lnk-02",
    title: "Cross-Border Sahel Trade Settlement",
    description: "Multi-currency checkout for Maradi & Niamey trade shipments",
    slug: "sahara-sahel-settlement",
    url: "https://pay.koriepay.com/m/sahara-sahel-settlement",
    type: "REUSABLE",
    currency: "NGN",
    status: "ACTIVE",
    totalCollected: 28400000,
    successfulPaymentsCount: 34,
    createdAt: "2026-08-15T14:30:00Z",
  },
];

// ==========================================
// 6. INVOICES
// ==========================================
export const MERCHANT_INVOICES: MerchantInvoice[] = [
  {
    id: "inv-001",
    invoiceNumber: "INV-2026-0091",
    customerName: "Dawanau Agro Traders Ltd",
    customerEmail: "finance@dawanau-agro.com",
    customerPhone: "+234 803 123 4567",
    items: [
      { id: "item-1", description: "Premium Sorghum (100 Sacks)", quantity: 100, unitPrice: 28000, amount: 2800000 },
      { id: "item-2", description: "Logistics & Cross-Border Freight", quantity: 1, unitPrice: 150000, amount: 150000 },
    ],
    subtotal: 2950000,
    tax: 0,
    discount: 50000,
    total: 2900000,
    currency: "NGN",
    status: "PAID",
    dueDate: "2026-09-15",
    virtualAccountNuban: "9928193820",
    virtualAccountBank: "Providus Bank",
    createdAt: "2026-09-01T10:00:00Z",
  },
  {
    id: "inv-002",
    invoiceNumber: "INV-2026-0092",
    customerName: "Niamey Grain Consortium",
    customerEmail: "procurement@niamey-grain.ne",
    customerPhone: "+227 90 12 34 56",
    items: [
      { id: "item-1", description: "Millet & Maize Batch 40MT", quantity: 40, unitPrice: 45000, amount: 1800000 },
    ],
    subtotal: 1800000,
    tax: 0,
    discount: 0,
    total: 1800000,
    currency: "NGN",
    status: "SENT",
    dueDate: "2026-09-10",
    virtualAccountNuban: "9928193822",
    virtualAccountBank: "Providus Bank",
    createdAt: "2026-09-02T14:00:00Z",
  },
];

// ==========================================
// 7. CUSTOMER CRM DIRECTORY
// ==========================================
export const MERCHANT_CUSTOMERS_CRM: MerchantCustomerCRM[] = [
  {
    id: "crm-01",
    fullName: "Dawanau Agro Traders Ltd",
    email: "finance@dawanau-agro.com",
    phone: "+234 803 123 4567",
    totalSpent: 34500000,
    totalTransactionsCount: 42,
    lastTransactionDate: "2026-09-03",
    status: "ACTIVE",
  },
  {
    id: "crm-02",
    fullName: "Aisha Mohammed",
    email: "aisha.mohammed@koriepay.com",
    phone: "+234 802 881 2004",
    totalSpent: 1840000,
    totalTransactionsCount: 19,
    lastTransactionDate: "2026-09-03",
    status: "ACTIVE",
  },
  {
    id: "crm-03",
    fullName: "Maradi Grain Importers SARL",
    email: "maradi.grain@sahel.ne",
    phone: "+227 90 12 34 56",
    totalSpent: 18450000,
    totalTransactionsCount: 28,
    lastTransactionDate: "2026-09-02",
    status: "ACTIVE",
  },
];

// ==========================================
// 8. SETTLEMENT BATCHES
// ==========================================
export const MERCHANT_SETTLEMENTS: MerchantSettlementBatch[] = [
  {
    id: "stl-mch-091",
    batchReference: "PRV-SETTL-MCH-99410",
    nibssSessionId: "9920192830192039",
    grossAmount: 4820000,
    totalFees: 72300,
    netAmount: 4747700,
    currency: "NGN",
    bankName: "Providus Bank Nigeria",
    accountNumber: "0123****91",
    status: "SETTLED",
    transactionCount: 184,
    settledAt: "2026-09-02T23:59:00Z",
  },
  {
    id: "stl-mch-090",
    batchReference: "PRV-SETTL-MCH-88419",
    nibssSessionId: "9920192830192020",
    grossAmount: 6240000,
    totalFees: 93600,
    netAmount: 6146400,
    currency: "NGN",
    bankName: "Providus Bank Nigeria",
    accountNumber: "0123****91",
    status: "SETTLED",
    transactionCount: 220,
    settledAt: "2026-09-01T23:59:00Z",
  },
];

// ==========================================
// 9. API & DEVELOPER CREDENTIALS
// ==========================================
export const MERCHANT_API_KEYS: MerchantApiKey[] = [
  {
    id: "key-prod-01",
    keyName: "Production E-Commerce API Key",
    publicKey: "pk_live_korie_9948120394810293",
    secretKeyMasked: "kp_live_••••••••••••••••3910",
    environment: "PRODUCTION",
    lastUsedAt: "2 mins ago",
    createdAt: "2025-11-10",
  },
  {
    id: "key-test-02",
    keyName: "Staging Sandbox API Key",
    publicKey: "pk_test_korie_4491820391028374",
    secretKeyMasked: "kp_test_••••••••••••••••8812",
    environment: "SANDBOX",
    lastUsedAt: "Yesterday",
    createdAt: "2026-01-15",
  },
];

export const MERCHANT_WEBHOOKS: MerchantWebhookEndpoint[] = [
  {
    id: "wh-01",
    url: "https://api.saharasupermarket.com/v1/koriepay-webhook",
    events: ["payment.successful", "payment.failed", "refund.created", "settlement.completed"],
    status: "ACTIVE",
    secretMasked: "whsec_••••••••••••••••1049",
    successRate: 99.8,
    lastDelivery: "Just now (HTTP 200)",
  },
];

export const MERCHANT_DISPUTES: MerchantDisputeRecord[] = [
  {
    id: "DSP-2026-8812",
    customerName: "Alhaji Musa Dan-Kano",
    amount: 125000,
    currency: "NGN",
    reason: "Customer claims delivery delay on wholesale grain shipment",
    status: "RESOLVED",
    resolvedAt: "2026-09-02T14:30:00Z",
    createdAt: "2026-09-01T14:30:00Z",
  },
];
