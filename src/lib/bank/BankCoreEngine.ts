// =============================================================================
// File: src/lib/bank/BankCoreEngine.ts
// Description: KoriePay Core Bank (sandbox) — the transactable bank core whose
// API serves as the platform's liquidity rail.
//
//   · Settlement nostros at partner banks (Providus NG / Coris NE) carry the
//     bank's float; every money movement posts a real double-entry journal
//     through LedgerService (chart accounts acc_asset_bank_settlement_* and
//     acc_liab_customer_wallets_ngn) and moves the per-customer wallet
//     subledger through SubledgerEngine.
//   · Accounts are real KoriePay NGN NUBANs minted by AccountLifecycleEngine
//     (customer wallet subledger provisioned automatically).
//   · The gateway adapter mode is read LIVE from the admin Configuration Hub:
//     the BANK_NODE connectors (Providus/Coris templates) decide whether the
//     liquidity rail runs SIMULATED (sandbox demo, no external network) or
//     LIVE (connector CONNECTED + PRODUCTION credentials supplied in admin).
//   · Raw secrets never live here — connector secrets belong to the admin
//     configuration engine (env KORIE_CONNECTOR_<CODE>_SECRET or admin entry).
//
// File-backed runtime store: /tmp/korie-bank-store.json (env BANK_CORE_STORE_PATH).
// =============================================================================

import fs from 'fs';
import path from 'path';
import { LedgerService } from '../services/LedgerService';
import { SubledgerEngine } from '../financial/SubledgerEngine';
import { AccountLifecycleEngine } from '../customer/AccountLifecycleEngine';
import { CustomerLifecycleEngine } from '../customer/CustomerLifecycleEngine';
import { AdminConfigurationEngine } from '../admin/AdminConfigurationEngine';

const STORE_PATH = process.env.BANK_CORE_STORE_PATH || '/tmp/korie-bank-store.json';

export const BANK_NIP_FEE_NGN = 10; // flat outbound NIP fee (whole ₦, sandbox tariff)

export type BankNodeId = 'providus_ng' | 'coris_ne';

export interface BankLiquidityPosition {
  nodeId: BankNodeId;
  bankName: string;
  country: 'NG' | 'NE';
  currency: 'NGN' | 'XOF';
  settlementAccount: string;
  /** Whole currency units held at the partner bank (sandbox ledger of the float). */
  balance: number;
  updatedAt: string;
}

export interface BankTransaction {
  id: string;
  reference: string;
  type: 'ACCOUNT_OPEN' | 'INBOUND_CREDIT' | 'INTERNAL_TRANSFER' | 'NIP_OUT' | 'FLOAT_TOP_UP';
  currency: 'NGN' | 'XOF';
  amount: number;
  fee?: number;
  fromAccount?: string;
  toAccount?: string;
  toBank?: string;
  accountHolder?: string;
  status: 'SUCCESSFUL' | 'FAILED';
  ledgerJournalId?: string;
  gatewayMode: 'SIMULATED' | 'LIVE';
  narration?: string;
  createdAt: string;
}

interface BankStoreState {
  positions: Record<BankNodeId, BankLiquidityPosition>;
  transactions: BankTransaction[];
  seq: number;
}

function ngnPosition(): BankLiquidityPosition {
  return {
    nodeId: 'providus_ng',
    bankName: 'Providus Bank Plc (settlement nostro)',
    country: 'NG',
    currency: 'NGN',
    settlementAccount: '0123984123',
    balance: 25_000_000, // ₦25m opening float
    updatedAt: new Date().toISOString(),
  };
}

function xofPosition(): BankLiquidityPosition {
  return {
    nodeId: 'coris_ne',
    bankName: 'Coris Bank SA (settlement nostro)',
    country: 'NE',
    currency: 'XOF',
    settlementAccount: 'NE5400240199',
    balance: 150_000_000, // 150m CFA opening float
    updatedAt: new Date().toISOString(),
  };
}

export class BankCoreEngine {
  private static instance: BankCoreEngine;

  private state: BankStoreState = {
    positions: { providus_ng: ngnPosition(), coris_ne: xofPosition() },
    transactions: [],
    seq: 0,
  };

  private constructor() {
    this.hydrate();
  }

  public static getInstance(): BankCoreEngine {
    if (!BankCoreEngine.instance) BankCoreEngine.instance = new BankCoreEngine();
    BankCoreEngine.instance.hydrate();
    return BankCoreEngine.instance;
  }

  private hydrate() {
    try {
      if (!fs.existsSync(STORE_PATH)) return;
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      if (data.positions) this.state.positions = { ...this.state.positions, ...data.positions };
      if (data.transactions) this.state.transactions = data.transactions;
      if (typeof data.seq === 'number') this.state.seq = data.seq;
    } catch {
      /* corrupt/missing — keep seeds */
    }
  }

