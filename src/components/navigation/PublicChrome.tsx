"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

/**
 * Public site chrome (marketing Navbar + Footer).
 *
 * The marketing Navbar / Footer must ONLY render on public marketing
 * pages. The portals (admin, agent, aggregator, customer, merchant,
 * developer, support, compliance) and the authentication flows all ship
 * their own dedicated shell chrome, so we exclude those routes here.
 */

const PORTAL_PREFIXES = [
  "/admin",
  "/agent",
  "/aggregator",
  "/customer",
  "/merchant",
  "/developer",
  "/support",
  "/compliance",
];

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/mfa",
  "/otp",
  "/account-restricted",
];

// Match a route segment — exactly ("/admin") or a nested child ("/admin/ledger"),
// without accidentally matching another route that merely shares a prefix
// (e.g. public "/developers" must not match the portal "/developer").
function matchesSegment(pathname: string, segment: string): boolean {
  return pathname === segment || pathname.startsWith(segment + "/");
}

export const PublicChrome: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname() || "/";

  const isPortal = PORTAL_PREFIXES.some((prefix) =>
    matchesSegment(pathname, prefix)
  );
  const isAuth = AUTH_ROUTES.some((route) => matchesSegment(pathname, route));

  // Portals & auth flows render their own chrome — no public navbar/footer.
  if (isPortal || isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </>
  );
};

export default PublicChrome;
