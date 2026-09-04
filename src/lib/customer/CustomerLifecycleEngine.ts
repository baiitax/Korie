// Tier-1 Customer Master & Lifecycle State Machine

import { CustomerRecord, CustomerLifecycleStatus } from '@/types/customerProductFactory';

export class CustomerLifecycleEngine {
  private static instance: CustomerLifecycleEngine;

  private customers: Map<string, CustomerRecord> = new Map();

  private constructor() {
    this.seedCustomers();
  }

  public static getInstance(): CustomerLifecycleEngine {
    if (!CustomerLifecycleEngine.instance) {
      CustomerLifecycleEngine.instance = new CustomerLifecycleEngine();
    }
    return CustomerLifecycleEngine.instance;
  }

  private seedCustomers() {
    const defaultCustomers: CustomerRecord[] = [
      {
        id: 'cust-ng-001-ibrahim',
        customerCode: 'CUST-NG-009182',
        tenantId: 'tenant-korie-core',
        identityRecordId: 'KID-NG-889102',
        fullName: 'Ibrahim Bello',
        email: 'ibrahim.bello@koriepay.ng',
        phone: '+2348099887766',
        country: 'NG',
        customerType: 'PERSONAL',
        status: 'ACTIVE',
        kycTier: 'TIER_2',
        riskStatus: 'LOW',
        riskScore: 12.5,
        dateOfBirth: '1988-04-12',
        residentialAddress: '14 Ademola Adetokunbo Crescent, Wuse II, Abuja, Nigeria',
        createdAt: '2026-08-01T08:00:00Z',
        updatedAt: '2026-09-03T12:00:00Z',
        lastLoginAt: '2026-09-03T14:15:00Z',
      },
      {
        id: 'cust-ne-001-amara',
        customerCode: 'CUST-NE-004419',
        tenantId: 'tenant-korie-core',
        identityRecordId: 'KID-NE-449102',
        fullName: 'Amara Diallo',
        email: 'amara.diallo@koriepay.ne',
        phone: '+22790223344',
        country: 'NE',
        customerType: 'PERSONAL',
        status: 'ACTIVE',
        kycTier: 'TIER_2',
        riskStatus: 'LOW',
        riskScore: 15.0,
        dateOfBirth: '1992-09-24',
        residentialAddress: 'Avenue de la Francophonie, Plateau, Niamey, Niger',
        createdAt: '2026-08-05T10:00:00Z',
        updatedAt: '2026-09-03T11:30:00Z',
        lastLoginAt: '2026-09-03T13:20:00Z',
      },
      {
        id: 'cust-ng-002-jumia',
        customerCode: 'CUST-ORG-008129',
        tenantId: 'tenant-korie-core',
        identityRecordId: 'KID-ORG-998822',
        fullName: 'Jumia Express Distribution Hub',
        email: 'finance.hub@jumia.com.ng',
        phone: '+2348033221100',
        country: 'NG',
        customerType: 'MERCHANT',
        status: 'ACTIVE',
        kycTier: 'TIER_3',
        riskStatus: 'LOW',
        riskScore: 8.0,
        residentialAddress: 'Ikeja Commercial Zone, Lagos, Nigeria',
        createdAt: '2026-08-10T11:00:00Z',
        updatedAt: '2026-09-03T10:00:00Z',
      },
    ];

    defaultCustomers.forEach((c) => this.customers.set(c.id, c));
  }

  public getCustomers(filters?: { country?: string; status?: string; type?: string }): CustomerRecord[] {
    let list = Array.from(this.customers.values());
    if (filters?.country && filters.country !== 'GLOBAL') {
      list = list.filter((c) => c.country === filters.country);
    }
    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.type && filters.type !== 'ALL') {
      list = list.filter((c) => c.customerType === filters.type);
    }
    return list;
  }

  public getCustomer(idOrCode: string): CustomerRecord | undefined {
    return (
      this.customers.get(idOrCode) ||
      Array.from(this.customers.values()).find((c) => c.customerCode === idOrCode || c.email === idOrCode)
    );
  }

  public registerCustomer(data: Omit<CustomerRecord, 'id' | 'customerCode' | 'status' | 'riskScore' | 'createdAt' | 'updatedAt'>): CustomerRecord {
    const id = `cust-${data.country.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const customerCode = `CUST-${data.country}-${Math.floor(Math.random() * 90000 + 10000)}`;

    const newCust: CustomerRecord = {
      ...data,
      id,
      customerCode,
      status: 'APPLICATION_STARTED',
      riskScore: 10.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customers.set(id, newCust);
    return newCust;
  }

  public transitionStatus(customerId: string, status: CustomerLifecycleStatus, reason: string): { success: boolean; customer?: CustomerRecord; error?: string } {
    const customer = this.customers.get(customerId);
    if (!customer) {
      return { success: false, error: 'CUSTOMER_NOT_FOUND' };
    }

    customer.status = status;
    customer.updatedAt = new Date().toISOString();
    this.customers.set(customerId, customer);

    return { success: true, customer };
  }
}