  private persist() {
    try {
      fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.state));
    } catch {
      /* non-fatal */
    }
  }

  private ref(prefix: string): string {
    this.state.seq += 1;
    return `BK-${prefix}-${Date.now().toString(36).toUpperCase()}-${this.state.seq}`;
  }

  private log(tx: BankTransaction) {
    this.state.transactions.unshift(tx);
    if (this.state.transactions.length > 300) this.state.transactions.pop();
    this.persist();
  }

  // ---------------------------------------------------------------------------
  // Gateway adapter mode — read LIVE from the admin Configuration Hub
  // ---------------------------------------------------------------------------

  /** Resolve the NGN liquidity rail mode from the configured BANK_NODE connectors. */
  public gatewayMode(): {
    mode: 'SIMULATED' | 'LIVE';
    provider: string;
    note: string;
  } {
    try {
      const connectors = AdminConfigurationEngine.getInstance().listConnectors('BANK_NODE');
      const primary = connectors.find((c) => c.role === 'PRIMARY') || connectors[0];
      if (!primary || !primary.baseUrl) {
        return {
          mode: 'SIMULATED',
          provider: 'none',
          note: 'No BANK_NODE connector configured — add Providus/Coris in Configuration & Automation → Connections.',
        };
      }
      const live =
        primary.status === 'CONNECTED' && primary.environment === 'PRODUCTION' && primary.hasSecretConfigured;
      return {
        mode: live ? 'LIVE' : 'SIMULATED',
        provider: primary.name,
        note: live
          ? `${primary.name} live: ${primary.baseUrl} (${primary.environment}).`
          : `${primary.name} configured (${primary.environment}) — live calls activate when the connector is probed CONNECTED with PRODUCTION credentials.`,
      };
    } catch {
      return { mode: 'SIMULATED', provider: 'none', note: 'Configuration engine unavailable — running simulated rail.' };
    }
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  public liquidityPositions(): BankLiquidityPosition[] {
    this.hydrate();
    return [this.state.positions.providus_ng, this.state.positions.coris_ne].map((p) => ({ ...p }));
  }

  public transactions(limit = 40): BankTransaction[] {
    this.hydrate();
    return this.state.transactions.slice(0, limit);
  }

  public transactionsFor(accountNumber: string, limit = 25): BankTransaction[] {
    this.hydrate();
    return this.state.transactions.filter((t) => t.fromAccount === accountNumber || t.toAccount === accountNumber).slice(0, limit);
  }

  public accountByNumber(nuban: string) {
    return AccountLifecycleEngine.getInstance().getAccount(nuban);
  }

  // ---------------------------------------------------------------------------
  // Account opening (a real, transactable NGN NUBAN + wallet subledger)
  // ---------------------------------------------------------------------------

  public openAccount(params: { fullName: string; phone: string; email?: string }): {
    success: boolean;
    account?: any;
    customerId?: string;
    created?: boolean;
    code?: string;
    message?: string;
  } {
    const fullName = (params.fullName || '').trim();
    const phone = (params.phone || '').replace(/\s/g, '');
    if (fullName.length < 3) return { success: false, code: 'NAME_REQUIRED', message: 'Full name is required.' };
    if (!/^\+?\d{10,15}$/.test(phone)) return { success: false, code: 'PHONE_REQUIRED', message: 'Enter a valid phone number.' };

    const lifecycle = CustomerLifecycleEngine.getInstance();
    const accountEngine = AccountLifecycleEngine.getInstance();
    let customer =
      lifecycle.getCustomers().find((c) => c.phone.replace(/\s/g, '') === phone) ||
      lifecycle.registerCustomer({
        tenantId: 'tenant-korie-core',
        fullName,
        email: (params.email || '').trim() || `${phone.replace(/\D/g, '')}@bank.koriepay.ng`,
        phone,
        country: 'NG',
        customerType: 'PERSONAL',
        kycTier: 'TIER_1',
        riskStatus: 'LOW',
      });

    // Idempotent open: an existing active NGN wallet account is returned as-is
    // (same semantics as the rest of the platform — replay, not duplication).
    const existing = accountEngine
      .getAccounts(customer.id)
      .find((a) => a.currency === 'NGN' && a.status === 'OPEN');
    if (existing) {
      return { success: true, account: existing, customerId: customer.id, created: false };
    }

    const opened = accountEngine.openAccount({
      customerId: customer.id,
      productCode: 'KORIE_WALLET_NGN_BASIC',
      accountName: fullName,
      country: 'NG',
      currency: 'NGN',
    });
    if (!opened.success || !opened.account) {
      return { success: false, code: opened.error || 'ACCOUNT_OPEN_FAILED', message: 'Account could not be opened.' };
    }
    this.log({
      id: `bk-tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reference: this.ref('ACCT'),
      type: 'ACCOUNT_OPEN',
      currency: 'NGN',
      amount: 0,
      toAccount: opened.account.accountNumber,
      accountHolder: fullName,
      status: 'SUCCESSFUL',
      gatewayMode: this.gatewayMode().mode,
      narration: `Account opened — ${fullName}`,
      createdAt: new Date().toISOString(),
    });
    return { success: true, account: opened.account, customerId: customer.id, created: true };
  }

  // ---------------------------------------------------------------------------
  // Money movement (journaled + wallet subledger + nostro float)
  // ---------------------------------------------------------------------------

  private walletOf(customerId: string): number {
    const w = SubledgerEngine.getInstance().getSubledger('CUSTOMER_WALLET', customerId, 'NGN');
    return w && w.isActive ? w.availableBalance : 0;
  }

  private moveWallet(customerId: string, delta: number) {
    SubledgerEngine.getInstance().mutateBalance({
      subledgerType: 'CUSTOMER_WALLET',
      entityId: customerId,
      accountCode: '2010',
      currency: 'NGN',
      country: 'NG',
      deltaAmount: delta,
    });
  }

  private moveNostro(deltaMinor: number) {
    const pos = this.state.positions.providus_ng;
    pos.balance = Math.max(0, pos.balance + deltaMinor / 100);
    pos.updatedAt = new Date().toISOString();
    this.persist();
  }

  /** Inbound credit from the partner bank (e.g. funding webhook) — nostros in, wallet up. */
  public async creditInbound(params: { accountNumber: string; amount: number; narration?: string }): Promise<{
    success: boolean;
    transaction?: BankTransaction;
    journalId?: string;
    code?: string;
    message?: string;
  }> {
    const amount = Math.round(params.amount);
    const account = AccountLifecycleEngine.getInstance().getAccount(params.accountNumber);
    if (!account || account.currency !== 'NGN') {
      return { success: false, code: 'ACCOUNT_NOT_FOUND', message: 'No NGN account with that number.' };
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      return { success: false, code: 'INVALID_AMOUNT', message: 'Enter a positive whole-₦ amount.' };
    }
    const minor = amount * 100;
    const ledgerTx = await LedgerService.postTransaction({
      orgId: 'org_kor_99182',
      transactionReference: this.ref('CREDIT'),
      description: `Inbound bank credit — ${account.accountName}`,
      currency: 'NGN',
      entries: [
        { accountId: 'acc_asset_bank_settlement_ngn', entryType: 'DEBIT', amount: minor, narration: `Partner bank credit received for ${account.accountNumber}` },
        { accountId: 'acc_liab_customer_wallets_ngn', entryType: 'CREDIT', amount: minor, narration: `Wallet credit — ${account.accountNumber}` },
      ],
    });
    this.moveWallet(account.customerId, amount);
    this.moveNostro(minor);

    const tx: BankTransaction = {
      id: `bk-tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reference: ledgerTx.transaction.transactionReference,
      type: 'INBOUND_CREDIT',
      currency: 'NGN',
      amount,
      toAccount: account.accountNumber,
      accountHolder: account.accountName,
      status: 'SUCCESSFUL',
      ledgerJournalId: ledgerTx.transaction.id,
      gatewayMode: this.gatewayMode().mode,
      narration: params.narration || `Inbound credit — ${account.accountName}`,
      createdAt: new Date().toISOString(),
    };
    this.log(tx);
    return { success: true, transaction: tx, journalId: ledgerTx.transaction.id };
  }

  /** Wallet-to-wallet transfer between two KoriePay NGN accounts. */
  public async internalTransfer(params: {
    fromAccount: string;
    toAccount: string;
    amount: number;
    narration?: string;
  }): Promise<{ success: boolean; transaction?: BankTransaction; journalId?: string; code?: string; message?: string }> {
    const amount = Math.round(params.amount);
    const from = AccountLifecycleEngine.getInstance().getAccount(params.fromAccount);
    const to = AccountLifecycleEngine.getInstance().getAccount(params.toAccount);
    if (!from || !to) return { success: false, code: 'ACCOUNT_NOT_FOUND', message: 'One of the accounts was not found.' };
    if (from.accountNumber === to.accountNumber) return { success: false, code: 'SAME_ACCOUNT', message: 'Choose two different accounts.' };
    if (!Number.isInteger(amount) || amount <= 0) return { success: false, code: 'INVALID_AMOUNT', message: 'Enter a positive whole-₦ amount.' };
    const available = this.walletOf(from.customerId);
    if (available < amount) {
      return { success: false, code: 'INSUFFICIENT_BALANCE', message: `Sender wallet ₦${available.toLocaleString()} cannot cover ₦${amount.toLocaleString()}.` };
    }
    const minor = amount * 100;
    const ledgerTx = await LedgerService.postTransaction({
      orgId: 'org_kor_99182',
      transactionReference: this.ref('P2P'),
      description: `Internal transfer ${from.accountNumber} → ${to.accountNumber}`,
      currency: 'NGN',
      entries: [
        { accountId: 'acc_liab_customer_wallets_ngn', entryType: 'DEBIT', amount: minor, narration: `Internal transfer debit — sender ${from.accountNumber}` },
        { accountId: 'acc_liab_customer_wallets_ngn', entryType: 'CREDIT', amount: minor, narration: `Internal transfer credit — recipient ${to.accountNumber}` },
      ],
    });
    this.moveWallet(from.customerId, -amount);
    this.moveWallet(to.customerId, amount);

    const tx: BankTransaction = {
      id: `bk-tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reference: ledgerTx.transaction.transactionReference,
      type: 'INTERNAL_TRANSFER',
      currency: 'NGN',
      amount,
      fromAccount: from.accountNumber,
      toAccount: to.accountNumber,
      accountHolder: to.accountName,
      status: 'SUCCESSFUL',
      ledgerJournalId: ledgerTx.transaction.id,
      gatewayMode: this.gatewayMode().mode,
      narration: params.narration || `Transfer to ${to.accountName}`,
      createdAt: new Date().toISOString(),
    };
    this.log(tx);
    return { success: true, transaction: tx, journalId: ledgerTx.transaction.id };
  }

  /** Outbound to another bank (NIP) — wallet down, nostro down, fee revenue up. */
  public async nipOut(params: {
    fromAccount: string;
    amount: number;
    destinationBank: string;
    destinationAccount: string;
    destinationName?: string;
    narration?: string;
  }): Promise<{ success: boolean; transaction?: BankTransaction; journalId?: string; code?: string; message?: string }> {
    const amount = Math.round(params.amount);
    const from = AccountLifecycleEngine.getInstance().getAccount(params.fromAccount);
    if (!from || from.currency !== 'NGN') return { success: false, code: 'ACCOUNT_NOT_FOUND', message: 'No NGN account with that number.' };
    if (!Number.isInteger(amount) || amount <= 0) return { success: false, code: 'INVALID_AMOUNT', message: 'Enter a positive whole-₦ amount.' };
    const dest = String(params.destinationAccount || '').replace(/\D/g, '');
    if (dest.length < 10 || !params.destinationBank.trim()) {
      return { success: false, code: 'DESTINATION_REQUIRED', message: 'Destination account (10 digits) and bank are required.' };
    }
    const total = amount + BANK_NIP_FEE_NGN;
    const available = this.walletOf(from.customerId);
    if (available < total) {
      return { success: false, code: 'INSUFFICIENT_BALANCE', message: `Wallet ₦${available.toLocaleString()} cannot cover ₦${total.toLocaleString()} (incl. ₦${BANK_NIP_FEE_NGN} fee).` };
    }
    const feeMinor = BANK_NIP_FEE_NGN * 100;
    const amountMinor = amount * 100;
    const ledgerTx = await LedgerService.postTransaction({
      orgId: 'org_kor_99182',
      transactionReference: this.ref('NIP'),
      description: `NIP outbound — ${from.accountName} → ${params.destinationBank}`,
      currency: 'NGN',
      entries: [
        { accountId: 'acc_liab_customer_wallets_ngn', entryType: 'DEBIT', amount: amountMinor + feeMinor, narration: `NIP debit ${from.accountNumber} (amount + fee)` },
        { accountId: 'acc_asset_bank_settlement_ngn', entryType: 'CREDIT', amount: amountMinor, narration: `NIP payout via nostro — ${params.destinationBank} ${dest}` },
        { accountId: 'acc_rev_tx_fees_ngn', entryType: 'CREDIT', amount: feeMinor, narration: `NIP outbound fee revenue — ₦${BANK_NIP_FEE_NGN}` },
      ],
    });
    this.moveWallet(from.customerId, -total);
    this.moveNostro(-amountMinor);

    const tx: BankTransaction = {
      id: `bk-tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reference: ledgerTx.transaction.transactionReference,
      type: 'NIP_OUT',
      currency: 'NGN',
      amount,
      fee: BANK_NIP_FEE_NGN,
      fromAccount: from.accountNumber,
      toAccount: dest,
      toBank: params.destinationBank,
      accountHolder: params.destinationName,
      status: 'SUCCESSFUL',
      ledgerJournalId: ledgerTx.transaction.id,
      gatewayMode: this.gatewayMode().mode,
      narration: params.narration || `Transfer to ${params.destinationBank} ${dest}`,
      createdAt: new Date().toISOString(),
    };
    this.log(tx);
    return { success: true, transaction: tx, journalId: ledgerTx.transaction.id };
  }
}
