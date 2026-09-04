// MLOps Model Registry, Drift Telemetry & Emergency Kill Switch Engine

import { AiModelRegistryRecord, AiKillSwitchRecord } from '@/types/intelligenceEngine';

export class ModelGovernanceEngine {
  private static instance: ModelGovernanceEngine;

  private models: Map<string, AiModelRegistryRecord> = new Map();
  private killSwitches: Map<string, AiKillSwitchRecord> = new Map();

  private constructor() {
    this.seedRegistry();
  }

  public static getInstance(): ModelGovernanceEngine {
    if (!ModelGovernanceEngine.instance) {
      ModelGovernanceEngine.instance = new ModelGovernanceEngine();
    }
    return ModelGovernanceEngine.instance;
  }

  private seedRegistry() {
    const defaultModels: AiModelRegistryRecord[] = [
      {
        id: 'mdl-01',
        modelCode: 'MDL-CLV-01',
        modelName: 'Customer Lifetime Value Gradient Booster',
        domain: 'Customer Intelligence',
        version: 'v2.1.0',
        algorithm: 'LightGBM Regressor',
        status: 'PRODUCTION',
        driftStatus: 'STABLE',
        validationMetric: 'RMSE = 0.042 (P95 Confidence)',
        ownerDesk: 'Customer Analytics Squad',
      },
      {
        id: 'mdl-02',
        modelCode: 'MDL-CHN-01',
        modelName: 'Customer Churn & Attrition Classifier',
        domain: 'Customer Intelligence',
        version: 'v2.4.1',
        algorithm: 'XGBoost Classification Tree',
        status: 'PRODUCTION',
        driftStatus: 'STABLE',
        validationMetric: 'AUC-ROC = 0.912',
        ownerDesk: 'Retention Engineering Desk',
      },
      {
        id: 'mdl-03',
        modelCode: 'MDL-FCST-01',
        modelName: '30D Multi-Horizon Revenue Forecaster',
        domain: 'Financial Planning',
        version: 'v1.8.0',
        algorithm: 'ARIMA + Seasonal Holt-Winters',
        status: 'PRODUCTION',
        driftStatus: 'STABLE',
        validationMetric: 'MAPE = 2.4%',
        ownerDesk: 'Group Treasury & FP&A',
      },
    ];

    const defaultSwitches: AiKillSwitchRecord[] = [
      { id: 'ks-all', switchTarget: 'ALL_AI_SERVICES', isActive: false },
      { id: 'ks-copilot', switchTarget: 'AI_EXECUTIVE_COPILOT', isActive: false },
      { id: 'ks-scenarios', switchTarget: 'WHAT_IF_SCENARIO_SIMULATOR', isActive: false },
    ];

    defaultModels.forEach((m) => this.models.set(m.id, m));
    defaultSwitches.forEach((k) => this.killSwitches.set(k.switchTarget, k));
  }

  public getModels(): AiModelRegistryRecord[] {
    return Array.from(this.models.values());
  }

  public getKillSwitches(): AiKillSwitchRecord[] {
    return Array.from(this.killSwitches.values());
  }

  public toggleKillSwitch(target: string, isActive: boolean, user: string, reason: string): AiKillSwitchRecord {
    const ks: AiKillSwitchRecord = {
      id: `ks-${Date.now()}`,
      switchTarget: target,
      isActive,
      activatedBy: user,
      activatedAt: new Date().toISOString(),
      reason,
    };
    this.killSwitches.set(target, ks);
    return ks;
  }
}
