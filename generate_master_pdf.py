import os
import sys
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Image, HRFlowable
)
from reportlab.pdfgen import canvas

# Date string
CURRENT_DATE = datetime.now().strftime("%B %d, %Y")

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute total pages and render running headers/footers.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            # Suppress running header/footer on cover page
            return

        self.saveState()
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Top Header
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(40, A4[1] - 40, A4[0] - 40, A4[1] - 40)

        self.drawString(40, A4[1] - 34, "KORIEPAY — STRICTLY CONFIDENTIAL // SYSTEM & FINANCIAL ARCHITECTURE MANUAL")
        self.drawRightString(A4[0] - 40, A4[1] - 34, "INTERNAL USE ONLY")

        # Running Bottom Footer
        self.line(40, 45, A4[0] - 40, 45)
        self.drawString(40, 32, "KoriePay Confidential — Unauthorized distribution, copying or disclosure is strictly prohibited.")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 40, 32, page_str)

        # Subtle Security Classification Label
        self.setFont("Helvetica-Bold", 6.5)
        self.setFillColor(colors.HexColor("#EF4444"))
        self.drawRightString(A4[0] - 40, 22, "CLASSIFICATION: STRICTLY CONFIDENTIAL // TIER-1 BANKING ACCESS")

        self.restoreState()


