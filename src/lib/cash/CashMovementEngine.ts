// Cash Movement State Machine & Transfer Engine

import { CashMovementRecord, CashMovementStatus } from '@/types/physicalCashEngine';
import { CashLocationEngine } from './CashLocationEngine';

export class CashMovementEngine {
  private static instance: CashMovementEngine;

  private movements: Map<string, CashMovementRecord> = new Map();

  private constructor() {
    this.seedMovements();
  }

  public static getInstance(): CashMovementEngine {
    if (!CashMovementEngine.instance) {
      CashMovementEngine.instance = new CashMovementEngine();
    }
    return CashMovementEngine.instance;
  }

  private seedMovements() {
    const defaultMovements: CashMovementRecord[] = [
      {
        id: 'mov-ng-01',
        movementReference: 'MOV-2026-0904-001',
        sourceLocationId: 'loc-vault-abj',
        sourceLocationName: 'Abuja Central Regional Vault',
        destinationLocationId: 'loc-till-garba',
        destinationLocationName: 'Garba Express POS Cash Till',
        movementType: 'VAULT_TO_TILL',
        amount: 500000,
        currency: 'NGN',
        status: 'RECEIVED',
        initiatedBy: 'ibrahim.danladi@koriepay.ng',
        approvedBy: 'zainab.bello@koriepay.ng',
        receivedBy: 'musa.garba@koriepay.ng',
        glJournalId: 'JE-CASH-2026-0904-010',
        createdAt: '2026-09-04T07:00:00Z',
        updatedAt: '2026-09-04T07:45:00Z',
      },
      {
        id: 'mov-ng-02',
        movementReference: 'MOV-2026-0904-002',
        sourceLocationId: 'loc-vault-los',
        sourceLocationName: 'Lagos Victoria Island Central Vault',
        destinationLocationId: 'loc-vault-abj',
        destinationLocationName: 'Abuja Central Regional Vault',
        movementType: 'BRANCH_TO_BRANCH',
        amount: 20000000,
        currency: 'NGN',
        status: 'IN_TRANSIT',
        initiatedBy: 'emeka.nwosu@koriepay.ng',
        approvedBy: 'folake.adeleke@koriepay.ng',
        glJournalId: 'JE-CASH-2026-0904-011',
        createdAt: '2026-09-04T06:30:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
      {
        id: 'mov-ne-01',
        movementReference: 'MOV-2026-0904-003',
        sourceLocationId: 'loc-vault-nim',
        sourceLocationName: 'Niamey Plateau Central Vault',
        destinationLocationId: 'loc-till-sahel',
        destinationLocationName: 'Sahel Kiosque Niamey Cash Till',
        movementType: 'VAULT_TO_TILL',
        amount: 2000000,
        currency: 'XOF',
        status: 'RECEIVED',
        initiatedBy: 'ousmane.mahamane@koriepay.ne',
        approvedBy: 'aminata.toure@koriepay.ne',
        receivedBy: 'ibrahim.sahel@koriepay.ne',
        glJournalId: 'JE-CASH-2026-0904-012',
        createdAt: '2026-09-04T07:15:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      },
    ];

    defaultMovements.forEach((m) => this.movements.set(m.id, m));
  }

  public getMovements(): CashMovementRecord[] {
    return Array.from(this.movements.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getMovement(id: string): CashMovementRecord | undefined {
    return this.movements.get(id);
  }

  public createMovement(params: {
    sourceLocationId: string;
    destinationLocationId: string;
    movementType: string;
    amount: number;
    currency: 'NGN' | 'XOF';
    initiatedBy: string;
  }): CashMovementRecord {
    const locEngine = CashLocationEngine.getInstance();
    const sourceLoc = locEngine.getLocation(params.sourceLocationId);
    const destLoc = locEngine.getLocation(params.destinationLocationId);

    const id = `mov-${params.currency.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const movementReference = `MOV-2026-${Date.now().toString().slice(-6)}`;

    const movement: CashMovementRecord = {
      id,
      movementReference,
      sourceLocationId: params.sourceLocationId,
      sourceLocationName: sourceLoc?.name || 'Source',
      destinationLocationId: params.destinationLocationId,
      destinationLocationName: destLoc?.name || 'Destination',
      movementType: params.movementType,
      amount: params.amount,
      currency: params.currency,
      status: 'APPROVAL_REQUIRED',
      initiatedBy: params.initiatedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.movements.set(id, movement);
    return movement;
  }

  public approveMovement(movementId: string, approvedBy: string): { success: boolean; movement?: CashMovementRecord } {
    const mov = this.movements.get(movementId);
    if (!mov) return { success: false };

    mov.status = 'APPROVED';
    mov.approvedBy = approvedBy;
    mov.updatedAt = new Date().toISOString();

    this.movements.set(movementId, mov);
    return { success: true, movement: mov };
  }

  public dispatchMovement(movementId: string): { success: boolean; movement?: CashMovementRecord } {
    const mov = this.movements.get(movementId);
    if (!mov) return { success: false };

    mov.status = 'IN_TRANSIT';
    mov.updatedAt = new Date().toISOString();

    this.movements.set(movementId, mov);
    return { success: true, movement: mov };
  }

  public receiveMovement(movementId: string, receivedBy: string): { success: boolean; movement?: CashMovementRecord } {
    const mov = this.movements.get(movementId);
    if (!mov) return { success: false };

    mov.status = 'RECEIVED';
    mov.receivedBy = receivedBy;
    mov.updatedAt = new Date().toISOString();

    this.movements.set(movementId, mov);
    return { success: true, movement: mov };
  }
}
