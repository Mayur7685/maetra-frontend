"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { useWalletModal } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { Logo } from "./Logo";

interface NavbarProps {
  variant?: "landing" | "auth" | "app";
}

export function Navbar({ variant = "landing" }: NavbarProps) {
  const { user, logout } = useAuth();

  if (variant === "landing") {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-background/80 backdrop-blur-sm">
        <Logo />
        <div className="flex items-center gap-3 sm:gap-4">
          {!user && (
            <Link href="/login" className="text-sm text-muted hover:text-foreground transition-colors hidden sm:block">
              Login
            </Link>
          )}
          <Link href="/leaderboard"
            className="rounded-[var(--radius-md)] bg-lime px-4 sm:px-5 py-2 text-sm font-medium text-coal hover:bg-lime/85 transition-colors">
            Leaderboard
          </Link>
        </div>
      </nav>
    );
  }

  if (variant === "auth") {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-4 sm:gap-8">
          <Logo />
          <Link href="/leaderboard" className="text-sm text-muted hover:text-foreground transition-colors hidden sm:block">Leaderboard</Link>
        </div>
        <Link href="/login"
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-4 sm:px-5 py-2 text-sm font-medium text-foreground hover:bg-surface transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span className="hidden sm:inline">Login</span>
        </Link>
      </nav>
    );
  }

  return <AppNavbar user={user} logout={logout} />;
}

const NAV_LINKS = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/my-subscriptions", label: "My Subs" },
  { href: "/my-page", label: "My Page" },
] as const;

function AppNavbar({ user, logout }: { user: ReturnType<typeof useAuth>["user"]; logout: () => void }) {
  const { connected, address } = useWallet();
  const { setVisible } = useWalletModal();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4 sm:px-8 py-3 sm:py-4">
        <div className="flex items-center gap-4 sm:gap-8">
          <Logo />
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href}
                className={`text-sm transition-colors ${pathname === href ? "text-foreground font-medium" : "text-muted hover:text-foreground"}`}>
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {connected && address ? (
            <button onClick={() => setVisible(true)}
              className="flex items-center gap-1.5 sm:gap-2 rounded-[var(--radius-md)] border border-lime/30 bg-lime/5 px-2.5 sm:px-4 py-2 text-sm text-foreground hover:bg-lime/10 transition-colors">
              <div className="h-2 w-2 rounded-full bg-lime" />
              <span className="font-mono text-xs hidden sm:inline">{address.slice(0, 8)}...{address.slice(-4)}</span>
              <span className="font-mono text-xs sm:hidden">{address.slice(0, 4)}...</span>
            </button>
          ) : (
            <button onClick={() => setVisible(true)}
              className="flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-3 sm:px-4 py-2 text-sm text-muted hover:text-foreground hover:border-lime/30 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 8v8" /><path d="M8 12h8" />
              </svg>
              <span className="hidden sm:inline">Connect Wallet</span>
            </button>
          )}

          {user ? (
            <button onClick={logout}
              className="hidden sm:flex items-center gap-2 rounded-[var(--radius-md)] border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-surface transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          ) : (
            <Link href="/login" className="hidden sm:block rounded-[var(--radius-md)] border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-surface transition-colors">
              Login
            </Link>
          )}

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-1.5 text-muted hover:text-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileOpen
                ? <><path d="M18 6L6 18" /><path d="M6 6l12 12" /></>
                : <><path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" /></>
              }
            </svg>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed top-[57px] left-0 right-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm md:hidden">
          <div className="flex flex-col px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                className={`px-3 py-2.5 rounded-[var(--radius-md)] text-sm transition-colors ${pathname === href ? "text-foreground bg-surface font-medium" : "text-muted hover:text-foreground hover:bg-surface/50"}`}>
                {label}
              </Link>
            ))}
            <div className="border-t border-border mt-2 pt-2">
              {user ? (
                <button onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-[var(--radius-md)] text-sm text-muted hover:text-foreground hover:bg-surface/50 transition-colors">
                  Logout
                </button>
              ) : (
                <Link href="/login" onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 rounded-[var(--radius-md)] text-sm text-muted hover:text-foreground hover:bg-surface/50 transition-colors">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
