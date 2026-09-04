import { 
  TreasuryAccountNode, 
  AvailableLiquidityBreakdown, 
  TreasuryAlert 
} from '@/types/treasuryEngine';
import { DoubleEntryLedgerEngine } from '../financial/DoubleEntryLedgerEngine';

export class TreasuryEngine {
  private static alerts: TreasuryAlert[] = [];

  public static getAccounts(currency: 'NGN' | 'XOF' | 'ALL' = 'ALL'): TreasuryAccountNode[] {
    const providus = DoubleEntryLedgerEngine.getAccountBalance('1010');
    const koris = DoubleEntryLedgerEngine.getAccountBalance('1020');
    const aggregator = DoubleEntryLedgerEngine.getAccountBalance('1030');
    const merchantPayable = DoubleEntryLedgerEngine.getAccountBalance('2050');
    const customerLiability = DoubleEntryLedgerEngine.getAccountBalance('2010');

    const accounts: TreasuryAccountNode[] = [
      {
        accountCode: '1010',
        accountName: 'Providus Bank Nigeria Settlement Vault',
        accountType: 'BANK_VAULT',
        bankOrProviderName: 'Providus Bank Nigeria',
        countryCode: 'NG',
        currency: 'NGN',
        ledgerBalanceMinor: providus?.calculatedBalance || 21_135_000_000,
        availableBalanceMinor: providus?.availableBalance || 21_135_000_000,
        lockedHoldsMinor: providus?.lockedHolds || 0,
        status: 'ACTIVE',
      },
      {
        accountCode: '1020',
        accountName: 'Koris Bank Niger Republic Sahel Vault',
        accountType: 'BANK_VAULT',
        bankOrProviderName: 'Koris Bank Niger SA',
        countryCode: 'NE',
        currency: 'XOF',
        ledgerBalanceMinor: koris?.calculatedBalance || 14_850_000_000,
        availableBalanceMinor: koris?.availableBalance || 14_850_000_000,
        lockedHoldsMinor: koris?.lockedHolds || 0,
        status: 'ACTIVE',
      },
      {
        accountCode: '1030',
        accountName: 'Card & Checkout Gateway Clearing Float',
        accountType: 'PROVIDER_FLOAT',
        bankOrProviderName: 'Interswitch / Paystack Aggregator Node',
        countryCode: 'NG',
        currency: 'NGN',
        ledgerBalanceMinor: aggregator?.calculatedBalance || 6_135_000_000,
        availableBalanceMinor: aggregator?.availableBalance || 6_135_000_000,
        lockedHoldsMinor: aggregator?.lockedHolds || 0,
        status: 'ACTIVE',
      },
      {
        accountCode: '2050',
        accountName: 'Merchant Undisbursed Settlement Pool',
        accountType: 'SETTLEMENT_PAYABLE',
        bankOrProviderName: 'KoriePay Internal Clearing',
        countryCode: 'NG',
        currency: 'NGN',
        ledgerBalanceMinor: merchantPayable?.calculatedBalance || 1_721_780_000,
        availableBalanceMinor: 0,
        lockedHoldsMinor: 0,
        status: 'ACTIVE',
      },
    ];

    if (currency === 'ALL') return accounts;
    return accounts.filter(a => a.currency === currency);
  }

  public static calculateAvailableLiquidity(currency: 'NGN' | 'XOF' = 'NGN'): AvailableLiquidityBreakdown {
    const accounts = this.getAccounts(currency);
    
    let eligibleBankCashMinor = 0;
    let eligibleProviderCashMinor = 0;

    for (const acc of accounts) {
      if (acc.accountType === 'BANK_VAULT') {
        eligibleBankCashMinor += acc.availableBalanceMinor;
      } else if (acc.accountType === 'PROVIDER_FLOAT') {
        eligibleProviderCashMinor += acc.availableBalanceMinor;
      }
    }

    const totalLiquidAssetsMinor = eligibleBankCashMinor + eligibleProviderCashMinor;

    // Authoritative Deductions
    const restrictedFundsMinor = currency === 'NGN' ? 500_000_000 : 250_000_000; // statutory collateral
    const committedSettlementsMinor = currency === 'NGN' ? 1_721_780_000 : 850_000_000; // approved batches
    const rollingReservesMinor = currency === 'NGN' ? 90_620_000 : 45_000_000; // 5% rolling reserve
    const activeHoldsMinor = currency === 'NGN' ? 45_000_000 : 15_000_000; // fraud/compliance holds

    const totalDeductionsMinor = restrictedFundsMinor + committedSettlementsMinor + rollingReservesMinor + activeHoldsMinor;
    const availableLiquidityMinor = Math.max(0, totalLiquidAssetsMinor - totalDeductionsMinor);

    const targetSafetyBufferMinor = currency === 'NGN' ? 5_000_000_000 : 3_000_000_000;
    const netLiquiditySurplusMinor = availableLiquidityMinor - targetSafetyBufferMinor;

    let liquidityStatus: 'HEALTHY_SURPLUS' | 'ADEQUATE' | 'LOW_LIQUIDITY' | 'CRITICAL_SHORTFALL' = 'HEALTHY_SURPLUS';
    if (netLiquiditySurplusMinor < 0) {
      liquidityStatus = availableLiquidityMinor < committedSettlementsMinor ? 'CRITICAL_SHORTFALL' : 'LOW_LIQUIDITY';
    } else if (netLiquiditySurplusMinor < targetSafetyBufferMinor * 0.5) {
      liquidityStatus = 'ADEQUATE';
    }

    return {
      currency,
      totalLiquidAssetsMinor,
      eligibleBankCashMinor,
      eligibleProviderCashMinor,
      deductions: {
        restrictedFundsMinor,
        committedSettlementsMinor,
        rollingReservesMinor,
        activeHoldsMinor,
      },
      availableLiquidityMinor,
      targetSafetyBufferMinor,
      netLiquiditySurplusMinor,
      liquidityStatus,
    };
  }

  public static getAlerts(): TreasuryAlert[] {
    return [
      {
        id: 'alt_try_01',
        alertType: 'BANK_CONCENTRATION',
        severity: 'MEDIUM',
        title: 'Commercial Bank Concentration (Providus Bank)',
        message: '72% of total NGN liquid float is concentrated in Providus Bank Nigeria primary vault.',
        currency: 'NGN',
        amountMinor: 21_135_000_000,
        actionRequired: 'Initiate secondary vault diversification rebalancing.',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alt_try_02',
        alertType: 'SETTLEMENT_PRESSURE',
        severity: 'MEDIUM',
        title: 'T+1 Merchant Settlement Cut-Off Approaching',
        message: '₦1.72B committed settlement batch scheduled for release at 16:00 WAT.',
        currency: 'NGN',
        amountMinor: 1_721_780_000,
        actionRequired: 'Ensure sufficient float in Providus payout sub-account.',
        createdAt: new Date().toISOString(),
      },
    ];
  }
}
