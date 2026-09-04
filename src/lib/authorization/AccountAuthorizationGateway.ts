// Central Server-Side Account & Transaction Authorization Gateway

import { CustomerLifecycleEngine } from '../customer/CustomerLifecycleEngine';
import { AccountLifecycleEngine } from '../customer/AccountLifecycleEngine';
import { BankingProductFactory } from '../products/BankingProductFactory';
import { AccountLimitEngine } from '../limits/AccountLimitEngine';

export interface AuthorizationEvaluationRequest {
  customerId: string;
  accountId: string;
  transactionAmount: number;
  transactionType: string;
  channel: string;
  deviceTrustScore?: number;
  beneficiaryId?: string;
}

export interface AuthorizationEvaluationResult {
  decision: 'ALLOW' | 'STEP_UP' | 'REVIEW' | 'DECLINE';
  authorized: boolean;
  policyVersion: string;
  reasonCodes: string[];
}

export class AccountAuthorizationGateway {
  private static instance: AccountAuthorizationGateway;

  private constructor() {}

  public static getInstance(): AccountAuthorizationGateway {
    if (!AccountAuthorizationGateway.instance) {
      AccountAuthorizationGateway.instance = new AccountAuthorizationGateway();
    }
    return AccountAuthorizationGateway.instance;
  }

  public canCustomerPerformAction(params: AuthorizationEvaluationRequest): AuthorizationEvaluationResult {
    const { customerId, accountId, transactionAmount, channel, deviceTrustScore = 95 } = params;

    const customerEngine = CustomerLifecycleEngine.getInstance();
    const accountEngine = AccountLifecycleEngine.getInstance();
    const productFactory = BankingProductFactory.getInstance();
    const limitEngine = AccountLimitEngine.getInstance();

    const customer = customerEngine.getCustomer(customerId);
    const account = accountEngine.getAccount(accountId);

    const reasonCodes: string[] = [];

    // 1. Customer State
    if (!customer) {
      return { decision: 'DECLINE', authorized: false, policyVersion: 'v2.4', reasonCodes: ['CUSTOMER_NOT_FOUND'] };
    }
    if (customer.status !== 'ACTIVE') {
      return { decision: 'DECLINE', authorized: false, policyVersion: 'v2.4', reasonCodes: [`CUSTOMER_STATUS_LOCKED: ${customer.status}`] };
    }

    // 2. Account State & Restrictions
    if (!account) {
      return { decision: 'DECLINE', authorized: false, policyVersion: 'v2.4', reasonCodes: ['ACCOUNT_NOT_FOUND'] };
    }
    if (account.status === 'FROZEN') {
      return { decision: 'DECLINE', authorized: false, policyVersion: 'v2.4', reasonCodes: ['ACCOUNT_FROZEN'] };
    }
    if (account.restrictions?.includes('DEBIT_ONLY') && params.transactionType === 'CREDIT') {
      return { decision: 'DECLINE', authorized: false, policyVersion: 'v2.4', reasonCodes: ['RESTRICTION_DEBIT_ONLY'] };
    }
    if (account.restrictions?.includes('TRANSFER_DISABLED')) {
      return { decision: 'DECLINE', authorized: false, policyVersion: 'v2.4', reasonCodes: ['RESTRICTION_TRANSFERS_DISABLED'] };
    }

    // 3. Product Policy & Allowed Channels
    const product = productFactory.getProduct(account.productId || account.productCode || '');
    if (!product || product.status !== 'ACTIVE') {
      return { decision: 'DECLINE', authorized: false, policyVersion: 'v2.4', reasonCodes: ['PRODUCT_INACTIVE'] };
    }
    if (!product.allowedChannels.includes(channel)) {
      reasonCodes.push(`CHANNEL_DISALLOWED: ${channel}`);
    }

    // 4. Limit Evaluation
    const limitResult = limitEngine.evaluateLimit({ customer, account, transactionAmount });
    if (!limitResult.allowed) {
      reasonCodes.push(...limitResult.reasonCodes);
    }

    // 5. Device Trust Score
    if (deviceTrustScore < 70) {
      return {
        decision: 'STEP_UP',
        authorized: false,
        policyVersion: 'v2.4',
        reasonCodes: ['ELEVATED_DEVICE_RISK: Step-up biometric/OTP challenge required'],
      };
    }

    // 6. Sufficient Balance Check
    if (account.availableBalance < transactionAmount) {
      reasonCodes.push(`INSUFFICIENT_AVAILABLE_BALANCE (${account.currency} ${account.availableBalance} < ${transactionAmount})`);
    }

    if (reasonCodes.length > 0) {
      return {
        decision: 'DECLINE',
        authorized: false,
        policyVersion: 'v2.4',
        reasonCodes,
      };
    }

    return {
      decision: 'ALLOW',
      authorized: true,
      policyVersion: 'v2.4',
      reasonCodes: ['POLICY_CRITERIA_SATISFIED'],
    };
  }
}
