import { RiskEvaluationRequest } from '@/types/riskEngine';
import { VelocityEngine } from './VelocityEngine';

export interface ExtractedRiskSignals {
  // Identity
  kycTier: number;
  accountAgeDays: number;
  hasPreviousFraudAlert: boolean;

  // Device
  deviceId: string;
  isNewDevice: boolean;
  deviceAccountsCount24h: number;
  isVpnOrProxy: boolean;
  isTor: boolean;

  // Network & Geo
  ipAddress: string;
  geovelocityKmh: number;

  // Beneficiary
  isNewBeneficiary: boolean;
  beneficiaryPriorTxnCount: number;

  // Transaction & Velocity
  amountMinor: number;
  currency: string;
  txnCount1m: number;
  txnCount10m: number;
  txnCount1h: number;
  txnVolume1hMinor: number;
  isOffHours: boolean; // e.g. 00:00 - 05:00 local time
}

export class RiskSignalEngine {
  public static extractSignals(req: RiskEvaluationRequest): ExtractedRiskSignals {
    const dev = req.device || {
      deviceId: 'DEV-UNKNOWN',
      ipAddress: '127.0.0.1',
      isVpn: false,
      isProxy: false,
      isTor: false,
      isNewDevice: false,
      deviceAccountsCount24h: 1,
    };

    const ben = req.beneficiary || {
      accountNumber: 'N/A',
      bankCode: '000',
      isNewBeneficiary: false,
      previousTransactionCount: 5,
    };

    // Velocity metrics from memory store
    const entityVelocity = VelocityEngine.getMetrics(req.entityType, req.entityId);

    // Current hour in West Africa Time (UTC+1)
    const currentHour = (new Date().getUTCHours() + 1) % 24;
    const isOffHours = currentHour >= 0 && currentHour <= 4;

    return {
      kycTier: 2,
      accountAgeDays: 180,
      hasPreviousFraudAlert: false,

      deviceId: dev.deviceId,
      isNewDevice: !!dev.isNewDevice,
      deviceAccountsCount24h: dev.deviceAccountsCount24h || 1,
      isVpnOrProxy: !!(dev.isVpn || dev.isProxy),
      isTor: !!dev.isTor,

      ipAddress: dev.ipAddress,
      geovelocityKmh: dev.isVpn ? 1200 : 0,

      isNewBeneficiary: !!ben.isNewBeneficiary,
      beneficiaryPriorTxnCount: ben.previousTransactionCount || (ben.isNewBeneficiary ? 0 : 5),

      amountMinor: req.amountMinor,
      currency: req.currency,
      txnCount1m: entityVelocity.count1m,
      txnCount10m: entityVelocity.count10m,
      txnCount1h: entityVelocity.count1h,
      txnVolume1hMinor: entityVelocity.volume1hMinor,
      isOffHours,
    };
  }
}
