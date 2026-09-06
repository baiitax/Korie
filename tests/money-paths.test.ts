import { describe, it, expect } from "vitest";
import { toCustomerTransaction, fromMinorUnits } from "@/lib/customer/CustomerTransactionQuery";
import { TransactionService } from "@/lib/services/TransactionService";
import { SubledgerEngine } from "@/lib/financial/SubledgerEngine";
import { RequestContext } from "@/types/apiGateway";
import { DbTransaction } from "@/types/database";

/**
 * Money-path invariant tests.
 *
 * The fee model is INCLUSIVE: the wallet subledger is debited exactly
 * `amount`; the fee is taken from within it (GL: amount → netAmount onward +
 * fee to revenue). The customer-facing surfaces (review screen "total debit",
 * receipt totalAmount) must therefore equal `amount` — never `amount + fee`.
 * Until this was pinned, the review and receipt promised a debit that never
 * happened and the balance appeared to disagree with them.
 */

const ctx = (): RequestContext => ({
  requestId: "req-test-001",
  correlationId: "corr-test-001",
  environment: "SANDBOX",
  orgId: "org-korie-01",
  userId: "usr_dev_01",
  scopes: ["transfers:write", "payments:read"],
  ipAddress: "127.0.0.1",
  startTime: Date.now(),
});

const OWNER = "cust-ng-001-ibrahim";

const balance = (currency: "NGN" | "XOF") =>
  SubledgerEngine.getInstance().getSubledger("CUSTOMER_WALLET", OWNER, currency)?.availableBalance;

describe("fromMinorUnits", () => {
  it("converts kobo to naira with 2 decimals", () => {
    expect(fromMinorUnits(5_025_000, "NGN")).toBe(50_250);
    expect(fromMinorUnits(123_456, "NGN")).toBe(1234.56);
  });

  it("never shows fractional CFA francs", () => {
    // 1,850,000 minor units (centimes) = 18,500 whole francs; the subledger
    // stores whole units but the engine speaks minor units.
    expect(fromMinorUnits(1_850_000, "XOF")).toBe(18_500);
    expect(fromMinorUnits(1_850_049, "XOF")).toBe(18_500); // rounds to whole francs
  });
});

describe("toCustomerTransaction — the displayed-total contract", () => {
  const baseTx: DbTransaction = {
    id: "tx_test_1",
    org_id: "org-korie-01",
    reference: "KP-TEST-001",
    idempotency_key: "idem-1",
    request_id: "req-1",
    correlation_id: "corr-1",
    type: "CROSS_BORDER_TRANSFER",
    status: "SUCCESSFUL",
    amount: 5_000_000, // ₦50,000.00 minor units
    fee: 25_000,       // ₦250.00 minor units
    net_amount: 4_975_000,
    currency: "NGN",
    source_currency: "NGN",
    destination_currency: "XOF",
    exchange_rate: 0.43,
    recipient_name: "Amina Gambo",
    recipient_account: "NE5400240100987654321",
    narration: "test",
    created_at: "2026-09-06T00:00:00Z",
    updated_at: "2026-09-06T00:00:00Z",
    metadata: { destAmount: 2_139_350 },
  } as unknown as DbTransaction;

  it("reports totalAmount == amount (fee is inside the amount, never added)", () => {
    const t = toCustomerTransaction(baseTx);
    expect(t.amount).toBe(50_000);
    expect(t.fee).toBe(250);
    expect(t.totalAmount).toBe(50_000); // NOT 50,250
  });

  it("maps the cross-border destination amount from metadata", () => {
    const t = toCustomerTransaction(baseTx);
    expect(t.destinationCurrency).toBe("XOF");
    // metadata.destAmount is minor units; XOF renders whole francs
    expect(t.destinationAmount).toBe(Math.round(2_139_350 / 100));
  });
});

