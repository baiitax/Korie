import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# Set styling tokens
BG_COLOR = '#080D1A'
CARD_BG = '#0F172A'
ACCENT_EMERALD = '#10B981'
ACCENT_TEAL = '#0D9488'
ACCENT_AMBER = '#F59E0B'
ACCENT_ROSE = '#EF4444'
ACCENT_BLUE = '#3B82F6'
ACCENT_PURPLE = '#8B5CF6'
TEXT_WHITE = '#FFFFFF'
TEXT_MUTED = '#94A3B8'
BORDER_COLOR = '#1E293B'

def generate_diagram_1():
    """Diagram 1: End-to-End Enterprise Architecture"""
    fig, ax = plt.subplots(figsize=(12, 6.5), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    ax.axis('off')

    # Title
    ax.text(6, 6.1, "KORIEPAY END-TO-END ENTERPRISE ARCHITECTURE", 
            ha='center', va='center', color=TEXT_WHITE, fontsize=14, weight='bold')
    ax.text(6, 5.8, "Multi-Jurisdiction Flow from Digital Channels to Banking Settlement Nodes", 
            ha='center', va='center', color=ACCENT_EMERALD, fontsize=9)

    layers = [
        ("DIGITAL CHANNELS", ["Customer App", "Agent Web/POS", "Aggregator Portal", "Merchant API", "Admin Desk"], ACCENT_BLUE, 5.0),
        ("IDENTITY & RISK", ["Master Identity (KYC)", "AAL2/MFA Challenge", "Device Trust Engine", "AML/PEP Screening", "Velocity Engine"], ACCENT_PURPLE, 4.0),
        ("PRODUCT & SWITCH", ["Customer Wallets", "Agency Banking", "BDC & FX Gateway", "Adashi ROSCA Engine", "Payment Switch"], ACCENT_TEAL, 3.0),
        ("FINANCIAL CORE", ["Double-Entry Core Ledger", "Journal Entry Vault", "Immutable Hash Log", "Maker-Checker Guard", "Chart of Accounts"], ACCENT_EMERALD, 2.0),
        ("TREASURY & CLEARING", ["Central Liquidity Pool", "4-Way Reconciliation", "Suspense Account Desk", "Settlement Engine", "ALM Planning"], ACCENT_AMBER, 1.0),
        ("BANKING NODES", ["Providus Bank PLC (Nigeria - NGN)", "Koris Bank SA (Niger - XOF)", "NIBSS NIP Switch", "GIM-UEMOA Switch"], ACCENT_ROSE, 0.0),
    ]

    for title, items, color, y in layers:
        # Layer container
        rect = patches.FancyBboxPatch((0.5, y), 11.0, 0.65, boxstyle="round,pad=0.08,rounding_size=0.1",
                                      facecolor=CARD_BG, edgecolor=color, linewidth=1.5)
        ax.add_patch(rect)
        
        # Layer Title
        ax.text(0.8, y + 0.325, title, ha='left', va='center', color=color, fontsize=9, weight='bold')
        
        # Items pills
        x_start = 3.2
        spacing = 1.5
        for idx, item in enumerate(items):
            pill = patches.FancyBboxPatch((x_start + idx * spacing, y + 0.12), 1.4, 0.4,
                                          boxstyle="round,pad=0.04,rounding_size=0.08",
                                          facecolor='#1E293B', edgecolor='#334155', linewidth=0.8)
            ax.add_patch(pill)
            ax.text(x_start + idx * spacing + 0.7, y + 0.32, item, ha='center', va='center',
                    color=TEXT_WHITE, fontsize=6.2, weight='semibold')

        # Downward Arrow (except last)
        if y > 0:
            ax.annotate('', xy=(6.0, y - 0.28), xytext=(6.0, y),
                        arrowprops=dict(arrowstyle="-|>", color=TEXT_MUTED, lw=1.2, mutation_scale=10))

    ax.set_xlim(0, 12)
    ax.set_ylim(-0.3, 6.5)
    plt.tight_layout()
    plt.savefig('KoriePay_Confidential_Architecture_Diagrams/arch_01_platform_overview.png', 
                facecolor=BG_COLOR, edgecolor='none', dpi=300)
    plt.close()

def generate_diagram_2():
    """Diagram 2: Authoritative Financial Truth Hierarchy"""
    fig, ax = plt.subplots(figsize=(10, 6.0), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    ax.axis('off')

    ax.text(5, 5.6, "FINANCIAL TRUTH HIERARCHY & AUTHORITY BOUNDARIES", 
            ha='center', va='center', color=TEXT_WHITE, fontsize=13, weight='bold')
    ax.text(5, 5.3, "The Core Ledger is the Sole Authoritative Financial Source of Truth", 
            ha='center', va='center', color=ACCENT_AMBER, fontsize=8.5)

    nodes = [
        ("CORE LEDGER (AUTHORITATIVE TRUTH)", "Sole financial source of truth. Double-entry immutable journals. Assets = Liabilities + Equity.", ACCENT_EMERALD, 4.4, 1.8),
        ("PAYMENT SWITCH", "Transaction execution orchestration. Dispatches provider calls and enforces idempotency.", ACCENT_BLUE, 3.4, 1.5),
        ("SETTLEMENT ENGINE", "Records confirmed external movements and clearing batches with bank nodes.", ACCENT_PURPLE, 2.5, 1.5),
        ("RECONCILIATION ENGINE", "4-Way comparison between Ledger, Switch, Bank Statement & Settlement. Identifies exceptions.", ACCENT_TEAL, 1.6, 1.5),
        ("CENTRAL LIQUIDITY POOL", "Multi-dimensional treasury positioning (Current, Available, Reserved, Restricted, In-Transit).", ACCENT_AMBER, 0.7, 1.5),
        ("ADASHI / ROSCA PRODUCT", "Rotating savings product orchestration. Adashi is NOT the ledger and reserves are NOT debits.", ACCENT_ROSE, -0.2, 1.5),
    ]

    for title, desc, color, y, height_scale in nodes:
        rect = patches.FancyBboxPatch((1.0, y), 8.0, 0.65, boxstyle="round,pad=0.08,rounding_size=0.1",
                                      facecolor=CARD_BG, edgecolor=color, linewidth=1.5)
        ax.add_patch(rect)
        ax.text(1.3, y + 0.42, title, ha='left', va='center', color=color, fontsize=8.5, weight='bold')
        ax.text(1.3, y + 0.20, desc, ha='left', va='center', color=TEXT_MUTED, fontsize=6.8)

        if y > 0:
            ax.annotate('', xy=(5.0, y - 0.22), xytext=(5.0, y),
                        arrowprops=dict(arrowstyle="-|>", color=TEXT_MUTED, lw=1.2, mutation_scale=8))

    ax.set_xlim(0, 10)
    ax.set_ylim(-0.5, 6.0)
    plt.tight_layout()
    plt.savefig('KoriePay_Confidential_Architecture_Diagrams/arch_02_financial_truth_hierarchy.png', 
                facecolor=BG_COLOR, edgecolor='none', dpi=300)
    plt.close()

def generate_diagram_3():
    """Diagram 3: Adashi Lifecycle & Rotation Engine"""
    fig, ax = plt.subplots(figsize=(11, 5.5), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    ax.axis('off')

    ax.text(5.5, 5.1, "ADASHI ROSCA LIFECYCLE & CRYPTOGRAPHIC ROTATION ENGINE", 
            ha='center', va='center', color=TEXT_WHITE, fontsize=13, weight='bold')
    ax.text(5.5, 4.8, "HMAC-SHA256 Deterministic Allocation, Contribution Engine & Dual-Auth Payout", 
            ha='center', va='center', color=ACCENT_EMERALD, fontsize=8.5)

    stages = [
        ("1. INITIATION", "Agent creates Circle\nSets frequency & rules\nInvites members", ACCENT_BLUE, 0.5),
        ("2. CONSENT & LOCK", "Members accept terms\nKYC verification check\nMembership locked", ACCENT_PURPLE, 2.5),
        ("3. HMAC ALLOCATION", "Seed + Group Hash\nHMAC-SHA256 sort\nDeterministic slots", ACCENT_AMBER, 4.5),
        ("4. CONTRIBUTION", "Obligations generated\nDebit retries / Grace\nPool aggregated", ACCENT_TEAL, 6.5),
        ("5. PAYOUT ENGINE", "Liquidity reservation\nMaker-Checker gate\nWallet/Bank credit", ACCENT_EMERALD, 8.5),
    ]

    for title, desc, color, x in stages:
        rect = patches.FancyBboxPatch((x, 1.5), 1.8, 2.6, boxstyle="round,pad=0.08,rounding_size=0.12",
                                      facecolor=CARD_BG, edgecolor=color, linewidth=1.5)
        ax.add_patch(rect)
        ax.text(x + 0.9, 3.7, title, ha='center', va='center', color=color, fontsize=8.5, weight='bold')
        ax.text(x + 0.9, 2.6, desc, ha='center', va='center', color=TEXT_WHITE, fontsize=7.2, linespacing=1.4)

        if x < 8.0:
            ax.annotate('', xy=(x + 2.4, 2.8), xytext=(x + 1.9, 2.8),
                        arrowprops=dict(arrowstyle="-|>", color=TEXT_MUTED, lw=1.5, mutation_scale=10))

    # Invariants box below
    inv_rect = patches.FancyBboxPatch((0.5, 0.2), 9.8, 0.9, boxstyle="round,pad=0.06,rounding_size=0.08",
                                     facecolor='#1E293B', edgecolor=ACCENT_EMERALD, linewidth=1.0)
    ax.add_patch(inv_rect)
    ax.text(5.4, 0.75, "FINANCIAL & CRYPTOGRAPHIC INVARIANTS", ha='center', va='center', color=ACCENT_EMERALD, fontsize=8, weight='bold')
    ax.text(5.4, 0.45, "No Math.random() • Exactly 1 Slot per Member • Exactly 1 Payout per Cycle • Reservations !== Ledger Debits",
            ha='center', va='center', color=TEXT_MUTED, fontsize=7)

    ax.set_xlim(0, 11)
    ax.set_ylim(0, 5.5)
    plt.tight_layout()
    plt.savefig('KoriePay_Confidential_Architecture_Diagrams/arch_03_adashi_rotation_flow.png', 
                facecolor=BG_COLOR, edgecolor='none', dpi=300)
    plt.close()

def generate_diagram_4():
    """Diagram 4: Central Liquidity Pool & Currency Firewall"""
    fig, ax = plt.subplots(figsize=(11, 5.8), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    ax.axis('off')

    ax.text(5.5, 5.4, "CENTRAL LIQUIDITY INFRASTRUCTURE & NGN/XOF FIREWALL", 
            ha='center', va='center', color=TEXT_WHITE, fontsize=13, weight='bold')
    ax.text(5.5, 5.1, "Strict Currency Isolation: NGN and XOF Must Never Silently Aggregate", 
            ha='center', va='center', color=ACCENT_ROSE, fontsize=8.5)

    # Treasury Top
    top_rect = patches.FancyBboxPatch((3.5, 4.0), 4.0, 0.75, boxstyle="round,pad=0.08,rounding_size=0.1",
                                     facecolor=CARD_BG, edgecolor=ACCENT_EMERALD, linewidth=1.5)
    ax.add_patch(top_rect)
    ax.text(5.5, 4.45, "KORIEPAY CENTRAL TREASURY", ha='center', va='center', color=ACCENT_EMERALD, fontsize=9.5, weight='bold')
    ax.text(5.5, 4.20, "Multi-Currency Liquidity Orchestrator", ha='center', va='center', color=TEXT_MUTED, fontsize=7)

    # Left: Nigeria NGN Pool
    ng_rect = patches.FancyBboxPatch((0.5, 1.2), 4.5, 2.2, boxstyle="round,pad=0.08,rounding_size=0.12",
                                     facecolor=CARD_BG, edgecolor=ACCENT_BLUE, linewidth=1.5)
    ax.add_patch(ng_rect)
    ax.text(2.75, 3.1, "NIGERIA POOL (KP-NG)", ha='center', va='center', color=ACCENT_BLUE, fontsize=9, weight='bold')
    ax.text(2.75, 2.7, "Currency: NGN (Nigerian Naira)\nNode: Providus Bank PLC Clearing Vault\nPools: KP-NG-LIQUIDITY, ADASHI-RES-NG\nRegulator: Central Bank of Nigeria (CBN)",
            ha='center', va='center', color=TEXT_WHITE, fontsize=7, linespacing=1.3)

    # Right: Niger XOF Pool
    ne_rect = patches.FancyBboxPatch((6.0, 1.2), 4.5, 2.2, boxstyle="round,pad=0.08,rounding_size=0.12",
                                     facecolor=CARD_BG, edgecolor=ACCENT_AMBER, linewidth=1.5)
    ax.add_patch(ne_rect)
    ax.text(8.25, 3.1, "NIGER POOL (KP-NE)", ha='center', va='center', color=ACCENT_AMBER, fontsize=9, weight='bold')
    ax.text(8.25, 2.7, "Currency: XOF (West African CFA Franc)\nNode: Koris Bank SA Settlement Vault\nPools: KP-NE-LIQUIDITY, ADASHI-RES-NE\nRegulator: BCEAO / WAEMU Ecosystem",
            ha='center', va='center', color=TEXT_WHITE, fontsize=7, linespacing=1.3)

    # Firewall Barrier in Center
    fw_rect = patches.FancyBboxPatch((5.1, 1.3), 0.8, 2.0, boxstyle="round,pad=0.04,rounding_size=0.06",
                                    facecolor='#7F1D1D', edgecolor=ACCENT_ROSE, linewidth=1.5)
    ax.add_patch(fw_rect)
    ax.text(5.5, 2.3, "FIREWALL\nNO SILENT\nMIXING", ha='center', va='center', color=TEXT_WHITE, fontsize=6.5, weight='black')

    # FX Bridge below
    fx_rect = patches.FancyBboxPatch((2.5, 0.1), 6.0, 0.8, boxstyle="round,pad=0.06,rounding_size=0.08",
                                     facecolor='#1E293B', edgecolor=ACCENT_PURPLE, linewidth=1.2)
    ax.add_patch(fx_rect)
    ax.text(5.5, 0.60, "CONTROLLED FX CONVERSION BRIDGE", ha='center', va='center', color=ACCENT_PURPLE, fontsize=8, weight='bold')
    ax.text(5.5, 0.35, "Requires: FX Quote -> Approved Rate -> Dual Treasury Signoff -> Double-Entry Ledger Posting",
            ha='center', va='center', color=TEXT_MUTED, fontsize=6.8)

    ax.annotate('', xy=(2.75, 3.5), xytext=(4.5, 4.0), arrowprops=dict(arrowstyle="<|-", color=ACCENT_BLUE, lw=1.2))
    ax.annotate('', xy=(8.25, 3.5), xytext=(6.5, 4.0), arrowprops=dict(arrowstyle="<|-", color=ACCENT_AMBER, lw=1.2))

    ax.set_xlim(0, 11)
    ax.set_ylim(0, 5.8)
    plt.tight_layout()
    plt.savefig('KoriePay_Confidential_Architecture_Diagrams/arch_04_liquidity_hierarchy.png', 
                facecolor=BG_COLOR, edgecolor='none', dpi=300)
    plt.close()

def generate_diagram_5():
    """Diagram 5: Transaction Lifecycle & Timeout Principle"""
    fig, ax = plt.subplots(figsize=(11, 5.2), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    ax.axis('off')

    ax.text(5.5, 4.8, "FINANCIAL TRANSACTION LIFECYCLE & TIMEOUT HANDLING", 
            ha='center', va='center', color=TEXT_WHITE, fontsize=13, weight='bold')
    ax.text(5.5, 4.5, "Golden Rule: Provider Timeout !== Failure (Avoid Blind Retries & Duplicate Debits)", 
            ha='center', va='center', color=ACCENT_AMBER, fontsize=8.5)

    steps = [
        ("1. INITIATION", "Idempotency Key\nRequest Hash\nAuth Check", 0.5, ACCENT_BLUE),
        ("2. RISK & AML", "Velocity Evaluation\nSanctions/PEP\nDevice Trust", 2.5, ACCENT_PURPLE),
        ("3. PAYMENT SWITCH", "Route Selection\nProvider Dispatch\nState: PENDING", 4.5, ACCENT_TEAL),
        ("4. STATE RESOLUTION", "Success -> COMMIT\nTimeout -> UNKNOWN\nReversal / Query", 6.5, ACCENT_AMBER),
        ("5. LEDGER & AUDIT", "Balanced JRN Post\nSettlement Batch\nAudit Logged", 8.5, ACCENT_EMERALD),
    ]

    for title, desc, x, color in steps:
        rect = patches.FancyBboxPatch((x, 1.6), 1.8, 2.4, boxstyle="round,pad=0.08,rounding_size=0.1",
                                      facecolor=CARD_BG, edgecolor=color, linewidth=1.5)
        ax.add_patch(rect)
        ax.text(x + 0.9, 3.6, title, ha='center', va='center', color=color, fontsize=8, weight='bold')
        ax.text(x + 0.9, 2.6, desc, ha='center', va='center', color=TEXT_WHITE, fontsize=7, linespacing=1.3)

        if x < 8.0:
            ax.annotate('', xy=(x + 2.4, 2.8), xytext=(x + 1.9, 2.8),
                        arrowprops=dict(arrowstyle="-|>", color=TEXT_MUTED, lw=1.2, mutation_scale=8))

    # Unknown Box
    un_rect = patches.FancyBboxPatch((0.5, 0.2), 9.8, 0.95, boxstyle="round,pad=0.06,rounding_size=0.08",
                                     facecolor='#7F1D1D', edgecolor=ACCENT_ROSE, linewidth=1.2)
    ax.add_patch(un_rect)
    ax.text(5.4, 0.80, "CRITICAL: UNKNOWN TRANSACTION WORKFLOW (TIMEOUT != FAILURE)", ha='center', va='center', color='#FCA5A5', fontsize=8, weight='bold')
    ax.text(5.4, 0.45, "When provider times out -> Mark UNKNOWN -> Poll Provider Re-Query API -> If confirmed Success, post ledger -> If confirmed Failed, unlock funds. NEVER blindly retry outward debit.",
            ha='center', va='center', color=TEXT_WHITE, fontsize=6.8)

    ax.set_xlim(0, 11)
    ax.set_ylim(0, 5.2)
    plt.tight_layout()
    plt.savefig('KoriePay_Confidential_Architecture_Diagrams/arch_05_transaction_lifecycle.png', 
                facecolor=BG_COLOR, edgecolor='none', dpi=300)
    plt.close()

def generate_diagram_6():
    """Diagram 6: 12-Layer Defense in Depth Security Model"""
    fig, ax = plt.subplots(figsize=(11, 6.0), dpi=300)
    fig.patch.set_facecolor(BG_COLOR)
    ax.set_facecolor(BG_COLOR)
    ax.axis('off')

    ax.text(5.5, 5.6, "KORIEPAY 12-LAYER DEFENSE-IN-DEPTH CYBERSECURITY MODEL", 
            ha='center', va='center', color=TEXT_WHITE, fontsize=13, weight='bold')
    ax.text(5.5, 5.3, "Zero-Trust Architecture Protecting Consumer Assets, Identity and Ledgers", 
            ha='center', va='center', color=ACCENT_EMERALD, fontsize=8.5)

    layers = [
        ("Layer 1: Identity & IAM", "Verified customer & agent master identities", ACCENT_BLUE),
        ("Layer 2: Authentication", "AAL2 TOTP / FIDO2 WebAuthn & biometric gating", ACCENT_BLUE),
        ("Layer 3: Authorization (RBAC/ABAC)", "Server-authoritative role & scope validation", ACCENT_TEAL),
        ("Layer 4: Device Trust & PAM", "Device fingerprinting & privileged access limits", ACCENT_TEAL),
        ("Layer 5: API Gateway & Threat Shield", "HMAC webhook verification & rate limiting", ACCENT_PURPLE),
        ("Layer 6: Database & RLS Enforcement", "PostgreSQL Row Level Security per tenant/user", ACCENT_PURPLE),
        ("Layer 7: Financial Maker-Checker", "Dual-authorization threshold on payouts & sweeps", ACCENT_AMBER),
        ("Layer 8: Fraud & Anomaly Detection", "Real-time behavioral velocity and pattern rules", ACCENT_AMBER),
        ("Layer 9: AML/CFT/CPF Monitoring", "Automated PEP & Sanctions screening alerts", ACCENT_ROSE),
        ("Layer 10: Immutable Audit Vault", "Cryptographic hash chaining on journals & logs", ACCENT_ROSE),
        ("Layer 11: Observability & SIEM", "Real-time Prometheus/Sentry/Loki event stream", ACCENT_EMERALD),
        ("Layer 12: Incident Response (SEV1-4)", "Automated circuit breakers & kill-switch protocol", ACCENT_EMERALD),
    ]

    for idx, (title, desc, color) in enumerate(layers):
        col = idx % 2
        row = idx // 2
        x = 0.6 if col == 0 else 5.8
        y = 4.3 - (row * 0.75)

        rect = patches.FancyBboxPatch((x, y), 4.6, 0.62, boxstyle="round,pad=0.06,rounding_size=0.08",
                                      facecolor=CARD_BG, edgecolor=color, linewidth=1.2)
        ax.add_patch(rect)
        ax.text(x + 0.2, y + 0.40, title, ha='left', va='center', color=color, fontsize=8, weight='bold')
        ax.text(x + 0.2, y + 0.18, desc, ha='left', va='center', color=TEXT_MUTED, fontsize=6.8)

    ax.set_xlim(0, 11)
    ax.set_ylim(0, 6.0)
    plt.tight_layout()
    plt.savefig('KoriePay_Confidential_Architecture_Diagrams/arch_06_security_defense_depth.png', 
                facecolor=BG_COLOR, edgecolor='none', dpi=300)
    plt.close()

# Generate all diagrams
generate_diagram_1()
generate_diagram_2()
generate_diagram_3()
generate_diagram_4()
generate_diagram_5()
generate_diagram_6()
print("All 6 architectural diagrams generated successfully!")
