"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthService, AuthUser, UserRole, JurisdictionCode, AuthResult, LoginParams, RegisterParams } from "@/lib/auth/authService";

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
  logout: () => Promise<void>;
  verifyOtp: (code: string) => Promise<{ success: boolean; error?: string }>;
  verifyMfa: (code: string) => Promise<{ success: boolean; error?: string }>;
  biometricLogin: (selectedRole?: UserRole) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  // Sync user state with session storage if available
  useEffect(() => {
    try {
      const storedRole = sessionStorage.getItem("kp_user_role") as UserRole | null;
      if (storedRole) {
        setActiveRole(storedRole);
        setUser((prev) => (prev ? { ...prev, role: storedRole } : null));
      }
    } catch {
      // Safe fallback
    }
  }, []);

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

  const register = async (params: RegisterParams): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const result = await authService.registerCustomer(params);
      if (result.success && result.user) {
        setUser(result.user);
        setActiveRole("CUSTOMER");
        setJurisdiction(result.user.country);
        setPendingDestination(result.maskedDestination);

        if (result.requiresOtp) {
          router.push("/otp");
        }
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      setUser(null);
      setIsAuthenticated(false);
      try {
        sessionStorage.removeItem("kp_user_role");
        sessionStorage.removeItem("kp_user_session");
      } catch {}
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (code: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (code === "123456" || code.length === 6) {
        setIsAuthenticated(true);
        if (user) {
          setUser({ ...user, status: "ACTIVE", kycStatus: "VERIFIED" });
        }
        const route = authService.resolveDashboardRoute(activeRole, "VERIFIED");
        router.push(route);
        return { success: true };
      }
      return { success: false, error: "The one-time passcode you entered is invalid or expired." };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyMfa = async (code: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (code === "123456" || code.length === 6) {
        setIsAuthenticated(true);
        const route = authService.resolveDashboardRoute(activeRole, "VERIFIED");
        router.push(route);
        return { success: true };
      }
      return { success: false, error: "Invalid authenticator security token. Please check your authenticator app." };
    } finally {
      setIsLoading(false);
    }
  };

  const biometricLogin = async (selectedRole?: UserRole): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const targetRole = selectedRole || activeRole;
      const targetCountry = jurisdiction;

      const bioUser: AuthUser = {
        id: `usr_bio_${Date.now().toString(36)}`,
        email: targetCountry === 'NG' ? 'ibrahim.bello@koriepay.ng' : 'amara.diallo@koriepay.ne',
        phone: targetCountry === 'NG' ? '+2348099887766' : '+22790223344',
        firstName: targetCountry === 'NG' ? 'Ibrahim' : 'Amara',
        lastName: targetCountry === 'NG' ? 'Bello' : 'Diallo',
        fullName: targetCountry === 'NG' ? 'Ibrahim Bello' : 'Amara Diallo',
        country: targetCountry,
        role: targetRole,
        kycTier: 'TIER_2',
        kycStatus: 'VERIFIED',
        status: 'ACTIVE',
        mfaEnabled: targetRole === 'ADMIN',
        preferredLanguage: targetCountry === 'NE' ? 'fr' : 'en',
        createdAt: new Date().toISOString(),
      };

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
