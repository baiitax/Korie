# Terminal Management, Geofencing & Firmware Control

## 1. Terminal Fleet Lifecycle
```
PROCURED ──> INVENTORIED ──> CONFIGURED ──> ASSIGNED ──> ACTIVE
                                                           │
              RETIRED <── REPAIRED <── RETURNED <── SUSPENDED / QUARANTINED
```

---

## 2. Immutable Assignment History
Terminals are strictly bound to authorized agents/merchants within specific operating jurisdictions. Every reassignment preserves immutable historical windows:
- $T_{\text{start}} \longrightarrow T_{\text{end}}$
- Previous Agent ID $\longrightarrow$ New Agent ID
- Aggregator Approval Reference & Dual Authorization Stamp

---

## 3. Geofence & Location Risk Engine
- **`IN_ZONE`**: Terminal coordinates match designated business operating polygon ($\le 250\text{m}$ radius).
- **`OUT_OF_ZONE`**: Terminal transacting outside authorized jurisdiction; requires step-up OTP.
- **`LOCATION_SUSPICIOUS`**: Impossible travel velocity ($> 800\text{km/h}$) or sudden country mutation (e.g. Lagos $\to$ Niamey within 10 minutes).
- **`LOCATION_BLOCKED`**: Automatic operational lock; transactions suspended pending Compliance review.
