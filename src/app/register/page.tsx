"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import AuthCard from "@/components/auth/AuthCard";
import AuthHeader from "@/components/auth/AuthHeader";
import PasswordInput from "@/components/auth/PasswordInput";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import PhoneInput from "@/components/auth/PhoneInput";
import SecurityNotice from "@/components/auth/SecurityNotice";
import AuthErrorAlert from "@/components/auth/AuthErrorAlert";
import { useAuth } from "@/components/auth/AuthContext";
import { JurisdictionCode, AuthService } from "@/lib/auth/authService";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Building2,
  User,
  Mail,
  Lock,
  FileText,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, language, jurisdiction: initialJurisdiction } = useAuth();
  const authService = AuthService.getInstance();

  // Progressive Step (1: Jurisdiction & Name, 2: Contact, 3: Password, 4: Consent)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Fields
  const [country, setCountry] = useState<JurisdictionCode>(initialJurisdiction || "NG");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [agreeAml, setAgreeAml] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setError("Please provide your legal first and last name.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!phone.trim() || !email.trim()) {
        setError("Both mobile phone number and email address are required for 2FA.");
        return;
      }
      if (!email.includes("@") || !email.includes(".")) {
        setError("Please provide a valid email address format.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const strength = authService.evaluatePasswordStrength(password);
      if (strength.score < 2) {
        setError("Your password does not meet the minimum security threshold.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please ensure both passwords match exactly.");
        return;
      }
      setStep(4);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreeTerms || !agreeAml) {
      setError("You must review and agree to the Terms of Service and AML Banking Disclosures to open an account.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await register({
        country,
        firstName,
        lastName,
        phone,
        email,
        password,
        agreeTerms,
        agreeAml,
        marketingConsent,
      });

      if (!result.success) {
        setError(result.errorMessage || "Unable to complete registration. Please check your information.");
      }
    } catch (err: any) {
      setError("Registration failed due to a server or connectivity error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="w-full max-w-md space-y-6">
        <AuthHeader
          titleEn="Create your KoriePay account"
          titleHa="Bude Sabon Asusu"
          titleFr="Créer votre compte KoriePay"
          subtitleEn="Join KoriePay and manage your multi-currency cross-border accounts securely."
          subtitleHa="Bude asusun ajiya da hada-hadar kudi a Najeriya da Jamhuriyar Nijar."
          subtitleFr="Ouvrez un compte bancaire multi-devises sécurisé pour le Nigeria et le Niger."
          badge="Verified Digital Onboarding"
        />

        {/* Step Progress Bar */}
        <div className="flex items-center justify-between px-2 text-xs">
          {[
            { num: 1, label: "Identity" },
            { num: 2, label: "Contact" },
            { num: 3, label: "Security" },
            { num: 4, label: "Consent" },
          ].map((item) => (
            <div key={item.num} className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  step === item.num
                    ? "bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20 font-black"
                    : step > item.num
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-white/[0.05] text-slate-500 border border-white/[0.08]"
                }`}
              >
                {step > item.num ? <CheckCircle2 className="w-4 h-4" /> : item.num}
              </div>
              <span className={`text-[10px] ${step === item.num ? "text-white font-bold" : "text-slate-500"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <AuthCard>
          <AuthErrorAlert error={error} onDismiss={() => setError(null)} />

          {/* STEP 1: Country Jurisdiction & Personal Name */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Country of Legal Residence
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCountry("NG")}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      country === "NG"
                        ? "bg-emerald-500/15 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/10"
                        : "bg-[#070d18] border-white/[0.12] text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="text-2xl">🇳🇬</span>
                    <div>
                      <div className="text-xs font-bold">Nigeria</div>
                      <div className="text-[10px] text-slate-400 font-mono">NGN • Providus Node</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCountry("NE")}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      country === "NE"
                        ? "bg-emerald-500/15 border-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/10"
                        : "bg-[#070d18] border-white/[0.12] text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="text-2xl">🇳🇪</span>
                    <div>
                      <div className="text-xs font-bold">Niger Republic</div>
                      <div className="text-[10px] text-slate-400 font-mono">XOF • Koris Node</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    First Name <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ibrahim"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-[#070d18] border border-white/[0.12] text-white text-xs sm:text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Last Name <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bello"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-[#070d18] border border-white/[0.12] text-white text-xs sm:text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 group"
              >
                <span>Continue to Contact Info</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          )}

          {/* STEP 2: Phone & Email Contacts */}
          {step === 2 && (
            <form onSubmit={handleNext} className="space-y-4">
              <PhoneInput
                country={country}
                onCountryChange={(c) => setCountry(c)}
                value={phone}
                onChange={(val) => setPhone(val)}
                required
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">
                    Email Address <span className="text-emerald-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">Official Statements</span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-4 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-[#070d18] border border-white/[0.12] text-white text-xs sm:text-sm placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3.5 sm:py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 group"
                >
                  <span>Continue to Security</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Password Creation & Entropy Check */}
          {step === 3 && (
            <form onSubmit={handleNext} className="space-y-4">
              <PasswordInput
                id="reg-password"
                label="Create Password"
                autoComplete="new-password"
                placeholder="Choose a strong password"
                value={password}
                onChange={(val) => setPassword(val)}
                required
              />

              <PasswordStrengthMeter password={password} />

              <PasswordInput
                id="reg-confirm-password"
                label="Confirm Password"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(val) => setConfirmPassword(val)}
                required
              />

              {confirmPassword && password !== confirmPassword && (
                <p className="text-[11px] text-rose-400 font-medium">
                  Passwords do not match.
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={!password || password !== confirmPassword}
                  className="flex-1 py-3.5 sm:py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
                >
                  <span>Review Disclosures</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Legal Consent & Electronic Disclosures */}
          {step === 4 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#070d18] border border-white/[0.1] space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Regulatory Disclosures & Agreements</span>
                </div>

                <div className="space-y-2 text-slate-400 leading-relaxed text-[11px]">
                  <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded bg-slate-900 border-white/20 text-emerald-500 focus:ring-emerald-500/30"
                    />
                    <span>
                      I agree to the <Link href="/terms" target="_blank" className="text-emerald-400 underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-emerald-400 underline">Privacy Policy</Link>.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={agreeAml}
                      onChange={(e) => setAgreeAml(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded bg-slate-900 border-white/20 text-emerald-500 focus:ring-emerald-500/30"
                    />
                    <span>
                      I consent to Anti-Money Laundering (AML) identity validation and electronic signature processing.
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={isLoading}
                  className="px-4 py-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading || !agreeTerms || !agreeAml}
                  className="flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 group"
                >
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isLoading ? "Provisioning Account..." : "Create Account & Verify"}</span>
                  {!isLoading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                </button>
              </div>
            </form>
          )}

          <SecurityNotice />
        </AuthCard>

        {/* Login Prompt */}
        <p className="text-center text-xs text-slate-400">
          Already have a verified KoriePay account?{" "}
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 hover:underline font-bold transition-colors ml-1"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
