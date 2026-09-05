import {
  CustomerUser,
  CustomerWallet,
  CustomerTransaction,
  Beneficiary,
  VirtualCard,
  SupportTicket,
  SecuritySession,
  TrustedDevice,
  FXRateQuote,
  BillProviderOption,
  CustomerCurrency,
  CustomerCountry,
} from "@/types/customer";

// ==========================================
// 1. AUTHENTICATED CUSTOMER PROFILE
// ==========================================
export const CURRENT_CUSTOMER: CustomerUser = {
  id: "cust-kp-00418",
  firstName: "Ibrahim",
  lastName: "Dan-Batta",
  fullName: "Ibrahim Dan-Batta",
  email: "ibrahim.danbatta@koriepay.com",
  phone: "+234 803 456 7890",
  country: "NG",
  countryName: "Nigeria",
  kycTier: "TIER_2",
  kycStatus: "VERIFIED",
  preferredLanguage: "en",
  bvnMasked: "BVN 223****891",
  ninMasked: "NIN 234****102",
  registeredAt: "2025-10-14T08:30:00Z",
  mfaEnabled: true,
  biometricEnabled: true,
};

// ==========================================
// 2. MULTI-CURRENCY CUSTOMER WALLETS
// ==========================================
export const CUSTOMER_WALLETS: CustomerWallet[] = [
  {
    id: "wlt-ngn-01",
    currency: "NGN",
    symbol: "₦",
    availableBalance: 2450000,
    ledgerBalance: 2450000,
    pendingBalance: 0,
    accountNumber: "0123984123",
    accountName: "Ibrahim Dan-Batta / KoriePay",
    bankName: "Providus Bank Nigeria",
    bankCode: "101",
    status: "ACTIVE",
    dailyLimit: 5000000,
    dailySpent: 350000,
    isPrimary: true,
  },
  {
    id: "wlt-xof-02",
    currency: "XOF",
    symbol: "CFA",
    availableBalance: 1850000,
    ledgerBalance: 1850000,
    pendingBalance: 0,
    accountNumber: "NE020010012345678901",
    accountName: "Ibrahim Dan-Batta",
    bankName: "Coris Bank Niger Republic",
    bankCode: "NE020",
    status: "ACTIVE",
    dailyLimit: 5000000,
    dailySpent: 120000,
    isPrimary: false,
  },
  {
    id: "wlt-usd-03",
    currency: "USD",
    symbol: "$",
    availableBalance: 1420.5,
    ledgerBalance: 1420.5,
    pendingBalance: 0,
    accountNumber: "USD-DOM-991410",
    accountName: "Ibrahim Dan-Batta",
    bankName: "Providus Bank Foreign Vault",
    bankCode: "101-USD",
    status: "ACTIVE",
    dailyLimit: 10000,
    dailySpent: 250,
    isPrimary: false,
  },
];

