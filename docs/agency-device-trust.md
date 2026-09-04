# Device Trust, Attestation & Hardware Security

## 1. Device Trust Registry & Security Posture
Every smartphone, tablet, and smart POS running KoriePay Agent applications must be enrolled in the Device Trust Registry:
- **Hardware Fingerprint**: Cryptographic hash of secure enclave identifiers, board serial, and hardware public key.
- **Trust Levels**: `UNKNOWN` | `LOW` | `STANDARD` | `TRUSTED` | `HIGH_TRUST` | `RESTRICTED` | `COMPROMISED`.

---

## 2. Attestation & Integrity Evaluation
- **Integrity Signals**: Verification of Google Play Integrity API / Apple App Attest tokens.
- **Root / Jailbreak Detection**: Real-time detection of superuser binaries, debugging hooks, or emulator execution environments.
- **Device-Level Granular Restriction**: Suspending a compromised device (e.g. `DEV-POS-NG-01`) immediately terminates active sessions without suspending the agent's overall corporate entity or other trusted devices.
