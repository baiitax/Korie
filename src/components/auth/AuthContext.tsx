"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthService, AuthUser, UserRole, JurisdictionCode, AuthResult, LoginParams, RegisterParams, buildDemoUser } from "@/lib/auth/authService";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: UserRole;
  language: "en" | "ha" | "fr";
  jurisdiction: JurisdictionCode;
  pendingDestination?: string;
  /** Identifier the OTP flow verifies (set at registration). */
  pendingIdentifier: string | null;
  /** Server session bearer from OTP verification (drives portal API calls). */
  sessionToken: string | null;
  /** Sandbox test-mode OTP code, when the server reveals one. */
  otpTestCode: string | null;
  setLanguage: (lang: "en" | "ha" | "fr") => void;
  setJurisdiction: (jurisdiction: JurisdictionCode) => void;
  setActiveRole: (role: UserRole) => void;
  login: (params: LoginParams) => Promise<AuthResult>;
  register: (params: RegisterParams) => Promise<AuthResult>;
  logout: () => Promise<void>;
  requestOtp: () => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (code: string) => Promise<{ success: boolean; error?: string }>;
  verifyMfa: (code: string) => Promise<{ success: boolean; error?: string }>;
  biometricLogin: (selectedRole?: UserRole) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_TOKEN_STORAGE = "kp_session_token";

