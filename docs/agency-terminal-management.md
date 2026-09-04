# POS Terminal Management, Inventory & Chain of Custody

## 1. Terminal Inventory & Hardware Capabilities
The Terminal Master tracks the full lifecycle of physical payment terminals:
- **Terminal Hardware Types**: `ANDROID_POS` (e.g. PAX A920, Nexgo N5), `MOBILE_POS` (mPOS Bluetooth), `SOFTPOS` (NFC COTS), `AGENCY_KIOSK`.
- **Capability Profiles**: Configurable per terminal (`CASH_IN`, `CASH_OUT`, `NIP_TRANSFER`, `BCEAO_SIP`, `BILL_PAYMENT`, `CARD_CHIP_PIN`, `QR_SCAN`).

---

## 2. Chain of Custody & Secure Transfer Workflow
Physical terminals can never be silently reassigned between agents:
$$\text{INVENTORY} \rightarrow \text{DISPATCH} \rightarrow \text{RECEIPT\_CONFIRMED} \rightarrow \text{AGENT\_BOUND} \rightarrow \text{CERTIFIED\_ACTIVE}$$
- Transferring a terminal requires dual verification: Old Owner Release $\rightarrow$ Risk/Compliance Check $\rightarrow$ New Owner Acceptance.
