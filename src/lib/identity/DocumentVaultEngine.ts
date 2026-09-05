import { IdentityDocumentRecord } from '@/types/identityEngine';

export class DocumentVaultEngine {
  private static documents: Map<string, IdentityDocumentRecord> = new Map();
  private static isInitialized = false;

  private static ensureInitialized() {
    if (!this.isInitialized) {
      this.isInitialized = true;
      this.seedInitialDocs();
    }
  }

  private static seedInitialDocs() {
    if (this.documents.size > 0) return;

    const doc1: IdentityDocumentRecord = {
      id: 'doc_20260901_001',
      identityId: 'pers_ng_001',
      documentType: 'PASSPORT',
      documentNumberMasked: 'A098****21',
      fileSha256Hash: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
      mimeType: 'image/jpeg',
      fileSizeBytes: 2457600,
      storagePathEncrypted: 'vault://identity/docs/ng/pers_ng_001/passport_v1.enc',
      verificationStatus: 'VERIFIED',
      expiresAt: '2030-05-14',
      uploadedBy: 'chinedu.okonkwo@example.ng',
      uploadedAt: '2026-08-15T09:30:00Z',
    };
    this.documents.set(doc1.id, doc1);

    const doc2: IdentityDocumentRecord = {
      id: 'doc_20260901_002',
      identityId: 'org_ng_001',
      documentType: 'CAC_CERTIFICATE',
      documentNumberMasked: 'RC-1092837',
      fileSha256Hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      mimeType: 'application/pdf',
      fileSizeBytes: 4194304,
      storagePathEncrypted: 'vault://identity/docs/ng/org_ng_001/cac_cert.enc',
      verificationStatus: 'VERIFIED',
      uploadedBy: 'compliance.ops@jumia.ng',
      uploadedAt: '2026-08-01T10:30:00Z',
    };
    this.documents.set(doc2.id, doc2);
  }

  public static registerDocument(params: {
    identityId: string;
    documentType: any;
    documentNumberMasked?: string;
    mimeType: string;
    fileSizeBytes: number;
    uploadedBy: string;
    expiresAt?: string;
  }): IdentityDocumentRecord {
    this.ensureInitialized();
    const id = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    // Placeholder only. A sha256 is an integrity claim, so it must come from
    // the actual received bytes — callers use attestIntegrity() once they have
    // hashed the upload. Random hex here previously asserted a digest that
    // corresponded to no file at all.
    const hash = 'PENDING_INTEGRITY_ATTESTATION';

    const doc: IdentityDocumentRecord = {
      id,
      identityId: params.identityId,
      documentType: params.documentType,
      documentNumberMasked: params.documentNumberMasked || 'N/A',
      fileSha256Hash: hash,
      mimeType: params.mimeType,
      fileSizeBytes: params.fileSizeBytes,
      storagePathEncrypted: `vault://identity/docs/${params.identityId}/${params.documentType.toLowerCase()}_${Date.now()}.enc`,
      verificationStatus: 'PENDING',
      expiresAt: params.expiresAt,
      uploadedBy: params.uploadedBy,
      uploadedAt: new Date().toISOString(),
    };

    this.documents.set(id, doc);
    return doc;
  }

  /**
   * Bind the real SHA-256 digest of the stored bytes to a vault record.
   * Returns false when the document does not exist. This is the only way a
   * hash should ever be written after registration.
   */
  public static attestIntegrity(documentId: string, sha256Hex: string): boolean {
    this.ensureInitialized();
    const doc = this.documents.get(documentId);
    if (!doc) return false;
    if (!/^[a-f0-9]{64}$/.test(sha256Hex)) return false;
    doc.fileSha256Hash = sha256Hex;
    return true;
  }

  /**
   * Ownership-scoped lookup. Callers in the customer portal must use this
   * rather than reaching into the map, so a guessed document id cannot return
   * another person's record.
   */
  public static getDocumentForIdentity(documentId: string, identityId: string): IdentityDocumentRecord | null {
    this.ensureInitialized();
    const doc = this.documents.get(documentId);
    if (!doc || doc.identityId !== identityId) return null;
    return doc;
  }

  public static getDocumentsForIdentity(identityId: string): IdentityDocumentRecord[] {
    this.ensureInitialized();
    return Array.from(this.documents.values()).filter(d => d.identityId === identityId);
  }

  public static getAllDocuments(): IdentityDocumentRecord[] {
    this.ensureInitialized();
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }
}
