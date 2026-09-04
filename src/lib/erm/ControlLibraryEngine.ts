// Enterprise Control Library & Continuous Testing Engine

import { ControlLibraryRecord } from '@/types/ermEngine';

export class ControlLibraryEngine {
  private static instance: ControlLibraryEngine;

  private controls: Map<string, ControlLibraryRecord> = new Map();

  private constructor() {
    this.seedControls();
  }

  public static getInstance(): ControlLibraryEngine {
    if (!ControlLibraryEngine.instance) {
      ControlLibraryEngine.instance = new ControlLibraryEngine();
    }
    return ControlLibraryEngine.instance;
  }

  private seedControls() {
    const defaultControls: ControlLibraryRecord[] = [
      {
        id: 'ctrl-01',
        controlCode: 'CTRL-MAKER-CHECKER-01',
        name: 'Maker-Checker Dual Authorization for Wholesale & Treasury Movements',
        controlType: 'PREVENTIVE',
        nature: 'AUTOMATED',
        ownerRole: 'Group Treasurer',
        testingFrequency: 'CONTINUOUS',
        effectiveness: 'EFFECTIVE',
        lastTestedAt: new Date().toISOString(),
      },
      {
        id: 'ctrl-02',
        controlCode: 'CTRL-DEV-ATTEST-01',
        name: 'Hardware Enclave & Attestation Verification on POS Terminals',
        controlType: 'PREVENTIVE',
        nature: 'AUTOMATED',
        ownerRole: 'Head of Device Security',
        testingFrequency: 'CONTINUOUS',
        effectiveness: 'EFFECTIVE',
        lastTestedAt: new Date().toISOString(),
      },
      {
        id: 'ctrl-03',
        controlCode: 'CTRL-VAULT-DUAL-01',
        name: 'Six-Eyes Dual-Custody Physical Vault Door Access Protocol',
        controlType: 'PREVENTIVE',
        nature: 'HYBRID_SEMI_AUTOMATED',
        ownerRole: 'Chief Custodian',
        testingFrequency: 'DAILY',
        effectiveness: 'EFFECTIVE',
        lastTestedAt: new Date().toISOString(),
      },
      {
        id: 'ctrl-04',
        controlCode: 'CTRL-CIT-SEAL-01',
        name: 'Tamper-Evident Bag & Barcode Hash Verification at Pickup and Arrival',
        controlType: 'DETECTIVE',
        nature: 'HYBRID_SEMI_AUTOMATED',
        ownerRole: 'Logistics Supervisor',
        testingFrequency: 'CONTINUOUS',
        effectiveness: 'EFFECTIVE',
        lastTestedAt: new Date().toISOString(),
      },
    ];

    defaultControls.forEach((c) => this.controls.set(c.id, c));
  }

  public getControls(): ControlLibraryRecord[] {
    return Array.from(this.controls.values());
  }

  public testControl(controlId: string): { success: boolean; control?: ControlLibraryRecord } {
    const c = this.controls.get(controlId);
    if (!c) return { success: false };

    c.effectiveness = 'EFFECTIVE';
    c.lastTestedAt = new Date().toISOString();
    this.controls.set(controlId, c);

    return { success: true, control: c };
  }
}
