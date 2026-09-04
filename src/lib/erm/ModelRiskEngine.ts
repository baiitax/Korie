// Model Risk Governance & Quantitative Model Inventory Engine

import { ModelRiskRecord } from '@/types/ermEngine';

export class ModelRiskEngine {
  private static instance: ModelRiskEngine;

  private models: Map<string, ModelRiskRecord> = new Map();

  private constructor() {
    this.seedModels();
  }

  public static getInstance(): ModelRiskEngine {
    if (!ModelRiskEngine.instance) {
      ModelRiskEngine.instance = new ModelRiskEngine();
    }
    return ModelRiskEngine.instance;
  }

  private seedModels() {
    const defaultModels: ModelRiskRecord[] = [
      {
        id: 'mdl-01',
        modelCode: 'MDL-FRD-SCORER-v2',
        modelName: 'Real-Time Transaction Fraud XGBoost Classifier',
        owner: 'Risk Engineering Desk',
        version: 'v2.4.1',
        status: 'PRODUCTION',
        lastValidatedAt: '2026-07-15',
        driftStatus: 'STABLE',
      },
      {
        id: 'mdl-02',
        modelCode: 'MDL-AML-STRUCT-v1',
        modelName: 'Structuring & Smurfing Velocity Isolation Engine',
        owner: 'Financial Crime Compliance Squad',
        version: 'v1.8.0',
        status: 'PRODUCTION',
        lastValidatedAt: '2026-08-01',
        driftStatus: 'STABLE',
      },
      {
        id: 'mdl-03',
        modelCode: 'MDL-CSH-FCST-v1',
        modelName: 'Regional Cash Demand & Till Replenishment Forecaster',
        owner: 'Treasury Analytics Desk',
        version: 'v1.2.0',
        status: 'PRODUCTION',
        lastValidatedAt: '2026-08-20',
        driftStatus: 'STABLE',
      },
    ];

    defaultModels.forEach((m) => this.models.set(m.id, m));
  }

  public getModels(): ModelRiskRecord[] {
    return Array.from(this.models.values());
  }
}
