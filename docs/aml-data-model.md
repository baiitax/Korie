# AML Data Architecture & Schema Specification

## 1. Core Schema Entities
- `aml_customer_profiles`: Expected activity baselines, declared income, source of wealth.
- `aml_risk_profiles`: Multi-dimensional AML risk scores (Customer, Geo, Product, Channel).
- `aml_events`: High-throughput normalized transaction event stream.
- `aml_scenarios` & `aml_scenario_versions`: Versioned detection logic and parameters.
- `aml_alerts` & `aml_alert_clusters`: Deduplicated alerts with full feature snapshots.
- `aml_cases`, `aml_case_notes`, `aml_case_evidence`: Investigation dossiers with immutable chain of custody.
- `aml_graph_nodes` & `aml_graph_edges`: Multi-hop relationship intelligence graph.
- `aml_screening_records`: Sanctions, PEP, and adverse media results.
