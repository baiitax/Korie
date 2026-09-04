// Multi-Dimensional Agency Channel Authorization Engine

import { ChannelAuthorizationRequest, ChannelAuthorizationResult } from '@/types/agencyEngine';
import { AgentManagementEngine } from '../agents/AgentManagementEngine';
import { DeviceTrustEngine } from './DeviceTrustEngine';
import { TerminalManagementEngine } from './TerminalManagementEngine';

export class ChannelAuthorizationEngine {
  private static instance: ChannelAuthorizationEngine;

  private constructor() {}

  public static getInstance(): ChannelAuthorizationEngine {
    if (!ChannelAuthorizationEngine.instance) {
      ChannelAuthorizationEngine.instance = new ChannelAuthorizationEngine();
    }
    return ChannelAuthorizationEngine.instance;
  }

  public authorizeChannelOperation(req: ChannelAuthorizationRequest): ChannelAuthorizationResult {
    const agentEngine = AgentManagementEngine.getInstance();
    const deviceEngine = DeviceTrustEngine.getInstance();
    const terminalEngine = TerminalManagementEngine.getInstance();

    const agent = agentEngine.getAgent(req.agentId);
    const device = deviceEngine.getDevice(req.deviceId);
    const terminal = terminalEngine.getTerminal(req.terminalId);

    const reasonCodes: string[] = [];

    // 1. Agent Entity Status
    if (!agent) {
      return { decision: 'DECLINE', authorized: false, reasonCodes: ['AGENT_NOT_FOUND'], evaluatedAt: new Date().toISOString() };
    }
    if (agent.status !== 'ACTIVE') {
      return { decision: 'DECLINE', authorized: false, reasonCodes: [`AGENT_STATUS_${agent.status}`], evaluatedAt: new Date().toISOString() };
    }

    // 2. Device Hardware Trust
    if (!device) {
      return { decision: 'DECLINE', authorized: false, reasonCodes: ['DEVICE_UNREGISTERED'], evaluatedAt: new Date().toISOString() };
    }
    if (device.trustLevel === 'COMPROMISED' || device.isRooted) {
      return { decision: 'DECLINE', authorized: false, reasonCodes: ['DEVICE_COMPROMISED_ROOT_DETECTED'], evaluatedAt: new Date().toISOString() };
    }
    if (device.trustLevel === 'RESTRICTED') {
      reasonCodes.push('DEVICE_RESTRICTED');
    }

    // 3. Terminal Fleet Status & Capabilities
    if (!terminal) {
      return { decision: 'DECLINE', authorized: false, reasonCodes: ['TERMINAL_NOT_FOUND'], evaluatedAt: new Date().toISOString() };
    }
    if (terminal.status !== 'ACTIVE') {
      return { decision: 'DECLINE', authorized: false, reasonCodes: [`TERMINAL_STATUS_${terminal.status}`], evaluatedAt: new Date().toISOString() };
    }
    if (!terminal.capabilities.includes(req.transactionType)) {
      reasonCodes.push(`TERMINAL_CAPABILITY_DISALLOWED: ${req.transactionType}`);
    }

    // 4. Limits & Float Evaluation
    if (req.amount > agent.singleTransactionLimit) {
      reasonCodes.push(`EXCEEDS_SINGLE_TRANSACTION_LIMIT (${agent.currency} ${req.amount} > ${agent.singleTransactionLimit})`);
    }

    if (reasonCodes.length > 0) {
      return {
        decision: 'DECLINE',
        authorized: false,
        reasonCodes,
        evaluatedAt: new Date().toISOString(),
      };
    }

    return {
      decision: 'ALLOW',
      authorized: true,
      reasonCodes: ['CHANNEL_POLICY_CRITERIA_SATISFIED'],
      evaluatedAt: new Date().toISOString(),
    };
  }
}