// ==========================================
// 3. RECENT CUSTOMER TRANSACTIONS
// ==========================================
export const CUSTOMER_TRANSACTIONS: CustomerTransaction[] = [
  {
    id: "tx-cust-001",
    reference: "KP-2026-NIP-88412",
    providerReference: "PRV-NIP-990141",
    type: "TRANSFER_NIP",
    title: "Transfer to Aisha Mohammed",
    description: "Commercial payment for grain delivery",
    amount: 150000,
    fee: 50,
    totalAmount: 150050,
    currency: "NGN",
    direction: "OUTWARD",
    status: "SUCCESSFUL",
    recipientName: "Aisha Mohammed",
    recipientBank: "Guaranty Trust Bank (GTBank)",
    recipientAccount: "014****891",
    senderName: "Ibrahim Dan-Batta",
    senderBank: "Providus Bank / KoriePay",
    category: "TRANSFERS",
    createdAt: "2026-09-03T10:42:00Z",
    completedAt: "2026-09-03T10:42:02Z",
    timeline: [
      { title: "Transfer Initiated", description: "Customer authenticated with PIN & biometrics", timestamp: "10:42:00 AM", status: "COMPLETED" },
      { title: "Providus Bank Gateway Debited", description: "Cleared through NIBSS Instant Payment rail", timestamp: "10:42:01 AM", status: "COMPLETED" },
      { title: "GTBank Account Credited", description: "Session ID 000013240903104201PRVGTB", timestamp: "10:42:02 AM", status: "COMPLETED" },
      { title: "Ledger Reconciled", description: "Double-entry balance confirmed", timestamp: "10:42:02 AM", status: "COMPLETED" },
    ],
  },
  {
    id: "tx-cust-002",
    reference: "KP-2026-XFER-77192",
    providerReference: "KORIS-SAHEL-004128",
    type: "TRANSFER_CROSS_BORDER",
    title: "Bilateral Corridor to Mamadou Oumarou",
    description: "Cross-border trade payment Kano ⇄ Niamey",
    amount: 250000,
    fee: 1250,
    totalAmount: 251250,
    currency: "NGN",
    sourceCurrency: "NGN",
    destinationCurrency: "XOF",
    exchangeRate: 0.408,
    destinationAmount: 102000,
    direction: "OUTWARD",
    status: "SUCCESSFUL",
    recipientName: "Mamadou Oumarou",
    recipientBank: "Coris Bank Niger Republic",
    recipientAccount: "NE02****2301",
    senderName: "Ibrahim Dan-Batta",
    senderBank: "Providus Bank / KoriePay",
    category: "TRANSFERS",
    createdAt: "2026-09-02T16:15:00Z",
    completedAt: "2026-09-02T16:15:03Z",
    timeline: [
      { title: "Bilateral Transfer Initiated", description: "Cross-border route Providus ⇄ Coris Bank", timestamp: "04:15:00 PM", status: "COMPLETED" },
      { title: "FX Conversion Locked (0.408)", description: "NGN 250,000 converted to 102,000 CFA", timestamp: "04:15:01 PM", status: "COMPLETED" },
      { title: "Coris Bank Sahel Rail Credited", description: "Settled instantly in Niamey clearing account", timestamp: "04:15:03 PM", status: "COMPLETED" },
    ],
  },
  {
    id: "tx-cust-003",
    reference: "KP-2026-BILL-66301",
    providerReference: "AEDC-VEND-104921",
    type: "BILL_ELECTRICITY",
    title: "Abuja Electricity (AEDC) Token",
    description: "Prepaid electricity vending",
    amount: 15000,
    fee: 100,
    totalAmount: 15100,
    currency: "NGN",
    direction: "OUTWARD",
    status: "SUCCESSFUL",
    recipientName: "AEDC Prepaid Distribution",
    billerCategory: "ELECTRICITY",
    billerProvider: "AEDC Abuja",
    billerCustomerToken: "4819-2049-1823-9940-1209",
    category: "BILLS",
    createdAt: "2026-09-01T14:20:00Z",
    completedAt: "2026-09-01T14:20:02Z",
    timeline: [
      { title: "Payment Dispatched", description: "Customer paid from NGN wallet", timestamp: "02:20:00 PM", status: "COMPLETED" },
      { title: "DisCo Server Confirmed", description: "Meter #4502910491 verified", timestamp: "02:20:01 PM", status: "COMPLETED" },
      { title: "Token Vended: 4819-2049-1823-9940-1209", description: "Units: 142.4 kWh", timestamp: "02:20:02 PM", status: "COMPLETED" },
    ],
  },
  {
    id: "tx-cust-004",
    reference: "KP-2026-AIRT-55109",
    type: "BILL_AIRTIME",
    title: "MTN Nigeria Airtime Recharge",
    description: "Recharge for +234 803 456 7890",
    amount: 5000,
    fee: 0,
    totalAmount: 5000,
    currency: "NGN",
    direction: "OUTWARD",
    status: "SUCCESSFUL",
    recipientName: "MTN Nigeria",
    billerCategory: "AIRTIME",
    billerProvider: "MTN",
    category: "BILLS",
    createdAt: "2026-08-30T09:12:00Z",
    completedAt: "2026-08-30T09:12:01Z",
    timeline: [
      { title: "Airtime Request Dispatched", description: "Direct Telco API Integration", timestamp: "09:12:00 AM", status: "COMPLETED" },
      { title: "Delivered to Phone", description: "Network reference MTN-8812049", timestamp: "09:12:01 AM", status: "COMPLETED" },
    ],
  },
  {
    id: "tx-cust-005",
    reference: "KP-2026-FUND-44910",
    providerReference: "PRV-INW-0091823",
    type: "WALLET_FUNDING",
    title: "Direct Inward Bank Transfer",
    description: "Received from Dawanau Agro Supplies",
    amount: 850000,
    fee: 0,
    totalAmount: 850000,
    currency: "NGN",
    direction: "INWARD",
    status: "SUCCESSFUL",
    senderName: "Dawanau Agro Supplies Ltd",
    senderBank: "Zenith Bank",
    senderAccount: "101****412",
    recipientName: "Ibrahim Dan-Batta",
    recipientBank: "Providus Bank / KoriePay",
    category: "FUNDING",
    createdAt: "2026-08-28T11:04:00Z",
    completedAt: "2026-08-28T11:04:01Z",
    timeline: [
      { title: "Inward NIP Notification Received", description: "Providus Bank Webhook Verified", timestamp: "11:04:00 AM", status: "COMPLETED" },
      { title: "Wallet Credited", description: "Available balance increased by ₦850,000", timestamp: "11:04:01 AM", status: "COMPLETED" },
    ],
  },
  {
    id: "tx-cust-006",
    reference: "KP-2026-FX-33910",
    type: "FX_SWAP",
    title: "Currency Exchange (XOF to NGN)",
    description: "Currency exchange into your Naira wallet",
    amount: 50000,
    fee: 250,
    totalAmount: 50250,
    currency: "XOF",
    sourceCurrency: "XOF",
    destinationCurrency: "NGN",
    exchangeRate: 2.31,
    destinationAmount: 114923,
    direction: "OUTWARD",
    status: "SUCCESSFUL",
    category: "FX",
    createdAt: "2026-08-25T15:30:00Z",
    completedAt: "2026-08-25T15:30:02Z",
    timeline: [
      { title: "FX Quote Executed", description: "1 XOF = ₦2.31", timestamp: "03:30:00 PM", status: "COMPLETED" },
      { title: "XOF Balance Debited", description: "50,000 XOF deducted", timestamp: "03:30:01 PM", status: "COMPLETED" },
      { title: "NGN Balance Credited", description: "₦114,923 added to your Naira wallet", timestamp: "03:30:02 PM", status: "COMPLETED" },
    ],
  },
];