describe("TransactionService.executeCrossBorderTransfer — engine maths", () => {
  it("charges the inclusive 0.5% fee and debits the wallet exactly the amount", async () => {
    const amountMinor = 10_000_000; // ₦100,000.00
    const before = balance("NGN");

    const tx = await TransactionService.executeCrossBorderTransfer(ctx(), {
      sourceCurrency: "NGN",
      destinationCurrency: "XOF",
      amount: amountMinor,
      reference: "KP-TEST-CB-001",
      recipient: { name: "Amina Gambo", bankCode: "NE024", accountNumber: "NE5400240100987654321" },
      sourceCustomerId: OWNER,
    });

    // Fee maths
    expect(tx.fee).toBe(Math.floor(amountMinor * 0.005));
    expect(tx.net_amount).toBe(amountMinor - tx.fee);
    // Recipient gets (amount − fee) × rate — the inclusive model
    expect(tx.metadata?.destAmount).toBe(Math.floor(tx.net_amount * 0.43));

    // THE invariant: wallet debit equals the full amount; the fee comes out
    // of it, never on top.
    expect(balance("NGN")).toBe(before! - amountMinor / 100);

    // Ownership tagging for the portal read path
    expect(tx.owner_customer_id).toBe(OWNER);
    expect(TransactionService.listRawForOwner(OWNER).some((t) => t.reference === "KP-TEST-CB-001")).toBe(true);
  });

  it("exposes the same rate the engine executes (quote == execution)", () => {
    expect(TransactionService.getCrossBorderRate("NGN").rate).toBe(0.43);
    expect(TransactionService.getCrossBorderRate("XOF").rate).toBe(2.31);
  });

  it("rejects amounts below one minor-unit naira floor", async () => {
    await expect(
      TransactionService.executeCrossBorderTransfer(ctx(), {
        sourceCurrency: "NGN",
        destinationCurrency: "XOF",
        amount: 50,
        reference: "KP-TEST-CB-002",
        recipient: { name: "X", bankCode: "NE024", accountNumber: "0" },
        sourceCustomerId: OWNER,
      }),
    ).rejects.toThrow(/INVALID_AMOUNT/);
  });
});

describe("TransactionService.executeNipOutward — domestic maths", () => {
  it("applies the flat ₦50 fee inside the amount and debits exactly the amount", async () => {
    const amountMinor = 2_000_000; // ₦20,000.00
    const before = balance("NGN");

    const tx = await TransactionService.executeNipOutward(ctx(), {
      destinationBankCode: "058",
      destinationAccountNumber: "0123456789",
      beneficiaryName: "Musa Test",
      amount: amountMinor,
      reference: "KP-TEST-NIP-001",
      sourceCustomerId: OWNER,
    });

    expect(tx.fee).toBe(5_000); // ₦50.00 minor units
    expect(tx.net_amount).toBe(amountMinor - 5_000);
    expect(balance("NGN")).toBe(before! - amountMinor / 100);
    expect(tx.owner_customer_id).toBe(OWNER);
  });
});

describe("SubledgerEngine basics", () => {
  it("applies additive deltas to the same subledger", () => {
    const before = balance("XOF");
    SubledgerEngine.getInstance().mutateBalance({
      subledgerType: "CUSTOMER_WALLET",
      entityId: OWNER,
      accountCode: "2020",
      currency: "XOF",
      country: "NE",
      deltaAmount: 500,
    });
    expect(balance("XOF")).toBe(before! + 500);
    SubledgerEngine.getInstance().mutateBalance({
      subledgerType: "CUSTOMER_WALLET",
      entityId: OWNER,
      accountCode: "2020",
      currency: "XOF",
      country: "NE",
      deltaAmount: -500,
    });
    expect(balance("XOF")).toBe(before);
  });
});

describe("receipt total matches the debited amount (end-to-end shape)", () => {
  it("a transaction produced by the engine maps to a receipt whose total equals the debit", async () => {
    const amountMinor = 7_500_000; // ₦75,000.00
    const before = balance("NGN");
    const tx = await TransactionService.executeCrossBorderTransfer(ctx(), {
      sourceCurrency: "NGN",
      destinationCurrency: "XOF",
      amount: amountMinor,
      reference: "KP-TEST-RECEIPT-001",
      recipient: { name: "Amina Gambo", bankCode: "NE024", accountNumber: "NE5400240100987654321" },
      sourceCustomerId: OWNER,
    });
    const debit = before! - balance("NGN")!;
    const view = toCustomerTransaction(tx);
    expect(view.totalAmount).toBe(debit); // receipt total == money that left
    expect(view.totalAmount).toBe(amountMinor / 100);
  });
});