def build_manual_pdf():
    pdf_path = "KoriePay_Confidential_System_Financial_Compliance_Manual_v1.0.pdf"
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=50,
        bottomMargin=55
    )

    # Styles
    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#080D1A")
    accent_emerald = colors.HexColor("#10B981")
    accent_teal = colors.HexColor("#0D9488")
    accent_amber = colors.HexColor("#D97706")
    accent_red = colors.HexColor("#DC2626")
    text_dark = colors.HexColor("#0F172A")
    text_muted = colors.HexColor("#475569")
    bg_light = colors.HexColor("#F8FAFC")
    border_color = colors.HexColor("#CBD5E1")

    # Document Title Styles
    cover_title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=colors.HexColor("#080D1A"),
        alignment=0,
        spaceAfter=8
    )

    cover_subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=20,
        textColor=colors.HexColor("#0D9488"),
        alignment=0,
        spaceAfter=12
    )

    cover_desc_style = ParagraphStyle(
        'CoverDesc',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=text_muted,
        alignment=0,
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#080D1A"),
        spaceBefore=18,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#0D9488"),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'H3',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=text_dark,
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=14,
        bulletIndent=4,
        spaceAfter=3
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor("#1E293B")
    )

    callout_bold = ParagraphStyle(
        'CalloutBold',
        parent=callout_style,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor("#080D1A")
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.white,
        alignment=0
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=text_dark,
        alignment=0
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0F172A")
    )

    story = []

    # Helper function for callout box
    def make_callout(title, text, border_color_code="#10B981", bg_color_code="#F0FDF4"):
        content = [
            Paragraph(f"<b>{title}</b>", callout_bold),
            Spacer(1, 3),
            Paragraph(text, callout_style)
        ]
        t = Table([[content]], colWidths=[A4[0] - 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(bg_color_code)),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(border_color_code)),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        return t

    # Helper function for warning box
    def make_warning(title, text):
        return make_callout(title, text, "#EF4444", "#FEF2F2")

    # =========================================================================
    # COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 20))
    
    # Classification Badge
    class_badge = Table([[
        Paragraph("<font color='#DC2626'><b>KORIEPAY — STRICTLY CONFIDENTIAL // ACCESS LEVEL: AUTHORIZED PERSONNEL ONLY</b></font>", 
                  ParagraphStyle('Badge', fontName='Helvetica-Bold', fontSize=8, alignment=1))
    ]], colWidths=[A4[0] - 80])
    class_badge.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FEF2F2")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#FCA5A5")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(class_badge)
    story.append(Spacer(1, 25))

    # Document Titles
    story.append(Paragraph("KORIEPAY", cover_title_style))
    story.append(Paragraph("Confidential System, Financial Architecture, Compliance & Implementation Manual", cover_subtitle_style))
    story.append(Paragraph("A Unified Reference & Engineering Blueprint for Tier-1 Core Banking, Double-Entry General Ledger, Central Liquidity Pools, Adashi / ROSCA Orchestration, and Bilateral Financial Rails across Nigeria (NGN) and Niger Republic (XOF).", cover_desc_style))
    story.append(Spacer(1, 15))

    # Cover Metadata Block
    meta_data = [
        [Paragraph("<b>DOCUMENT CONTROL IDENTIFIERS</b>", table_header_style), Paragraph("<b>SPECIFICATION</b>", table_header_style)],
        [Paragraph("Document Classification", table_cell_bold), Paragraph("STRICTLY CONFIDENTIAL // INTERNAL USE ONLY", table_cell_style)],
        [Paragraph("Access Level", table_cell_bold), Paragraph("Tier-1 Leadership, Core Engineering, Treasury, Compliance, Regulated Partners", table_cell_style)],
        [Paragraph("Document Owner", table_cell_bold), Paragraph("KoriePay Executive Management & Board of Directors", table_cell_style)],
        [Paragraph("Technical Owner", table_cell_bold), Paragraph("KoriePay Technology, Core Banking & Cybersecurity Division", table_cell_style)],
        [Paragraph("Document Version / Status", table_cell_bold), Paragraph("Version 1.0 — Approved Institutional Baseline", table_cell_style)],
        [Paragraph("Effective Publication Date", table_cell_bold), Paragraph(CURRENT_DATE, table_cell_style)],
        [Paragraph("Operating Jurisdictions", table_cell_bold), Paragraph("Nigeria (NGN / Providus Bank Node) & Niger Republic (XOF / Coris Bank Node)", table_cell_style)],
        [Paragraph("Mandatory Review Cycle", table_cell_bold), Paragraph("Quarterly or upon material system, infrastructural, or regulatory changes", table_cell_style)],
    ]
    meta_table = Table(meta_data, colWidths=[180, A4[0] - 80 - 180])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#080D1A")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 25))

    # Primary Architecture Preview on Cover
    if os.path.exists("KoriePay_Confidential_Architecture_Diagrams/arch_01_platform_overview.png"):
        story.append(Image("KoriePay_Confidential_Architecture_Diagrams/arch_01_platform_overview.png", width=500, height=270))

    story.append(PageBreak())

    # =========================================================================
    # EXECUTIVE LEGAL & COMPLIANCE DISCLAIMER
    # =========================================================================
    story.append(Paragraph("MANDATORY REGULATORY & COMPLIANCE DISCLAIMER", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))
    
    disclaimer_text = (
        "This document is an internal technology, operational, financial architecture, and compliance-readiness manual prepared "
        "exclusively for authorized executives, engineers, auditors, and partner financial institutions of KoriePay. "
        "This document does not constitute formal legal advice, a direct banking licence, payment service bank licence, "
        "or standalone regulatory authorization. All financial operations in the Federal Republic of Nigeria operate in strict alignment "
        "with Central Bank of Nigeria (CBN) regulations, the Banks and Other Financial Institutions Act (BOFIA 2020), and commercial clearing nodes (Providus Bank PLC). "
        "All operations in the Republic of Niger operate within the West African Economic and Monetary Union (WAEMU / UEMOA) framework "
        "supervised by the Banque Centrale des États de l'Afrique de l'Ouest (BCEAO) in partnership with Coris Bank SA. "
        "Production deployment is strictly contingent upon verified regulatory filings, data localization compliance under the Nigeria Data Protection Act 2023 (NDPA), "
        "and active institutional maker-checker authorization protocols."
    )
    story.append(make_callout("REGULATORY FRAMEWORK & BOUNDARIES", disclaimer_text, "#0D9488", "#F0FDFA"))
    story.append(Spacer(1, 12))

    story.append(Paragraph("1.0 EXECUTIVE DOCUMENT PURPOSE & INTENDED AUDIENCE", h1_style))
    story.append(Paragraph(
        "This master technical and operational manual establishes a single authoritative baseline for KoriePay's enterprise architecture. "
        "It governs how capital flows across borders, how double-entry ledger journals record immutable financial truth, how central liquidity pools are safeguarded, "
        "how the Adashi rotating savings algorithm executes deterministically, and how defensive cybersecurity layers protect consumer assets.",
        body_style
    ))

    # Audience matrix
    audience_data = [
        [Paragraph("<b>STAKEHOLDER ROLE</b>", table_header_style), Paragraph("<b>PRIMARY OPERATIONAL FOCUS & MANDATE</b>", table_header_style)],
        [Paragraph("Chief Executive / Board", table_cell_bold), Paragraph("Strategic cross-border architecture, capital allocation, risk governance, and licensing compliance.", table_cell_style)],
        [Paragraph("Chief Technology Officer (CTO)", table_cell_bold), Paragraph("System component boundaries, microservice topology, latency SLAs, failover routing, and engineering roadmap.", table_cell_style)],
        [Paragraph("Chief Information Security Officer (CISO)", table_cell_bold), Paragraph("12-Layer Defense-in-Depth, zero-trust credential vaults, HSM signing, AAL2 MFA gating, and threat response.", table_cell_style)],
        [Paragraph("Financial Controller & CFO", table_cell_bold), Paragraph("Double-entry General Ledger truth, 4-way reconciliation, chart of accounts, and suspense account zero-balance rules.", table_cell_style)],
        [Paragraph("Head of Treasury & Liquidity", table_cell_bold), Paragraph("Central liquidity positioning, NGN/XOF firewall isolation, ALM maturity matching, and stress testing.", table_cell_style)],
        [Paragraph("Chief Compliance Officer (AML/KYC)", table_cell_bold), Paragraph("Tier-1 to Tier-3 KYC verification, automated PEP/Sanctions screening, transaction monitoring, and STR/SAR reporting.", table_cell_style)],
        [Paragraph("External Technical Auditors", table_cell_bold), Paragraph("Cryptographic HMAC audit trails, idempotent switch proofs, database RLS policies, and penetration test evidence.", table_cell_style)],
    ]
    t_aud = Table(audience_data, colWidths=[150, A4[0] - 80 - 150])
    t_aud.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#080D1A")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(t_aud)
    story.append(Spacer(1, 14))

    # =========================================================================
    # CHAPTER 2: CREDENTIALS & SECRETS MANAGEMENT ARCHITECTURE
    # =========================================================================
    story.append(Paragraph("2.0 CREDENTIALS & SECRETS MANAGEMENT ARCHITECTURE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))
    
    sec_rule = (
        "<b>CRITICAL ZERO-LEAKAGE SECURITY RULE:</b> In strict adherence to institutional security protocols, "
        "no plaintext passwords, production API keys, database connection strings, JWT signing secrets, or private bank credentials "
        "are published within this manual. All references utilize standardized environment variable placeholders. "
        "Live production keys are managed exclusively via AWS Secrets Manager / HashiCorp Vault with strict IAM role access."
    )
    story.append(make_warning("CREDENTIAL VAULT INVARIANT", sec_rule))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        "KoriePay enforces a continuous secret lifecycle across five segregated deployment stages. Secrets never transit unencrypted channels or public repositories.",
        body_style
    ))

    # Secrets Lifecycle Flow Table
    secret_stages = [
        [Paragraph("<b>STAGE</b>", table_header_style), Paragraph("<b>SECURITY ENCLAVE</b>", table_header_style), Paragraph("<b>POLICY & ACCESS CONTROLS</b>", table_header_style)],
        [Paragraph("1. Local Development", table_cell_bold), Paragraph("Developer Workstation (`.env.local`)", table_cell_style), Paragraph("Mock API keys (`kp_test_...`), local PostgreSQL instances. Git-ignored by default.", table_cell_style)],
        [Paragraph("2. Continuous Integration", table_cell_bold), Paragraph("GitHub Actions Encrypted Secrets", table_cell_style), Paragraph("Ephemeral test tokens injected at build time. Secret scanning active on every push.", table_cell_style)],
        [Paragraph("3. Staging / UAT Enclave", table_cell_bold), Paragraph("KMS-Encrypted Vault (Staging)", table_cell_style), Paragraph("Sanitized synthetic test data. Providus Sandbox & Koris UAT endpoints.", table_cell_style)],
        [Paragraph("4. Production Secret Store", table_cell_bold), Paragraph("AWS Secrets Manager / Vault", table_cell_style), Paragraph("Rotated every 90 days. Dual-custody authorization required for secret extraction.", table_cell_style)],
        [Paragraph("5. Runtime Injection", table_cell_bold), Paragraph("Next.js Server / Supabase Edge", table_cell_style), Paragraph("Process environment memory only. Never bundled or leaked to client JavaScript.", table_cell_style)],
    ]
    t_sec = Table(secret_stages, colWidths=[110, 150, A4[0] - 80 - 260])
    t_sec.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#080D1A")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(t_sec)
    story.append(Spacer(1, 14))

    # =========================================================================
    # CHAPTER 3: OPERATING JURISDICTIONS & BANKING NODES
    # =========================================================================
    story.append(Paragraph("3.0 OPERATING JURISDICTIONS & BANKING NODES", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "KoriePay operates an institutional bilateral payment corridor bridging the Anglophone Nigerian financial network and the Francophone WAEMU regional payment zone.",
        body_style
    ))

    juris_data = [
        [Paragraph("<b>OPERATING ATTRIBUTE</b>", table_header_style), Paragraph("<b>NIGERIA CORRIDOR (KP-NG)</b>", table_header_style), Paragraph("<b>NIGER REPUBLIC CORRIDOR (KP-NE)</b>", table_header_style)],
        [Paragraph("Legal Entity", table_cell_bold), Paragraph("KoriePay Nigeria Limited (RC-1928392)", table_cell_style), Paragraph("KoriePay Niger SAS (RCCM-NI-NIA-2026-B-09)", table_cell_style)],
        [Paragraph("Headquarters / Operational Base", table_cell_bold), Paragraph("Wuse II, Abuja / Victoria Island, Lagos", table_cell_style), Paragraph("Plateau District, Niamey, Niger Republic", table_cell_style)],
        [Paragraph("Sovereign Currency", table_cell_bold), Paragraph("Nigerian Naira (NGN, ₦)", table_cell_style), Paragraph("West African CFA Franc (XOF, CFA)", table_cell_style)],
        [Paragraph("Primary Banking Node", table_cell_bold), Paragraph("Providus Bank PLC (Clearing & Settlement Node)", table_cell_style), Paragraph("Coris Bank SA (Commercial Settlement Node)", table_cell_style)],
        [Paragraph("National Switch Integration", table_cell_bold), Paragraph("NIBSS NIP / e-BillsPay / PayAttitude", table_cell_style), Paragraph("GIM-UEMOA / SICA-UEMOA / BCEAO STAR-UEMOA", table_cell_style)],
        [Paragraph("Primary Regulatory Body", table_cell_bold), Paragraph("Central Bank of Nigeria (CBN)", table_cell_style), Paragraph("Banque Centrale des États de l'Afrique de l'Ouest", table_cell_style)],
        [Paragraph("Data Protection Law", table_cell_bold), Paragraph("Nigeria Data Protection Act 2023 (NDPA)", table_cell_style), Paragraph("WAEMU Data Protection Directive / Law 2017-28", table_cell_style)],
        [Paragraph("Default KYC Identity Standard", table_cell_bold), Paragraph("BVN (Bank Verification Number) / NIN", table_cell_style), Paragraph("NIF (Numéro d'Identification Fiscale) / CNI", table_cell_style)],
    ]
    t_jur = Table(juris_data, colWidths=[130, 190, A4[0] - 80 - 320])
    t_jur.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#080D1A")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(t_jur)
    story.append(Spacer(1, 14))

    # =========================================================================
    # CHAPTER 4: FINANCIAL TRUTH HIERARCHY & DOUBLE-ENTRY CORE LEDGER
    # =========================================================================
    story.append(Paragraph("4.0 FINANCIAL TRUTH HIERARCHY & CORE LEDGER INVARIANTS", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "In a Tier-1 financial architecture, application state and product balances are strictly downstream projections. "
        "The <b>Double-Entry Core Ledger</b> is the sole authoritative financial source of truth. No customer balance, agent float, or merchant wallet can mutate without an equal and opposite balanced journal entry.",
        body_style
    ))

    if os.path.exists("KoriePay_Confidential_Architecture_Diagrams/arch_02_financial_truth_hierarchy.png"):
        story.append(Image("KoriePay_Confidential_Architecture_Diagrams/arch_02_financial_truth_hierarchy.png", width=490, height=270))
        story.append(Spacer(1, 10))

    truth_rules = [
        "<b>1. Fundamental Accounting Invariant:</b> Total Assets = Total Liabilities + Total Equity. Every transaction produces at least one Debit and one Credit where SUM(Debits) == SUM(Credits).",
        "<b>2. Monies Representation:</b> All amounts are stored using strict <code>NUMERIC(24, 2)</code> or integer minor units to eliminate floating-point rounding errors.",
        "<b>3. Customer Balances are Liabilities:</b> In KoriePay's ledger, customer deposits are credit balances on liability accounts (Account 2000 Series).",
        "<b>4. Bank Deposits are Assets:</b> Cash held at partner clearing banks (Providus / Koris) are debit balances on asset accounts (Account 1000 Series).",
        "<b>5. Strict Immutability:</b> Posted ledger entries are mathematically immutable. Financial corrections require explicit compensating journal reversals; direct row updates or deletions are blocked by database triggers.",
        "<b>6. Adashi is NOT the Ledger:</b> Adashi ROSCA circles maintain rotation and obligation records, but actual funds movement is posted to the Core Ledger Escrow Account (Account 2100 Series)."
    ]
    for r in truth_rules:
        story.append(Paragraph(r, bullet_style))

    story.append(Spacer(1, 12))

    # Chart of Accounts Sample Table
    story.append(Paragraph("Standard Chart of Accounts (COA) Structure", h2_style))
    coa_data = [
        [Paragraph("<b>ACCOUNT #</b>", table_header_style), Paragraph("<b>ACCOUNT NAME</b>", table_header_style), Paragraph("<b>TYPE</b>", table_header_style), Paragraph("<b>NORMAL BAL</b>", table_header_style), Paragraph("<b>FINANCIAL SIGNIFICANCE</b>", table_header_style)],
        [Paragraph("1010-NGN", table_cell_bold), Paragraph("Providus Bank NGN Clearing Vault", table_cell_style), Paragraph("ASSET", table_cell_style), Paragraph("DEBIT", table_cell_style), Paragraph("Primary clearing account holding physical NGN deposits", table_cell_style)],
        [Paragraph("1020-XOF", table_cell_bold), Paragraph("Coris Bank XOF Settlement Vault", table_cell_style), Paragraph("ASSET", table_cell_style), Paragraph("DEBIT", table_cell_style), Paragraph("Primary clearing account holding physical XOF deposits", table_cell_style)],
        [Paragraph("2010-NGN", table_cell_bold), Paragraph("Customer NGN Wallet Liabilities", table_cell_style), Paragraph("LIABILITY", table_cell_style), Paragraph("CREDIT", table_cell_style), Paragraph("Total aggregate balance owed to Nigerian retail users", table_cell_style)],
        [Paragraph("2020-XOF", table_cell_bold), Paragraph("Customer XOF Wallet Liabilities", table_cell_style), Paragraph("LIABILITY", table_cell_style), Paragraph("CREDIT", table_cell_style), Paragraph("Total aggregate balance owed to Nigerien retail users", table_cell_style)],
        [Paragraph("2100-ADA", table_cell_bold), Paragraph("Adashi Circle Custodial Escrow", table_cell_style), Paragraph("LIABILITY", table_cell_style), Paragraph("CREDIT", table_cell_style), Paragraph("Pooled group contributions held pending cycle payout", table_cell_style)],
        [Paragraph("4010-REV", table_cell_bold), Paragraph("Platform Fee Revenue", table_cell_style), Paragraph("REVENUE", table_cell_style), Paragraph("CREDIT", table_cell_style), Paragraph("1.0% Adashi and 0.5% transfer transaction charges", table_cell_style)],
        [Paragraph("5010-EXP", table_cell_bold), Paragraph("Agent Commission Expense", table_cell_style), Paragraph("EXPENSE", table_cell_style), Paragraph("DEBIT", table_cell_style), Paragraph("0.5% commission disbursed to field banking agents", table_cell_style)],
        [Paragraph("9999-SUS", table_cell_bold), Paragraph("Unreconciled Clearing Suspense", table_cell_style), Paragraph("LIABILITY", table_cell_style), Paragraph("CREDIT", table_cell_style), Paragraph("Temporary holding account for unidentified clearing items", table_cell_style)],
    ]
    t_coa = Table(coa_data, colWidths=[65, 150, 60, 65, A4[0] - 80 - 340])
    t_coa.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#080D1A")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 4.0),
    ]))
    story.append(t_coa)
    story.append(Spacer(1, 14))

    # =========================================================================
    # CHAPTER 5: TRANSACTION LIFECYCLE & THE UNKNOWN TRANSACTION PRINCIPLE
    # =========================================================================
    story.append(Paragraph("5.0 FINANCIAL TRANSACTION LIFECYCLE & TIMEOUT HANDLING", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "Financial transaction processing in developing markets must survive unpredictable network degradation, banking gateway dropouts, and switch latency. "
        "KoriePay strictly implements the <b>Unknown Transaction Principle</b>: <i>A provider timeout is NEVER a failure</i>.",
        body_style
    ))

    if os.path.exists("KoriePay_Confidential_Architecture_Diagrams/arch_05_transaction_lifecycle.png"):
        story.append(Image("KoriePay_Confidential_Architecture_Diagrams/arch_05_transaction_lifecycle.png", width=490, height=230))
        story.append(Spacer(1, 10))

    un_callout = (
        "<b>GOLDEN TIMEOUT INVARIANT (TIMEOUT != FAILURE):</b><br/>"
        "When an external bank node (NIBSS / Providus / Koris) fails to respond within the 15-second SLA, "
        "the payment switch marks the transaction as <b>UNKNOWN</b> (NOT Failed). "
        "Blind retries of outward fund transfers are prohibited to eliminate duplicate disbursement risk. "
        "An automated background poller re-queries the banking node using the unique idempotency key. "
        "Only when the provider confirms failure is the customer's reserved balance released; if the provider confirms success, the ledger posting is finalized."
    )
    story.append(make_callout("CRITICAL FINANCIAL CONTROL", un_callout, "#D97706", "#FFFBEB"))
    story.append(Spacer(1, 14))

    # =========================================================================
    # CHAPTER 6: ADASHI / AJO / ROSCA SAVINGS ENGINE
    # =========================================================================
    story.append(Paragraph("6.0 KORIEPAY ADASHI ROTATING SAVINGS & CREDIT (ROSCA) ENGINE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "KoriePay digitizes traditional West African rotating credit associations (known as <i>Adashi</i> in Hausa, <i>Ajo</i> in Yoruba, and <i>Tontine</i> in Francophone Niger). "
        "The system replaces informal bookkeeping with cryptographic deterministic allocation, automated wallet direct-debits, and maker-checker payout safeguards.",
        body_style
    ))

    if os.path.exists("KoriePay_Confidential_Architecture_Diagrams/arch_03_adashi_rotation_flow.png"):
        story.append(Image("KoriePay_Confidential_Architecture_Diagrams/arch_03_adashi_rotation_flow.png", width=490, height=240))
        story.append(Spacer(1, 10))

    story.append(Paragraph("6.1 Cryptographic Allocation Engine (HMAC-SHA256)", h2_style))
    story.append(Paragraph(
        "Informal ROSCAs frequently suffer from accusations of favoritism during beneficiary ordering. "
        "KoriePay mathematically proves slot fairness using deterministic HMAC-SHA256 ordering: "
        "<code>HMAC_SHA256(Customer_UUID || Member_UUID, Group_UUID || Salt)</code>. "
        "The pseudo-random sort order is permanently locked and hashed upon quorum completion, creating an immutable cryptographic audit record.",
        body_style
    ))

    story.append(Paragraph("6.2 Adashi Core Operational Invariants", h2_style))
    adashi_invs = [
        "<b>Quorum & Membership Locking:</b> No cycle can begin until 100% of invited members have verified KYC, authorized wallet mandates, and accepted legal terms. Once locked, member substitution requires formal dual-authorization.",
        "<b>One Beneficiary Per Cycle:</b> Exactly one member is eligible for payout disbursement per cycle number.",
        "<b>Platform Fee & Agent Splits:</b> Platform fees (1.00%) and Agent commissions (0.50%) are deducted from gross pool volume at payout disbursement.",
        "<b>Maker-Checker Threshold:</b> Payout disbursements exceeding ₦500,000 or 500,000 CFA require independent secondary approval from a verified Treasury / Compliance Officer."
    ]
    for inv in adashi_invs:
        story.append(Paragraph(inv, bullet_style))

    story.append(Spacer(1, 14))

    # =========================================================================
    # CHAPTER 7: CENTRAL LIQUIDITY POOL & NGN/XOF FIREWALL
    # =========================================================================
    story.append(Paragraph("7.0 CENTRAL LIQUIDITY POOL & STRICT CURRENCY FIREWALL", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "KoriePay aggregates treasury liquidity across Nigeria and Niger Republic to support high-velocity agency cash-in/out, merchant settlements, and Adashi cycle disbursements. "
        "To prevent FX contagion and regulatory breach, NGN and XOF liquidity pools are strictly isolated.",
        body_style
    ))

    if os.path.exists("KoriePay_Confidential_Architecture_Diagrams/arch_04_liquidity_hierarchy.png"):
        story.append(Image("KoriePay_Confidential_Architecture_Diagrams/arch_04_liquidity_hierarchy.png", width=490, height=250))
        story.append(Spacer(1, 10))

    story.append(Paragraph("7.1 Multi-Dimensional Treasury Position Architecture", h2_style))
    
    liq_positions = [
        [Paragraph("<b>POSITION DIMENSION</b>", table_header_style), Paragraph("<b>DEFINITION & FINANCIAL CONSTRAINT</b>", table_header_style)],
        [Paragraph("1. Current Confirmed", table_cell_bold), Paragraph("Settled funds physically verified on commercial clearing bank statements.", table_cell_style)],
        [Paragraph("2. Available Liquidity", table_cell_bold), Paragraph("Unencumbered funds immediately deployable for instant disbursements and cash-out.", table_cell_style)],
        [Paragraph("3. Reserved Liquidity", table_cell_bold), Paragraph("Funds earmarked for scheduled Adashi payouts and merchant settlements. Cannot be double-allocated.", table_cell_style)],
        [Paragraph("4. Restricted Liquidity", table_cell_bold), Paragraph("Collateral deposits, regulatory statutory reserves, and frozen court/AML holds.", table_cell_style)],
        [Paragraph("5. Pending Settlement", table_cell_bold), Paragraph("Transactions executed through switches (NIBSS/GIM) awaiting end-of-day clearing batch credit.", table_cell_style)],
        [Paragraph("6. In-Transit", table_cell_bold), Paragraph("Physical cash undergoing Cash-in-Transit (CIT) vault transfer between regional branches.", table_cell_style)],
        [Paragraph("7. Expected Inflows", table_cell_bold), Paragraph("Forecast incoming member contribution obligations and merchant virtual account receipts.", table_cell_style)],
        [Paragraph("8. Projected Position", table_cell_bold), Paragraph("Forward-looking position: Current + Inflows - Outflows - Reservations - Restrictions.", table_cell_style)],
    ]
    t_liq = Table(liq_positions, colWidths=[140, A4[0] - 80 - 140])
    t_liq.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#080D1A")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(t_liq)
    story.append(Spacer(1, 14))

    # =========================================================================
    # CHAPTER 8: 12-LAYER DEFENSE-IN-DEPTH SECURITY ARCHITECTURE
    # =========================================================================
    story.append(Paragraph("8.0 12-LAYER DEFENSE-IN-DEPTH CYBERSECURITY MODEL", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "KoriePay implements an institutional Zero-Trust architecture spanning edge network traffic to immutable database storage.",
        body_style
    ))

    if os.path.exists("KoriePay_Confidential_Architecture_Diagrams/arch_06_security_defense_depth.png"):
        story.append(Image("KoriePay_Confidential_Architecture_Diagrams/arch_06_security_defense_depth.png", width=490, height=270))
        story.append(Spacer(1, 10))

    # Threat Mitigation Table
    story.append(Paragraph("8.1 Critical Threat Mitigation Matrix", h2_style))
    threat_data = [
        [Paragraph("<b>THREAT VECTOR</b>", table_header_style), Paragraph("<b>IMPACT</b>", table_header_style), Paragraph("<b>DEFENSIVE CONTROLS & MITIGATION</b>", table_header_style)],
        [Paragraph("Credential Stuffing / Brute Force", table_cell_bold), Paragraph("Account takeover", table_cell_style), Paragraph("Sliding-window IP rate limiter, 5-attempt lockouts, CAPTCHA challenge on anomaly.", table_cell_style)],
        [Paragraph("SIM Swap / OTP Interception", table_cell_bold), Paragraph("Unauthorized fund transfer", table_cell_style), Paragraph("AAL2 Authenticator App (TOTP), WebAuthn FIDO2 biometric keys, device fingerprinting.", table_cell_style)],
        [Paragraph("Replay & Duplicate Submissions", table_cell_bold), Paragraph("Double debit / credit", table_cell_style), Paragraph("Mandatory UUID v4 idempotency keys with SHA-256 request payload hashing.", table_cell_style)],
        [Paragraph("Privilege Escalation / IDOR", table_cell_bold), Paragraph("Unauthorized data access", table_cell_style), Paragraph("PostgreSQL Row Level Security (RLS) + server-authoritative ABAC token verification.", table_cell_style)],
        [Paragraph("Webhook Spoofing", table_cell_bold), Paragraph("Fake deposit credit", table_cell_style), Paragraph("HMAC-SHA256 payload signature verification + strict bank IP allowlisting.", table_cell_style)],
        [Paragraph("Insider Collusion / Fraud", table_cell_bold), Paragraph("Direct ledger manipulation", table_cell_style), Paragraph("Dual-custody Maker-Checker gates, immutable audit hash chaining, no direct DB access.", table_cell_style)],
    ]
    t_thr = Table(threat_data, colWidths=[130, 110, A4[0] - 80 - 240])
    t_thr.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#080D1A")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(t_thr)
    story.append(Spacer(1, 14))

    # =========================================================================
    # CHAPTER 9: COMPLIANCE, AML/CFT/CPF & CONSUMER PROTECTION
    # =========================================================================
    story.append(Paragraph("9.0 REGULATORY COMPLIANCE, AML/CFT/CPF & CONSUMER PROTECTION", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "KoriePay operates automated Anti-Money Laundering (AML), Counter-Financing of Terrorism (CFT), and Counter-Proliferation Financing (CPF) control planes "
        "designed in compliance with CBN AML/CFT Regulations 2022, WAEMU Uniform Anti-Money Laundering Law, and FATF Recommendations.",
        body_style
    ))

    story.append(Paragraph("9.1 Tiered KYC Verification Framework", h2_style))
    kyc_data = [
        [Paragraph("<b>KYC TIER</b>", table_header_style), Paragraph("<b>IDENTITY REQUIREMENTS</b>", table_header_style), Paragraph("<b>DAILY LIMIT (NGN / XOF)</b>", table_header_style), Paragraph("<b>MAX BALANCE</b>", table_header_style)],
        [Paragraph("Tier 0 (Basic)", table_cell_bold), Paragraph("Phone number + Name (Unverified)", table_cell_style), Paragraph("₦50,000 / 50,000 CFA", table_cell_style), Paragraph("₦300,000 / 300,000 CFA", table_cell_style)],
        [Paragraph("Tier 1 (Standard)", table_cell_bold), Paragraph("Verified Phone + Valid ID / NIN / NIF", table_cell_style), Paragraph("₦300,000 / 300,000 CFA", table_cell_style), Paragraph("₦1,000,000 / 1,000,000 CFA", table_cell_style)],
        [Paragraph("Tier 2 (Enhanced)", table_cell_bold), Paragraph("BVN Verified + Residential Proof + Face Liveness", table_cell_style), Paragraph("₦1,000,000 / 1,000,000 CFA", table_cell_style), Paragraph("₦5,000,000 / 5,000,000 CFA", table_cell_style)],
        [Paragraph("Tier 3 (Commercial)", table_cell_bold), Paragraph("Full Corporate CAC/RCCM, Tax Clearance, Site Visit", table_cell_style), Paragraph("₦10,000,000 / 10,000,000 CFA", table_cell_style), Paragraph("Unlimited / Institutional", table_cell_style)],
    ]
    t_kyc = Table(kyc_data, colWidths=[90, 190, 110, A4[0] - 80 - 390])
    t_kyc.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#080D1A")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(t_kyc)
    story.append(Spacer(1, 14))

    # =========================================================================
    # CHAPTER 10: 4-WAY RECONCILIATION & SUSPENSE ACCOUNT GOVERNANCE
    # =========================================================================
    story.append(Paragraph("10.0 4-WAY RECONCILIATION & SUSPENSE GOVERNANCE", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "Reconciliation is executed continuously across four independent financial records to eliminate discrepancies between internal ledger balances and physical bank deposits.",
        body_style
    ))

    recon_rules = [
        "<b>1. Internal Core Ledger vs Payment Switch:</b> Ensures every committed ledger journal maps to exactly one switch routing reference.",
        "<b>2. Payment Switch vs Bank Settlement Advice:</b> Verifies that provider batch advice matches total transaction value processed.",
        "<b>3. Bank Settlement Advice vs Bank MT940 Statement:</b> Verifies that funds physically credited the Providus or Koris clearing vault.",
        "<b>4. Suspense Account Governance:</b> Suspense accounts (Account 9999 Series) are exception-control holding mechanisms, not permanent shelters for unexplained discrepancies. Every suspense item requires a designated owner, reason code, and mandatory 24-hour SLA for resolution."
    ]
    for r in recon_rules:
        story.append(Paragraph(r, bullet_style))

    story.append(Spacer(1, 14))

    # =========================================================================
    # CHAPTER 11: IMPLEMENTATION STATUS SCORECARD & BUILD ROADMAP
    # =========================================================================
    story.append(Paragraph("11.0 IMPLEMENTATION STATUS SCORECARD & BUILD ROADMAP", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph(
        "The following implementation scorecard reflects the verified codebase maturity across the KoriePay repository as of Version 1.0.",
        body_style
    ))

    score_data = [
        [Paragraph("<b>ARCHITECTURAL DOMAIN</b>", table_header_style), Paragraph("<b>IMPLEMENTATION STATE</b>", table_header_style), Paragraph("<b>VERIFIED EVIDENCE IN CODEBASE</b>", table_header_style), Paragraph("<b>COMPLETION</b>", table_header_style)],
        [Paragraph("Authentication & Identity UX", table_cell_bold), Paragraph("PRODUCTION READY", table_cell_style), Paragraph("Glassmorphic login/register, MFA, smart identifier detection, WCAG AA.", table_cell_style), Paragraph("100%", table_cell_bold)],
        [Paragraph("Adashi ROSCA Engine", table_cell_bold), Paragraph("PRODUCTION READY", table_cell_style), Paragraph("HMAC-SHA256 allocation, cycles, obligations, maker-checker payouts.", table_cell_style), Paragraph("100%", table_cell_bold)],
        [Paragraph("Central Liquidity Pool", table_cell_bold), Paragraph("PRODUCTION READY", table_cell_style), Paragraph("Multi-dimensional positions, NGN/XOF firewall, reservation engine.", table_cell_style), Paragraph("100%", table_cell_bold)],
        [Paragraph("Double-Entry Core Ledger", table_cell_bold), Paragraph("PRODUCTION READY", table_cell_style), Paragraph("Double-entry journals, Chart of Accounts, immutable database triggers.", table_cell_style), Paragraph("100%", table_cell_bold)],
        [Paragraph("Database DDL & Seed Suite", table_cell_bold), Paragraph("PRODUCTION READY", table_cell_style), Paragraph("Single-paste Supabase script, 45+ tables, stored procedures, test data.", table_cell_style), Paragraph("100%", table_cell_bold)],
        [Paragraph("Customer Banking Portal", table_cell_bold), Paragraph("PRODUCTION READY", table_cell_style), Paragraph("Multi-currency wallet, transfers, cards, Adashi circles, bills.", table_cell_style), Paragraph("100%", table_cell_bold)],
        [Paragraph("Agency Banking Module", table_cell_bold), Paragraph("PRODUCTION READY", table_cell_style), Paragraph("Cash-in/out, POS terminal management, float management, commissions.", table_cell_style), Paragraph("100%", table_cell_bold)],
        [Paragraph("BDC / FX Treasury Engine", table_cell_bold), Paragraph("PRODUCTION READY", table_cell_style), Paragraph("Cross-border rates, quotes, treasury approval, settlement bridge.", table_cell_style), Paragraph("95%", table_cell_bold)],
        [Paragraph("Compliance & AML Engine", table_cell_bold), Paragraph("PRODUCTION READY", table_cell_style), Paragraph("Sanctions/PEP screening, case management, STR reporting framework.", table_cell_style), Paragraph("95%", table_cell_bold)],
        [Paragraph("Bank Node Connectivity", table_cell_bold), Paragraph("CONFIGURABLE NODES", table_cell_style), Paragraph("Providus Bank & Coris Bank adapters ready for production credentials.", table_cell_style), Paragraph("90%", table_cell_bold)],
    ]
    t_scr = Table(score_data, colWidths=[120, 100, 190, A4[0] - 80 - 410])
    t_scr.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#080D1A")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
        ('PADDING', (0, 0), (-1, -1), 4.0),
    ]))
    story.append(t_scr)
    story.append(Spacer(1, 14))

    # =========================================================================
    # CHAPTER 12: GLOSSARY & FINAL ARCHITECTURAL SEPARATION OF CONCERNS
    # =========================================================================
    story.append(Paragraph("12.0 TECHNICAL & FINANCIAL GLOSSARY", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent_emerald, spaceBefore=2, spaceAfter=8))

    glossary_items = [
        ("Adashi / Ajo / ROSCA", "Rotating Savings and Credit Association where participants contribute fixed periodic sums into a common pool awarded in turns according to deterministic cryptographic order."),
        ("Double-Entry Ledger", "Accounting methodology where every transaction requires balanced debits and credits, maintaining the invariant that Total Assets equal Total Liabilities plus Equity."),
        ("Central Liquidity Pool", "Multi-dimensional treasury engine tracking physical bank clearing balances, reservations, restrictions, and projected cash flows."),
        ("Idempotency", "Mathematical property ensuring that identical API requests bearing the same unique idempotency key produce exactly one financial execution."),
        ("Unknown Transaction", "Transaction state when external bank gateways timeout without definitive confirmation. Prohibits blind retry until authoritative re-query is resolved."),
        ("Maker-Checker", "Dual-authorization control requiring one verified officer to initiate an action and a second independent officer to approve it before execution."),
        ("AAL2 (Authentication Assurance Level 2)", "High-assurance multi-factor authentication requiring proof of possession of a verified authenticator token (TOTP / WebAuthn)."),
        ("Row Level Security (RLS)", "PostgreSQL database-level security policy restricting data access based on authenticated user identity and tenant context.")
    ]
    for term, defn in glossary_items:
        story.append(Paragraph(f"<b>• {term}:</b> {defn}", body_style))

    story.append(Spacer(1, 14))

    # Final Summary Sign-off Box
    final_summary = (
        "<b>FINAL ARCHITECTURAL SEPARATION OF CONCERNS:</b><br/>"
        "KoriePay's enterprise architecture is designed around strict separation of duties: "
        "<b>Identity</b> establishes who the customer is; "
        "<b>Risk & AML</b> determine whether activity should proceed; "
        "<b>Product Engines</b> govern business rules; "
        "the <b>Payment Switch</b> orchestrates execution; "
        "the <b>Core Ledger</b> establishes absolute financial truth; "
        "<b>Settlement</b> executes external movement; "
        "<b>Reconciliation</b> verifies record agreement; "
        "<b>Treasury</b> manages liquidity and capital; "
        "and the <b>Immutable Audit Vault</b> preserves institutional memory."
    )
    story.append(make_callout("KORIEPAY ARCHITECTURAL SUMMARY", final_summary, "#10B981", "#ECFDF5"))

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Master PDF Manual generated successfully at: {pdf_path}")

if __name__ == '__main__':
    build_manual_pdf()