// ==========================================
// 4. SAVED BENEFICIARIES
// ==========================================
export const CUSTOMER_BENEFICIARIES: Beneficiary[] = [
  {
    id: "ben-01",
    name: "Aisha Mohammed",
    accountNumber: "0142981891",
    bankName: "Guaranty Trust Bank (GTBank)",
    bankCode: "058",
    currency: "NGN",
    country: "NG",
    avatarColor: "bg-emerald-500",
    lastTransferDate: "2026-09-03",
    isFavorite: true,
  },
  {
    id: "ben-02",
    name: "Mamadou Oumarou",
    accountNumber: "NE020088192301",
    bankName: "Coris Bank Niger Republic",
    bankCode: "NE020",
    currency: "XOF",
    country: "NE",
    avatarColor: "bg-amber-500",
    lastTransferDate: "2026-09-02",
    isFavorite: true,
  },
  {
    id: "ben-03",
    name: "Aliyu Harouna",
    accountNumber: "2019481203",
    bankName: "Zenith Bank Nigeria",
    bankCode: "057",
    currency: "NGN",
    country: "NG",
    avatarColor: "bg-blue-500",
    lastTransferDate: "2026-08-20",
    isFavorite: false,
  },
  {
    id: "ben-04",
    name: "Zainab Moussa SARL",
    accountNumber: "NE020077182900",
    bankName: "Banque Agricole du Niger (BAGRI)",
    bankCode: "NE014",
    currency: "XOF",
    country: "NE",
    avatarColor: "bg-purple-500",
    lastTransferDate: "2026-08-15",
    isFavorite: false,
  },
];

