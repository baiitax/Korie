// Transaction Network & Multi-Hop Entity Relationship Graph Engine

import { AmlGraphNode, AmlGraphEdge } from '@/types/amlEngine';

export class AmlNetworkGraphEngine {
  private static instance: AmlNetworkGraphEngine;

  private nodes: Map<string, AmlGraphNode> = new Map();
  private edges: AmlGraphEdge[] = [];

  private constructor() {
    this.seedGraph();
  }

  public static getInstance(): AmlNetworkGraphEngine {
    if (!AmlNetworkGraphEngine.instance) {
      AmlNetworkGraphEngine.instance = new AmlNetworkGraphEngine();
    }
    return AmlNetworkGraphEngine.instance;
  }

  private seedGraph() {
    const defaultNodes: AmlGraphNode[] = [
      { id: 'n-01', nodeId: 'cust-ng-001-ibrahim', nodeType: 'CUSTOMER', label: 'Ibrahim Bello (Subject)', riskScore: 78.5 },
      { id: 'n-02', nodeId: 'acc-ng-0123456789', nodeType: 'ACCOUNT', label: 'NUBAN: 0123456789', riskScore: 75.0 },
      { id: 'n-03', nodeId: 'dev-pos-ng-01', nodeType: 'DEVICE', label: 'PAX A920 (POS-NG-01)', riskScore: 10.0 },
      { id: 'n-04', nodeId: 'ben-ext-9921', nodeType: 'BENEFICIARY', label: 'Amina Gambo (FBN)', riskScore: 40.0 },
      { id: 'n-05', nodeId: 'agt-ng-001', nodeType: 'AGENT', label: 'Garba Express POS', riskScore: 25.0 },
      { id: 'n-06', nodeId: 'cust-ne-001-amara', nodeType: 'CUSTOMER', label: 'Amara Diallo (Niamey)', riskScore: 45.0 },
    ];

    defaultNodes.forEach((n) => this.nodes.set(n.nodeId, n));

    this.edges = [
      {
        id: 'e-01',
        sourceNodeId: 'cust-ng-001-ibrahim',
        targetNodeId: 'acc-ng-0123456789',
        edgeType: 'SHARED_DEVICE',
        weight: 1.0,
        transactionCount: 28,
        totalVolume: 5000000,
        lastSeenAt: '2026-09-03T10:00:00Z',
      },
      {
        id: 'e-02',
        sourceNodeId: 'cust-ng-001-ibrahim',
        targetNodeId: 'ben-ext-9921',
        edgeType: 'TRANSFERRED_TO',
        weight: 0.9,
        transactionCount: 3,
        totalVolume: 4850000,
        lastSeenAt: '2026-09-03T10:15:00Z',
      },
      {
        id: 'e-03',
        sourceNodeId: 'cust-ng-001-ibrahim',
        targetNodeId: 'agt-ng-001',
        edgeType: 'AGENT_SERVICED',
        weight: 0.5,
        transactionCount: 12,
        totalVolume: 2500000,
        lastSeenAt: '2026-09-02T15:00:00Z',
      },
      {
        id: 'e-04',
        sourceNodeId: 'cust-ng-001-ibrahim',
        targetNodeId: 'cust-ne-001-amara',
        edgeType: 'TRANSFERRED_TO',
        weight: 0.8,
        transactionCount: 2,
        totalVolume: 1200000,
        lastSeenAt: '2026-09-01T12:00:00Z',
      },
    ];
  }

  public getNetworkForEntity(entityId: string, maxHops: number = 2): {
    nodes: AmlGraphNode[];
    edges: AmlGraphEdge[];
  } {
    const directEdges = this.edges.filter(
      (e) => e.sourceNodeId === entityId || e.targetNodeId === entityId
    );

    const connectedNodeIds = new Set<string>([entityId]);
    directEdges.forEach((e) => {
      connectedNodeIds.add(e.sourceNodeId);
      connectedNodeIds.add(e.targetNodeId);
    });

    const nodes = Array.from(connectedNodeIds)
      .map((id) => this.nodes.get(id))
      .filter(Boolean) as AmlGraphNode[];

    return {
      nodes,
      edges: directEdges,
    };
  }
}
