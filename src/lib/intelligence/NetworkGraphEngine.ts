// Ecosystem Network Graph & Cluster Topology Engine

import { NetworkGraphNode, NetworkGraphEdge } from '@/types/intelligenceEngine';

export class NetworkGraphEngine {
  private static instance: NetworkGraphEngine;

  private nodes: Map<string, NetworkGraphNode> = new Map();
  private edges: NetworkGraphEdge[] = [];

  private constructor() {
    this.seedGraph();
  }

  public static getInstance(): NetworkGraphEngine {
    if (!NetworkGraphEngine.instance) {
      NetworkGraphEngine.instance = new NetworkGraphEngine();
    }
    return NetworkGraphEngine.instance;
  }

  private seedGraph() {
    const defaultNodes: NetworkGraphNode[] = [
      { id: 'n-prov', nodeKey: 'NODE-PROVIDUS-BANK', nodeType: 'BANK_NODE', label: 'Providus Bank Nigeria Node', clusterId: 'SETTLEMENT_CORE', riskRating: 'LOW' },
      { id: 'n-koris', nodeKey: 'NODE-KORIS-BANK', nodeType: 'BANK_NODE', label: 'Coris Bank Niger SA Node', clusterId: 'SETTLEMENT_CORE', riskRating: 'LOW' },
      { id: 'n-agt1', nodeKey: 'NODE-AGT-KAN-001', nodeType: 'AGENT', label: 'Kano Agent Super-Hub', clusterId: 'NORTHERN_CORRIDOR', riskRating: 'LOW' },
      { id: 'n-agt2', nodeKey: 'NODE-AGT-MAR-002', nodeType: 'AGENT', label: 'Maradi Border Outpost', clusterId: 'NORTHERN_CORRIDOR', riskRating: 'LOW' },
      { id: 'n-mch1', nodeKey: 'NODE-MCH-SAHARA', nodeType: 'MERCHANT', label: 'Sahara Wholesale Corp', clusterId: 'COMMERCE_HUB', riskRating: 'LOW' },
      { id: 'n-cust1', nodeKey: 'NODE-CUST-88910', nodeType: 'CUSTOMER', label: 'High-Value Customer [Adewale O.]', clusterId: 'RETAIL_FLOW', riskRating: 'LOW' },
      { id: 'n-pos1', nodeKey: 'NODE-POS-LAG-991', nodeType: 'TERMINAL', label: 'Android POS [Enclave Verified]', clusterId: 'TERMINAL_FLEET', riskRating: 'LOW' },
    ];

    const defaultEdges: NetworkGraphEdge[] = [
      { id: 'e-1', sourceNodeId: 'n-cust1', targetNodeId: 'n-agt1', relationshipType: 'TRANSACTS_WITH', weight: 4.8 },
      { id: 'e-2', sourceNodeId: 'n-agt1', targetNodeId: 'n-agt2', relationshipType: 'REPLENISHES_FLOAT', weight: 3.5 },
      { id: 'e-3', sourceNodeId: 'n-agt1', targetNodeId: 'n-prov', relationshipType: 'SETTLES_WITH', weight: 5.0 },
      { id: 'e-4', sourceNodeId: 'n-agt2', targetNodeId: 'n-koris', relationshipType: 'SETTLES_WITH', weight: 5.0 },
      { id: 'e-5', sourceNodeId: 'n-mch1', targetNodeId: 'n-prov', relationshipType: 'SETTLES_WITH', weight: 4.2 },
      { id: 'e-6', sourceNodeId: 'n-agt1', targetNodeId: 'n-pos1', relationshipType: 'USES_DEVICE', weight: 5.0 },
    ];

    defaultNodes.forEach((n) => this.nodes.set(n.id, n));
    this.edges = defaultEdges;
  }

  public getTopology(): { nodes: NetworkGraphNode[]; edges: NetworkGraphEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }
}