// ==========================================
// 5. VIRTUAL & PHYSICAL CARDS
// ==========================================
export const CUSTOMER_CARDS: VirtualCard[] = [
  {
    id: "card-01",
    cardholderName: "IBRAHIM DAN-BATTA",
    maskedPan: "4111 •••• •••• 4281",
    expiryMonth: "08",
    expiryYear: "29",
    cardType: "VIRTUAL",
    brand: "VISA",
    currency: "USD",
    balance: 850.0,
    spendingLimitMonthly: 5000,
    spentThisMonth: 642.5,
    status: "ACTIVE",
    billingAddress: "Plot 14, Commercial District, Abuja, Nigeria",
    createdAt: "2025-11-20T10:00:00Z",
  },
  {
    id: "card-02",
    cardholderName: "IBRAHIM DAN-BATTA",
    maskedPan: "5399 •••• •••• 9924",
    expiryMonth: "12",
    expiryYear: "28",
    cardType: "PHYSICAL",
    brand: "MASTERCARD",
    currency: "NGN",
    balance: 2450000,
    spendingLimitMonthly: 10000000,
    spentThisMonth: 1240000,
    status: "ACTIVE",
    billingAddress: "Plot 14, Commercial District, Abuja, Nigeria",
    createdAt: "2025-12-05T14:30:00Z",
  },
];

// ==========================================
// 6. BANK DIRECTORY (NIGERIA & NIGER REPUBLIC)
// ==========================================
export interface BankDirectoryEntry {
  code: string;
  name: string;
  country: CustomerCountry;
  currency: CustomerCurrency;
}

export const BANK_DIRECTORY: BankDirectoryEntry[] = [
  // Nigeria (NIP Nodes)
  { code: "101", name: "Providus Bank Nigeria", country: "NG", currency: "NGN" },
  { code: "058", name: "Guaranty Trust Bank (GTBank)", country: "NG", currency: "NGN" },
  { code: "057", name: "Zenith Bank", country: "NG", currency: "NGN" },
  { code: "044", name: "Access Bank", country: "NG", currency: "NGN" },
  { code: "011", name: "First Bank of Nigeria", country: "NG", currency: "NGN" },
  { code: "033", name: "United Bank for Africa (UBA)", country: "NG", currency: "NGN" },
  { code: "035", name: "Wema Bank (ALAT)", country: "NG", currency: "NGN" },
  { code: "214", name: "First City Monument Bank (FCMB)", country: "NG", currency: "NGN" },
  { code: "070", name: "Fidelity Bank", country: "NG", currency: "NGN" },
  { code: "082", name: "Keystone Bank", country: "NG", currency: "NGN" },
  { code: "232", name: "Sterling Bank", country: "NG", currency: "NGN" },

  // Niger Republic (WAEMU / UEMOA Nodes)
  { code: "NE020", name: "Coris Bank Niger Republic", country: "NE", currency: "XOF" },
  { code: "NE014", name: "Banque Agricole du Niger (BAGRI)", country: "NE", currency: "XOF" },
  { code: "NE008", name: "Banque Sahelo-Saharienne (BSIC Niger)", country: "NE", currency: "XOF" },
  { code: "NE003", name: "SONIBANK (Societe Nigerienne de Banque)", country: "NE", currency: "XOF" },
  { code: "NE012", name: "Banque Atlantique Niger (BAPN)", country: "NE", currency: "XOF" },
  { code: "NE018", name: "Bank of Africa Niger (BOA)", country: "NE", currency: "XOF" },
  { code: "NE005", name: "BIA Niger (Banque Internationale pour l'Afrique)", country: "NE", currency: "XOF" },
  { code: "NE001", name: "Ecobank Niger", country: "NE", currency: "XOF" },
];