const DEFAULT_USER: AuthUser = {
  id: "usr_default_01",
  email: "ibrahim.bello@koriepay.ng",
  phone: "+2348099887766",
  firstName: "Ibrahim",
  lastName: "Bello",
  fullName: "Ibrahim Bello",
  country: "NG",
  role: "CUSTOMER",
  kycTier: "TIER_2",
  kycStatus: "VERIFIED",
  status: "ACTIVE",
  mfaEnabled: false,
  preferredLanguage: "en",
  createdAt: "2026-08-01T08:00:00Z",
  lastLoginAt: new Date().toISOString(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const authService = AuthService.getInstance();

  const [user, setUser] = useState<AuthUser | null>(DEFAULT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeRole, setActiveRole] = useState<UserRole>("CUSTOMER");
  const [language, setLanguage] = useState<"en" | "ha" | "fr">("en");
  const [jurisdiction, setJurisdiction] = useState<JurisdictionCode>("NG");
  const [pendingDestination, setPendingDestination] = useState<string | undefined>(undefined);
  const [pendingIdentifier, setPendingIdentifier] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [otpTestCode, setOtpTestCode] = useState<string | null>(null);

  // Sync user state with session storage if available
  useEffect(() => {
    try {
      const storedRole = sessionStorage.getItem("kp_user_role") as UserRole | null;
      if (storedRole) {
        setActiveRole(storedRole);
        setUser((prev) => (prev ? { ...prev, role: storedRole } : null));
      }
      const storedToken = sessionStorage.getItem(SESSION_TOKEN_STORAGE);
      if (storedToken) setSessionToken(storedToken);
    } catch {
      // Safe fallback
    }
  }, []);

  const storeSessionToken = (token: string | null) => {
    setSessionToken(token);
    try {
      if (token) sessionStorage.setItem(SESSION_TOKEN_STORAGE, token);
      else sessionStorage.removeItem(SESSION_TOKEN_STORAGE);
    } catch {}
  };

  const resolveOtpIdentifier = (): string | null =>
    pendingIdentifier || user?.phone || user?.email || null;

  const login = async (params: LoginParams): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const result = await authService.authenticate({
        ...params,
        selectedRoleOverride: params.selectedRoleOverride || activeRole,
      });

      if (result.success && result.user) {
        setUser(result.user);
        setActiveRole(result.user.role);
        setJurisdiction(result.user.country);
        setPendingDestination(result.maskedDestination);

        if (result.requiresMfa) {
          setIsAuthenticated(false);
          router.push("/mfa");
          return result;
        }

        setIsAuthenticated(true);
        try {
          sessionStorage.setItem("kp_user_role", result.user.role);
          sessionStorage.setItem("kp_user_session", JSON.stringify(result.user));
        } catch {}

        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Registration goes through the SERVER route: the client-side service used
   * to be called in-browser, where its engine row evaporated with the page.
   * Server-side the customer row persists (process lifetime) so the OTP step
   * can bind a session to it.
   */
  const register = async (params: RegisterParams): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        return {
          success: false,
          errorCode: json?.error?.code || `HTTP_${res.status}`,
          errorMessage: json?.error?.message || "Registration could not be completed.",
        };
      }
      const data = json.data;
      setUser(data.user);
      setActiveRole("CUSTOMER");
      setJurisdiction(data.user.country);
      setPendingDestination(data.maskedDestination);
      setPendingIdentifier(params.phone);
      setOtpTestCode(null);

      if (data.requiresOtp) {
        router.push("/otp");
      }
      return {
        success: true,
        user: data.user,
        requiresOtp: data.requiresOtp,
        maskedDestination: data.maskedDestination,
        redirectTo: data.redirectTo,
      };
    } catch {
      return {
        success: false,
        errorCode: "NETWORK_ERROR",
        errorMessage: "The console could not reach the server. Check the connection and try again.",
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Best-effort server-side revocation of the session bearer.
      if (sessionToken) {
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            headers: { Authorization: `Bearer ${sessionToken}` },
            cache: "no-store",
          });
        } catch {}
      }
      setUser(null);
      setIsAuthenticated(false);
      storeSessionToken(null);
      setPendingIdentifier(null);
      setOtpTestCode(null);
      try {
        sessionStorage.removeItem("kp_user_role");
        sessionStorage.removeItem("kp_user_session");
      } catch {}
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const requestOtp = async (): Promise<{ success: boolean; error?: string }> => {
    const identifier = resolveOtpIdentifier();
    if (!identifier) {
      return { success: false, error: "No phone or email on file for this verification. Start from registration." };
    }
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, country: jurisdiction }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        return { success: false, error: json?.error?.message || `Request failed (${json?.error?.code || res.status}).` };
      }
      setPendingDestination(json.data.maskedDestination);
      setOtpTestCode(json.data.testMode ? json.data.testCode || null : null);
      return { success: true };
    } catch {
      return { success: false, error: "The console could not reach the server. Check the connection and try again." };
    }
  };

  /**
   * OTP verification goes through the SERVER registry: the code must match a
   * live challenge for the pending identifier, and success mints a real
   * session bearer that portal API calls attach from here on. The old
   * client-side "any 6 digits pass" check is gone.
   */
  const verifyOtp = async (code: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const identifier = resolveOtpIdentifier();
      if (!identifier) {
        return { success: false, error: "No phone or email on file for this verification. Start from registration." };
      }
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code, country: jurisdiction }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        return { success: false, error: json?.error?.message || "The one-time passcode you entered is invalid or expired." };
      }
      storeSessionToken(json.data.sessionToken);
      setOtpTestCode(null);
      setIsAuthenticated(true);
      if (user) {
        setUser({ ...user, status: "ACTIVE" });
      }
      const route = authService.resolveDashboardRoute(activeRole, user?.kycStatus || "VERIFIED");
      router.push(route);
      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred during verification. Please try again." };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Honest MFA: no authenticator enrollment exists server-side, so step-up
   * cannot complete. The server 501s and this surfaces its message — the old
   * client-side "any 6 digits elevate to AAL2" is gone. Privileged console
   * access continues through the console key gate, not this step.
   */
  const verifyMfa = async (code: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        return { success: false, error: json?.error?.message || "Invalid authenticator security token. Please check your authenticator app." };
      }
      setIsAuthenticated(true);
      const route = authService.resolveDashboardRoute(activeRole, "VERIFIED");
      router.push(route);
      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred during step-up authentication. Please try again." };
    } finally {
      setIsLoading(false);
    }
  };

  const biometricLogin = async (selectedRole?: UserRole): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const targetRole = selectedRole || activeRole;
      const targetCountry = jurisdiction;

      // Persona is built by the shared auth service — the AGENT role resolves
      // to the registered agency operator (agt-ng-001), not a customer.
      const bioUser = buildDemoUser(targetRole, targetCountry);

      setUser(bioUser);
      setIsAuthenticated(true);
      setActiveRole(targetRole);

      try {
        sessionStorage.setItem("kp_user_role", targetRole);
        sessionStorage.setItem("kp_user_session", JSON.stringify(bioUser));
      } catch {}

      const route = authService.resolveDashboardRoute(targetRole, 'VERIFIED');
      router.push(route);

      return {
        success: true,
        user: bioUser,
        redirectTo: route,
      };
    } finally {
      setIsLoading(false);
    }
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
        pendingIdentifier,
        sessionToken,
        otpTestCode,
        setLanguage,
        setJurisdiction,
        setActiveRole: (role) => {
          setActiveRole(role);
          if (user) {
            setUser({ ...user, role });
          }
          try {
            sessionStorage.setItem("kp_user_role", role);
          } catch {}
        },
        login,
        register,
        logout,
        requestOtp,
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
