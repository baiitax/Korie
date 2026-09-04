// Cash-in-Transit (CIT) Management, Tamper-Evident Seals & Custody Chain Engine

import { CitShipmentRecord, CitCustodyEvent, CitShipmentStatus } from '@/types/physicalCashEngine';

export class CitOperationsEngine {
  private static instance: CitOperationsEngine;

  private shipments: Map<string, CitShipmentRecord> = new Map();
  private custodyEvents: CitCustodyEvent[] = [];

  private constructor() {
    this.seedCitShipments();
  }

  public static getInstance(): CitOperationsEngine {
    if (!CitOperationsEngine.instance) {
      CitOperationsEngine.instance = new CitOperationsEngine();
    }
    return CitOperationsEngine.instance;
  }

  private seedCitShipments() {
    const defaultShipments: CitShipmentRecord[] = [
      {
        id: 'cit-shp-01',
        shipmentCode: 'CIT-SHP-2026-0044',
        movementId: 'mov-ng-02',
        citProvider: 'G4S Secure Solutions Nigeria',
        vehicleRegNumber: 'G4S-ARM-ABJ-04',
        leadCourierName: 'Tunde Bakare',
        sealNumber: 'SEAL-NG-991823',
        currency: 'NGN',
        declaredAmount: 20000000,
        varianceAmount: 0,
        status: 'IN_TRANSIT',
        pickupAt: '2026-09-04T06:30:00Z',
        expectedArrivalAt: '2026-09-04T12:00:00Z',
        createdAt: '2026-09-04T06:00:00Z',
      },
      {
        id: 'cit-shp-02',
        shipmentCode: 'CIT-SHP-2026-0045',
        movementId: 'mov-ne-01',
        citProvider: 'Brinks West Africa (Niger)',
        vehicleRegNumber: 'BRK-NE-NIM-02',
        leadCourierName: 'Moussa Sidibe',
        sealNumber: 'SEAL-NE-449102',
        currency: 'XOF',
        declaredAmount: 50000000,
        countedReceivedAmount: 50000000,
        varianceAmount: 0,
        status: 'RECONCILED',
        pickupAt: '2026-09-03T10:00:00Z',
        expectedArrivalAt: '2026-09-03T14:00:00Z',
        actualArrivalAt: '2026-09-03T13:45:00Z',
        createdAt: '2026-09-03T09:30:00Z',
      },
    ];

    defaultShipments.forEach((s) => this.shipments.set(s.id, s));
  }

  public getShipments(): CitShipmentRecord[] {
    return Array.from(this.shipments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getShipment(id: string): CitShipmentRecord | undefined {
    return this.shipments.get(id);
  }

  public recordCustodyEvent(params: {
    shipmentId: string;
    eventType: string;
    actor: string;
    actorRole: string;
    locationCoordinates?: string;
  }): { success: boolean; error?: string } {
    const shp = this.shipments.get(params.shipmentId);
    if (!shp) return { success: false, error: 'SHIPMENT_NOT_FOUND' };

    const eventId = `evt-cit-${Date.now().toString().slice(-4)}`;
    const event: any = {
      id: eventId,
      shipmentId: params.shipmentId,
      eventType: params.eventType,
      actor: params.actor,
      actorRole: params.actorRole,
      locationCoordinates: params.locationCoordinates || '9.0765, 7.3986',
      evidenceHash: `SHA256:${Date.now().toString(16)}...`,
      timestamp: new Date().toISOString(),
    };

    this.custodyEvents.unshift(event);

    if (params.eventType === 'CIT_ACCEPTED') {
      shp.status = 'IN_TRANSIT';
    } else if (params.eventType === 'ARRIVED') {
      shp.status = 'ARRIVED';
      shp.actualArrivalAt = new Date().toISOString();
    } else if (params.eventType === 'VERIFIED') {
      shp.status = 'RECONCILED';
    }

    this.shipments.set(params.shipmentId, shp);
    return { success: true };
  }

  public getCustodyEvents(shipmentId?: string): CitCustodyEvent[] {
    if (shipmentId) {
      return this.custodyEvents.filter((e) => e.shipmentId === shipmentId);
    }
    return this.custodyEvents;
  }
}