// ==========================================
// 7. BILL PROVIDERS (AIRTIME, DATA, DISCOS, TV)
// ==========================================
export const BILL_PROVIDERS: BillProviderOption[] = [
  // Airtime & Data Nigeria
  { id: "mtn-ng", name: "MTN Nigeria", code: "MTN", category: "AIRTIME", country: "NG", logoIcon: "MTN" },
  { id: "airtel-ng", name: "Airtel Nigeria", code: "AIRTEL", category: "AIRTIME", country: "NG", logoIcon: "Airtel" },
  { id: "glo-ng", name: "Glo Mobile", code: "GLO", category: "AIRTIME", country: "NG", logoIcon: "Glo" },
  { id: "9mobile-ng", name: "9mobile", code: "9MOBILE", category: "AIRTIME", country: "NG", logoIcon: "9mobile" },

  // Airtime Niger Republic
  { id: "airtel-ne", name: "Airtel Niger", code: "AIRTEL_NE", category: "AIRTIME", country: "NE", logoIcon: "Airtel" },
  { id: "zamani-ne", name: "Zamani Telecom Niger (Orange)", code: "ZAMANI", category: "AIRTIME", country: "NE", logoIcon: "Zamani" },
  { id: "niger-telecoms", name: "Niger Telecoms (Al-Izza)", code: "NIGER_TEL", category: "AIRTIME", country: "NE", logoIcon: "NigerTel" },

  // Electricity Distribution Companies (DisCos)
  { id: "aedc", name: "AEDC — Abuja Electricity Distribution", code: "AEDC", category: "ELECTRICITY", country: "NG", logoIcon: "Power" },
  { id: "ekedc", name: "EKEDC — Eko Electricity (Lagos)", code: "EKEDC", category: "ELECTRICITY", country: "NG", logoIcon: "Power" },
  { id: "ikedc", name: "IKEDC — Ikeja Electric (Lagos)", code: "IKEDC", category: "ELECTRICITY", country: "NG", logoIcon: "Power" },
  { id: "kedco", name: "KEDCO — Kano Electricity Distribution", code: "KEDCO", category: "ELECTRICITY", country: "NG", logoIcon: "Power" },
  { id: "ibedc", name: "IBEDC — Ibadan Electricity", code: "IBEDC", category: "ELECTRICITY", country: "NG", logoIcon: "Power" },
  { id: "nigelec-ne", name: "NIGELEC — Societe Nigerienne d'Electricite", code: "NIGELEC", category: "ELECTRICITY", country: "NE", logoIcon: "Power" },

  // Cable TV
  { id: "dstv", name: "DStv Multichoice", code: "DSTV", category: "CABLE_TV", country: "NG", logoIcon: "Tv" },
  { id: "gotv", name: "GOtv Nigeria", code: "GOTV", category: "CABLE_TV", country: "NG", logoIcon: "Tv" },
  { id: "startimes", name: "StarTimes", code: "STARTIMES", category: "CABLE_TV", country: "NG", logoIcon: "Tv" },
  { id: "canal-plus-ne", name: "Canal+ Afrique (Niger)", code: "CANAL_PLUS", category: "CABLE_TV", country: "NE", logoIcon: "Tv" },
];

// Data Packages
export const DATA_PLANS_NG = [
  { id: "data-1gb", name: "1.5GB / 30 Days", amount: 1200, validity: "30 Days" },
  { id: "data-3gb", name: "3GB / 30 Days", amount: 2000, validity: "30 Days" },
  { id: "data-10gb", name: "10GB / 30 Days", amount: 4500, validity: "30 Days" },
  { id: "data-25gb", name: "25GB / 30 Days", amount: 9000, validity: "30 Days" },
  { id: "data-50gb", name: "50GB / 30 Days", amount: 16000, validity: "30 Days" },
];

// ==========================================
// 8. LIVE FX SPREAD & CORRIDOR QUOTES
// ==========================================
export const FX_RATES: FXRateQuote[] = [
  {
    fromCurrency: "NGN",
    toCurrency: "XOF",
    buyRate: 0.406,
    sellRate: 0.410,
    midRate: 0.408,
    spreadPercent: 0.98,
    lastUpdated: new Date().toISOString(),
    source: "KoriePay Bilateral Sahel Engine (Providus ⇄ Coris Bank)",
  },
  {
    fromCurrency: "XOF",
    toCurrency: "NGN",
    buyRate: 2.435,
    sellRate: 2.455,
    midRate: 2.445,
    spreadPercent: 0.82,
    lastUpdated: new Date().toISOString(),
    source: "KoriePay Bilateral Sahel Engine (Providus ⇄ Coris Bank)",
  },
  {
    fromCurrency: "USD",
    toCurrency: "NGN",
    buyRate: 1535.0,
    sellRate: 1545.0,
    midRate: 1540.0,
    spreadPercent: 0.65,
    lastUpdated: new Date().toISOString(),
    source: "CBN / Central FX Interbank Pool",
  },
  {
    fromCurrency: "USD",
    toCurrency: "XOF",
    buyRate: 622.5,
    sellRate: 628.0,
    midRate: 625.0,
    spreadPercent: 0.88,
    lastUpdated: new Date().toISOString(),
    source: "BCEAO WAEMU Foreign Reserve",
  },
];

