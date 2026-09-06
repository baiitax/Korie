"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAgent } from "@/components/agent/AgentContext";
import { agencyApiFetch } from "@/lib/agency/agentSession";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

const DOCUMENT_TYPES = [
  { id: "NATIONAL_ID", label: "National ID / Passport" },
  { id: "BVN_SLIP", label: "BVN Slip" },
  { id: "CAC_CERTIFICATE", label: "CAC Business Certificate" },
  { id: "PROOF_OF_ADDRESS", label: "Proof of Address" },
  { id: "PASSPORT_PHOTO", label: "Passport Photograph" },
  { id: "UTILITY_BILL", label: "Utility Bill" },
  { id: "BUSINESS_PREMISES_PHOTO", label: "Business Premises Photo" },
  { id: "OTHER", label: "Other Document" },
];

interface KycDocument {
  id: string;
  document_type: string;
  original_filename: string | null;
  status: string;
  rejection_reason: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the data: URL prefix, keep only the base64 payload
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AgentKycPage() {
  const { agent, t } = useAgent();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documentType, setDocumentType] = useState("NATIONAL_ID");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await agencyApiFetch("/api/v1/agency/kyc/documents");
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setDocuments(json.data.documents || []);
      }
    } catch {
      /* status list is supplementary; upload form still works standalone */
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const base64 = await fileToBase64(selectedFile);
      const res = await agencyApiFetch("/api/v1/agency/kyc/documents", {
        method: "POST",
        body: JSON.stringify({
          document_type: documentType,
          filename: selectedFile.name,
          mime_type: selectedFile.type,
          base64_data: base64,
        }),
      });
      const json = await res.json();
      if (res.ok && json.status === "success") {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        loadDocuments();
      } else {
        setUploadError(json.error?.message || "Upload failed.");
      }
    } catch {
      setUploadError("Could not reach the server.");
    } finally {
      setIsUploading(false);
    }
  };

  const statusBadge = (status: string) => {
    const s = status?.toUpperCase();
    if (s === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> APPROVED
        </span>
      );
    }
    if (s === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3" /> REJECTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" /> PENDING REVIEW
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <Link
          href="/agent/profile"
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">KYC Documents</h1>
          <p className="text-xs text-slate-400">
            Upload compliance documents for manual review by KoriePay Operations.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-semibold">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Current Compliance Status</span>
        </div>
        <span
          className={`font-mono font-bold ${
            agent.kycStatus === "VERIFIED" ? "text-emerald-400" : "text-amber-400"
          }`}
        >
          ● {agent.kycStatus}
        </span>
      </div>

      <form
        onSubmit={handleUpload}
        className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-4 shadow-xl text-xs"
      >
        <h2 className="text-sm font-bold text-white">Upload a Document</h2>

        <div className="space-y-1">
          <label className="text-slate-300 font-semibold">Document Type</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-900 border border-white/10 text-white"
          >
            {DOCUMENT_TYPES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-slate-300 font-semibold">File (JPEG, PNG, or PDF — max 10MB)</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-6 rounded-xl bg-slate-900 border border-dashed border-white/20 text-center cursor-pointer hover:border-amber-500/40 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2 text-white font-semibold">
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="truncate">{selectedFile.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <UploadCloud className="w-6 h-6" />
                <span>Click to select a file</span>
              </div>
            )}
          </div>
        </div>

        {uploadError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedFile || isUploading}
          className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
        >
          {isUploading ? "Uploading..." : "Submit for Review"}
        </button>
      </form>

      <div className="rounded-3xl bg-[#090f1e] border border-white/10 p-5 space-y-3 shadow-xl">
        <h2 className="text-sm font-bold text-white">Submitted Documents</h2>

        {isLoading ? (
          <p className="text-xs text-slate-400 text-center py-4">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No documents submitted yet.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {documents.map((doc) => (
              <div key={doc.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    {DOCUMENT_TYPES.find((d) => d.id === doc.document_type)?.label || doc.document_type}
                  </span>
                  {statusBadge(doc.status)}
                </div>
                {doc.rejection_reason && (
                  <p className="text-[11px] text-rose-400">Reason: {doc.rejection_reason}</p>
                )}
                <div className="text-[10px] text-slate-500 font-mono">
                  Uploaded {new Date(doc.uploaded_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
