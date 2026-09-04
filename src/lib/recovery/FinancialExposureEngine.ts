// Currency-Aware Financial Exposure & Exception Aggregation Engine

import { TransactionRecoveryEngine } from './TransactionRecoveryEngine';
import { DisputeChargebackEngine } from './DisputeChargebackEngine';
import { RefundReversalEngine } from './RefundReversalEngine';

export interface FinancialExposureSummary {
  currency: 'NGN' | 'XOF';
  totalExposure: number;
  unresolvedRecoveryExposure: number;
  activeDisputeExposure: number;
  chargebackExposure: number;
  refundsProcessedToday: number;
}

export class FinancialExposureEngine {
  private static instance: FinancialExposureEngine;

  private constructor() {}

  public static getInstance(): FinancialExposureEngine {
    if (!FinancialExposureEngine.instance) {
      FinancialExposureEngine.instance = new FinancialExposureEngine();
    }
    return FinancialExposureEngine.instance;
  }

  public calculateExposure(): { NGN: FinancialExposureSummary; XOF: FinancialExposureSummary } {
    const recoveryEngine = TransactionRecoveryEngine.getInstance();
    const disputeEngine = DisputeChargebackEngine.getInstance();
    const refundEngine = RefundReversalEngine.getInstance();

    const cases = recoveryEngine.getCases();
    const disputes = disputeEngine.getDisputes();
    const chargebacks = disputeEngine.getChargebacks();
    const refunds = refundEngine.getRefunds();

    // NGN Aggregations
    const ngnRecovery = cases
      .filter((c) => c.currency === 'NGN' && c.status !== 'RESOLVED' && c.status !== 'FAILED')
      .reduce((sum, c) => sum + c.financialExposure, 0);

    const ngnDisputes = disputes
      .filter((d) => d.currency === 'NGN' && d.status !== 'RESOLVED')
      .reduce((sum, d) => sum + d.claimAmount, 0);

    const ngnChargebacks = chargebacks
      .filter((cb) => cb.currency === 'NGN' && cb.status !== 'FINAL_WIN' && cb.status !== 'FINAL_LOSS')
      .reduce((sum, cb) => sum + cb.chargebackAmount, 0);

    const ngnRefunds = refunds
      .filter((r) => r.currency === 'NGN' && r.status === 'SUCCESS')
      .reduce((sum, r) => sum + r.refundAmount, 0);

    // XOF Aggregations
    const xofRecovery = cases
      .filter((c) => c.currency === 'XOF' && c.status !== 'RESOLVED' && c.status !== 'FAILED')
      .reduce((sum, c) => sum + c.financialExposure, 0);

    const xofDisputes = disputes
      .filter((d) => d.currency === 'XOF' && d.status !== 'RESOLVED')
      .reduce((sum, d) => sum + d.claimAmount, 0);

    const xofChargebacks = chargebacks
      .filter((cb) => cb.currency === 'XOF' && cb.status !== 'FINAL_WIN' && cb.status !== 'FINAL_LOSS')
      .reduce((sum, cb) => sum + cb.chargebackAmount, 0);

    const xofRefunds = refunds
      .filter((r) => r.currency === 'XOF' && r.status === 'SUCCESS')
      .reduce((sum, r) => sum + r.refundAmount, 0);

    return {
      NGN: {
        currency: 'NGN',
        totalExposure: ngnRecovery + ngnDisputes + ngnChargebacks,
        unresolvedRecoveryExposure: ngnRecovery,
        activeDisputeExposure: ngnDisputes,
        chargebackExposure: ngnChargebacks,
        refundsProcessedToday: ngnRefunds,
      },
      XOF: {
        currency: 'XOF',
        totalExposure: xofRecovery + xofDisputes + xofChargebacks,
        unresolvedRecoveryExposure: xofRecovery,
        activeDisputeExposure: xofDisputes,
        chargebackExposure: xofChargebacks,
        refundsProcessedToday: xofRefunds,
      },
    };
  }
}
