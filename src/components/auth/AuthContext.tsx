"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AuthUser, UserRole, JurisdictionCode, AuthResult, LoginParams, RegisterParams } from "@/lib/auth/authService";

export interface AgentRegisterParams {
  country: JurisdictionCode;
  fullName: string;
  businessName: string;
  phone: string;
  email: string;
  password: string;
  stateOrRegion?: string;
  cityOrLga?: string;
  agreeTerms: boolean;
  agreeAml: boolean;
}

export interface MerchantRegisterParams {
  country: JurisdictionCode;
  businessName: string;
  tradingName?: string;
  ownerFullName: string;
  phone: string;
  email: string;
  password: string;
  category?: string;
  cacNumber?: string;
  tinNumber?: string;
  agreeTerms: boolean;
  agreeAml: boolean;
}

/**
 * Real Supabase-backed customer authentication.
 * ---------------------------------------------------------------------------
 * Replaces the previous fully-synthetic `AuthService.authenticate` path
 * (which fabricated a verified user for any typed string) with a genuine
 * `supabase.auth.signInWithPassword` call, resolved against real
 * `public.customers` rows created by real registration
 * (`/api/auth/customer/register`) or seeded demo accounts.
 *
 * Scope: this covers the CUSTOMER persona end-to-end for real. Non-customer
 * roles (ADMIN/AGENT/etc.) keep using their own real auth paths elsewhere
 * (agentSession.ts, admin auth) — this context no longer fabricates sessions
 * for them. `RoleSwitcherDevBar` is intentionally not wired to sign a real
 * session in as another role; see its own component for the persona-preview
 * disclosure.
 */

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: UserRole;
  language: "en" | "ha" | "fr";
  jurisdiction: JurisdictionCode;
  pendingDestination?: string;
  setLanguage: (lang: "en" | "ha" | "fr") => void;
  setJurisdiction: (jurisdiction: JurisdictionCode) => void;
  setActiveRole: (role: UserRole) => void;
  login: (params: LoginParams) => Promise<AuthResult>;
  register: (params: RegisterParams) => Promise<AuthResult>;
  registerAgent: (params: AgentRegisterParams) => Promise<AuthResult>;
  registerMerchant: (params: MerchantRegisterParams) => Promise<AuthResult>;
  logout: () => Promise<void>;
  verifyOtp: (code: string) => Promise<{ success: boolean; error?: string }>;
  verifyMfa: (code: string) => Promise<{ success: boolean; error?: string }>;
  biometricLogin: (selectedRole?: UserRole) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function customerRowToAuthUser(row: any, email: string): AuthUser {
  const kycStatus: AuthUser["kycStatus"] = row.status === "ACTIVE" ? "VERIFIED" : row.status === "SUSPENDED" ? "PENDING" : "UNVERIFIED";
  return {
    id: row.id,
    email,
    phone: row.phone,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    country: row.country,
    role: "CUSTOMER",
    kycTier: row.kyc_tier === "TIER_0" ? "TIER_1" : row.kyc_tier,
    kycStatus,
    status: row.status,
    mfaEnabled: false,
    preferredLanguage: row.preferred_language || (row.country === "NE" ? "fr" : "en"),
    createdAt: row.created_at || new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeRole, setActiveRoleState] = useState<UserRole>("CUSTOMER");
  const [language, setLanguage] = useState<"en" | "ha" | "fr">("en");
  const [jurisdiction, setJurisdiction] = useState<JurisdictionCode>("NG");
  const [pendingDestination, setPendingDestination] = useState<string | undefined>(undefined);

  const loadFromSession = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      return;
    }
    try {
      const res = await fetch("/api/customer/me", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (res.ok && json?.data?.customer) {
        const c = json.data.customer;
        const authUser: AuthUser = {
          id: c.id,
          email: c.email,
          phone: c.phone,
          firstName: c.firstName,
          lastName: c.lastName,
          fullName: c.fullName,
          country: c.country,
          role: "CUSTOMER",
          kycTier: c.kycTier,
          kycStatus: c.kycStatus,
          status: "ACTIVE",
          mfaEnabled: false,
          preferredLanguage: c.preferredLanguage,
          createdAt: c.registeredAt,
        };
        setUser(authUser);
        setIsAuthenticated(true);
        setJurisdiction(c.country);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadFromSession();
      if (mounted) setIsLoading(false);
    })();

    const supabase = getSupabaseBrowserClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event) => {
      loadFromSession();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadFromSession]);

  const login = async (params: LoginParams): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const email = params.identifier.trim().toLowerCase();
      if (!email.includes("@")) {
        return {
          success: false,
          errorCode: "IDENTIFIER_UNSUPPORTED",
          errorMessage: "Please sign in with your registered email address.",
        };
      }
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: params.password || "" });

      if (error || !data.session) {
        return {
          success: false,
          errorCode: "INVALID_CREDENTIALS",
          errorMessage: "We couldn't sign you in with those details. Please check your email and password.",
        };
      }

      // A single login form serves all three self-serve personas
      // (Customer/Agent/Business). Ask the backend which real profile this
      // Auth user actually has — never assume CUSTOMER — then route to the
      // matching dashboard. Non-customer personas load their own profile
      // via their own context (AgentContext/MerchantContext), so we don't
      // duplicate that fetch here.
      const resolveRes = await fetch("/api/auth/session/resolve", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const resolveJson = await resolveRes.json();

      if (!resolveRes.ok || !resolveJson?.data?.role) {
        await supabase.auth.signOut();
        return {
          success: false,
          errorCode: resolveJson?.error?.code || "PROFILE_NOT_FOUND",
          errorMessage: resolveJson?.error?.message || "No KoriePay profile is associated with this account.",
        };
      }

      const { role, redirectTo } = resolveJson.data;

      if (role === "AGENT") {
        setActiveRoleState("AGENT");
        router.push(redirectTo);
        return { success: true, redirectTo };
      }
      if (role === "MERCHANT") {
        setActiveRoleState("MERCHANT");
        router.push(redirectTo);
        return { success: true, redirectTo };
      }

      const res = await fetch("/api/customer/me", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok || !json?.data?.customer) {
        await supabase.auth.signOut();
        return {
          success: false,
          errorCode: json?.error?.code || "CUSTOMER_NOT_FOUND",
          errorMessage: json?.error?.message || "No banking profile is associated with this account.",
        };
      }

      const c = json.data.customer;
      const authUser: AuthUser = {
        id: c.id,
        email: c.email,
        phone: c.phone,
        firstName: c.firstName,
        lastName: c.lastName,
        fullName: c.fullName,
        country: c.country,
        role: "CUSTOMER",
        kycTier: c.kycTier,
        kycStatus: c.kycStatus,
        status: "ACTIVE",
        mfaEnabled: false,
        preferredLanguage: c.preferredLanguage,
        createdAt: c.registeredAt,
      };

      setUser(authUser);
      setIsAuthenticated(true);
      setActiveRoleState("CUSTOMER");
      setJurisdiction(authUser.country);

      router.push("/customer");

      return { success: true, user: authUser, redirectTo: "/customer" };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (params: RegisterParams): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();

      if (!res.ok || !json?.data?.registered) {
        return {
          success: false,
          errorCode: json?.error?.code || "REGISTRATION_FAILED",
          errorMessage: json?.error?.message || "Unable to complete customer registration.",
        };
      }

      // Real account created. Sign the customer straight into their real
      // session rather than a synthetic OTP screen.
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email.trim().toLowerCase(),
        password: params.password || "",
      });
      if (error || !data.session) {
        router.push("/login");
        return { success: true, redirectTo: "/login" };
      }

      await loadFromSession();
      setIsAuthenticated(true);
      router.push("/customer");
      return { success: true, redirectTo: "/customer" };
    } finally {
      setIsLoading(false);
    }
  };

  const registerAgent = async (params: AgentRegisterParams): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/agent/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();

      if (!res.ok || !json?.data?.registered) {
        return {
          success: false,
          errorCode: json?.error?.code || "REGISTRATION_FAILED",
          errorMessage: json?.error?.message || "Unable to complete agent registration.",
        };
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email.trim().toLowerCase(),
        password: params.password,
      });
      if (error || !data.session) {
        router.push("/login");
        return { success: true, redirectTo: "/login" };
      }

      setActiveRoleState("AGENT");
      router.push("/agent");
      return { success: true, redirectTo: "/agent" };
    } finally {
      setIsLoading(false);
    }
  };

  const registerMerchant = async (params: MerchantRegisterParams): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/merchant/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();

      if (!res.ok || !json?.data?.registered) {
        return {
          success: false,
          errorCode: json?.error?.code || "REGISTRATION_FAILED",
          errorMessage: json?.error?.message || "Unable to complete business registration.",
        };
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email.trim().toLowerCase(),
        password: params.password,
      });
      if (error || !data.session) {
        router.push("/login");
        return { success: true, redirectTo: "/login" };
      }

      setActiveRoleState("MERCHANT");
      router.push("/merchant");
      return { success: true, redirectTo: "/merchant" };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  // No real OTP/MFA step exists in the current Supabase Auth configuration
  // (no phone OTP provider, no TOTP factor enrolment yet). These are kept as
  // no-op stubs that are honest about doing nothing rather than pretending to
  // verify a code — routes that referenced them are being retired.
  const verifyOtp = async (_code: string): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: "One-time passcode verification isn't available yet. Please sign in with your password." };
  };

  const verifyMfa = async (_code: string): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: "Two-factor verification isn't available yet. Please sign in with your password." };
  };

  // Biometric/WebAuthn login is not implemented against a real credential
  // yet — rather than fabricate a session for the requested role, this is a
  // clear, honest failure.
  const biometricLogin = async (_selectedRole?: UserRole): Promise<AuthResult> => {
    return {
      success: false,
      errorCode: "BIOMETRIC_UNAVAILABLE",
      errorMessage: "Biometric sign-in isn't available yet. Please sign in with your email and password.",
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        activeRole,
        language,
        jurisdiction,
        pendingDestination,
        setLanguage,
        setJurisdiction,
        setActiveRole: (role) => setActiveRoleState(role),
        login,
        register,
        registerAgent,
        registerMerchant,
        logout,
        verifyOtp,
        verifyMfa,
        biometricLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
