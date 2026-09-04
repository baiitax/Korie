import { DeepHealthReport } from '@/types/resilienceEngine';
import { DoubleEntryLedgerEngine } from '../financial/DoubleEntryLedgerEngine';
import { CircuitBreakerEngine } from './CircuitBreakerEngine';
import { MasterIdentityEngine } from '../identity/MasterIdentityEngine';
import { TreasuryEngine } from '../treasury/TreasuryEngine';
import { DisasterRecoveryEngine } from './DisasterRecoveryEngine';

export class HealthCheckEngine {
  public static getDeepHealth(): DeepHealthReport {
    DoubleEntryLedgerEngine.ensureInitialized();
    MasterIdentityEngine.ensureInitialized();

    const trialBalanceNgn = DoubleEntryLedgerEngine.generateTrialBalance('NGN');
    const isSafeMode = DisasterRecoveryEngine.isSafeModeActive();
    const breakers = CircuitBreakerEngine.getAllBreakers();
    const persons = MasterIdentityEngine.getAllPersons();
    const orgs = MasterIdentityEngine.getAllOrganizations();
    const liqNgn = TreasuryEngine.calculateAvailableLiquidity('NGN');
    const liqXof = TreasuryEngine.calculateAvailableLiquidity('XOF');

    const totalDebits = trialBalanceNgn.totalDebits;
    const totalCredits = trialBalanceNgn.totalCredits;
    const isBalanced = totalDebits === totalCredits;

    const providers = breakers.map(b => ({
      code: b.serviceKey,
      name: b.serviceName,
      country: b.serviceKey.includes('NE') ? ('NE' as const) : ('NG' as const),
      status: b.state === 'CLOSED' ? ('CONNECTED' as const) : b.state === 'HALF_OPEN' ? ('DEGRADED' as const) : ('OFFLINE' as const),
      circuitBreaker: b.state,
      latencyMs: b.state === 'CLOSED' ? 4 : 450,
    }));

    return {
      timestamp: new Date().toISOString(),
      platformStatus: isSafeMode ? 'SAFE_MODE' : !isBalanced ? 'CRITICAL' : 'OPERATIONAL',
      environment: 'PRODUCTION',
      safeMode: isSafeMode,
      database: {
        status: 'HEALTHY',
        readLatencyMs: 2.1,
        writeLatencyMs: 4.8,
        poolActive: 24,
        poolMax: 100,
      },
      ledger: {
        status: isBalanced ? 'BALANCED' : 'IMBALANCE_DETECTED',
        invariantPassed: isBalanced,
        totalJournalsCount: DoubleEntryLedgerEngine.getJournals().length,
        debitCreditDeltaMinor: Math.abs(totalDebits - totalCredits),
      },
      providers,
      identityEngine: {
        status: 'OPERATIONAL',
        totalPersonsCount: persons.length,
        totalOrgsCount: orgs.length,
        pendingKycCount: persons.filter(p => p.kycStatus === 'UNDER_REVIEW' || p.kycStatus === 'SUBMITTED').length,
      },
      treasury: {
        status: 'HEALTHY',
        availableLiquidityNgnMinor: liqNgn.availableLiquidityMinor,
        availableLiquidityXofMinor: liqXof.availableLiquidityMinor,
      },
    };
  }
}