// ==========================================
// 9. ACTIVE SESSIONS & SECURITY
// ==========================================
export const SECURITY_SESSIONS: SecuritySession[] = [
  {
    id: "sess-01",
    deviceName: "iPhone 15 Pro Max",
    browser: "Safari Mobile / iOS 17.5",
    ipAddressMasked: "197.210.84.••",
    locationApprox: "Abuja, Nigeria",
    isCurrentSession: true,
    lastActive: "Active Now",
    createdAt: "2026-09-03T08:00:00Z",
  },
  {
    id: "sess-02",
    deviceName: "MacBook Pro 16",
    browser: "Chrome 128.0 / macOS",
    ipAddressMasked: "102.89.41.••",
    locationApprox: "Kano, Nigeria",
    isCurrentSession: false,
    lastActive: "Yesterday, 07:15 PM",
    createdAt: "2026-09-01T14:10:00Z",
  },
];

export const TRUSTED_DEVICES: TrustedDevice[] = [
  {
    id: "dev-01",
    deviceName: "Ibrahim's iPhone 15 Pro",
    deviceType: "MOBILE_IOS",
    lastUsed: "Today, 10:42 AM",
    registeredAt: "2025-11-10",
  },
  {
    id: "dev-02",
    deviceName: "Office MacBook Pro (M3 Max)",
    deviceType: "DESKTOP",
    lastUsed: "Yesterday, 07:15 PM",
    registeredAt: "2025-12-01",
  },
];

// ==========================================
// 10. CUSTOMER SUPPORT TICKETS
// ==========================================
export const CUSTOMER_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: "tick-001",
    ticketNumber: "KP-SUP-88219",
    subject: "Inquiry on Maradi cross-border delivery settlement speed",
    category: "GENERAL",
    status: "RESOLVED",
    priority: "MEDIUM",
    description: "Wanted to know if transfers initiated after 6 PM settle same day via Coris Bank Sahel node.",
    lastReplyBy: "Sani Bello (KoriePay Operations)",
    lastReplyAt: "2026-09-02T18:40:00Z",
    createdAt: "2026-09-02T17:30:00Z",
    messages: [
      {
        id: "msg-1",
        sender: "CUSTOMER",
        senderName: "Ibrahim Dan-Batta",
        message: "Hello team, what is the cut-off time for bilateral cross-border settlements to Maradi Coris Bank accounts?",
        timestamp: "05:30 PM",
      },
      {
        id: "msg-2",
        sender: "SUPPORT_AGENT",
        senderName: "Sani Bello",
        message: "Hello Ibrahim, our bilateral clearing with Coris Bank operates 24/7 in real-time with sub-second settlement. Transfers initiated at any hour credit the recipient instantly.",
        timestamp: "06:40 PM",
      },
    ],
  },
];

// ==========================================
// 11. HELPER UTILITY FUNCTIONS
// ==========================================
export function formatMoney(
  amount: number,
  currency: CustomerCurrency = "NGN",
  options?: { hideCents?: boolean }
): string {
  const symbol = currency === "NGN" ? "₦" : currency === "XOF" ? "CFA " : "$";
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: options?.hideCents || currency === "XOF" ? 0 : 2,
    maximumFractionDigits: currency === "XOF" ? 0 : 2,
  });
  return `${symbol}${formatted}`;
}

export function lookupBankName(code: string): string {
  const bank = BANK_DIRECTORY.find((b) => b.code === code);
  return bank ? bank.name : "Commercial Bank";
}

export function getFXRate(from: CustomerCurrency, to: CustomerCurrency): FXRateQuote | undefined {
  return FX_RATES.find((r) => r.fromCurrency === from && r.toCurrency === to);
}
