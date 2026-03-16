"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { useWalletModal } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { api } from "@/lib/api";

export default function SetupProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [evmAddress, setEvmAddress] = useState("");
  const [showEvmInput, setShowEvmInput] = useState(false);
  const [evmConnected, setEvmConnected] = useState(false);
  const router = useRouter();
  const { token, refreshUser } = useAuth();
  const { connected, address, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return router.push("/login");
    setError("");
    setLoading(true);
    try {
      await api.profile.update(token, { displayName });
      // Save Aleo wallet address if connected
      if (connected && address) {
        await api.profile.connectWallet(token, address);
      }
      // Save EVM wallet / Hyperliquid connection
      if (evmConnected && evmAddress) {
        await api.exchanges.connect(token, "hyperliquid", evmAddress);
      }
      await refreshUser();
      router.push("/my-page");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-lime/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex items-center justify-center min-h-screen px-6 pt-20">
        <form onSubmit={handleSubmit} className="relative w-full max-w-sm flex flex-col items-center">
          <h1 className="text-xl font-semibold text-foreground mb-8">Set up your profile</h1>

          {error && (
            <div className="w-full mb-4 rounded-[var(--radius-md)] bg-tangerine/10 border border-tangerine/30 px-4 py-2 text-sm text-tangerine">
              {error}
            </div>
          )}

          <div className="w-full space-y-4">
            {/* Aleo Wallet */}
            {connected && address ? (
              <div className="w-full rounded-[var(--radius-md)] border border-lime/30 bg-lime/5 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-lime" />
                  <span className="text-sm text-foreground truncate max-w-[200px]">{address.slice(0, 12)}...{address.slice(-6)}</span>
                </div>
                <button type="button" onClick={disconnect} className="text-xs text-muted hover:text-foreground transition-colors">
                  Disconnect
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setVisible(true)}
                className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-muted hover:text-foreground hover:border-lime/30 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 8v8" /><path d="M8 12h8" />
                </svg>
                Connect Aleo Wallet
              </button>
            )}

            {evmConnected ? (
              <div className="w-full rounded-[var(--radius-md)] border border-lime/30 bg-lime/5 px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-lime" />
                  <span className="text-sm text-foreground truncate max-w-[200px]">{evmAddress.slice(0, 10)}...{evmAddress.slice(-4)}</span>
                </div>
                <button type="button" onClick={() => { setEvmConnected(false); setEvmAddress(""); setShowEvmInput(false); }}
                  className="text-xs text-muted hover:text-foreground transition-colors">
                  Remove
                </button>
              </div>
            ) : showEvmInput ? (
              <div className="w-full space-y-2">
                <div className="flex rounded-[var(--radius-md)] border border-border bg-surface overflow-hidden focus-within:border-lime/50 transition-colors">
                  <span className="flex items-center px-3 text-xs text-muted border-r border-border bg-background/50">0x</span>
                  <input type="text" placeholder="EVM address" value={evmAddress} onChange={(e) => setEvmAddress(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none font-mono" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowEvmInput(false)}
                    className="flex-1 rounded-[var(--radius-md)] border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={() => { if (evmAddress.length >= 10) setEvmConnected(true); }}
                    className="flex-1 rounded-[var(--radius-md)] bg-lime/10 border border-lime/30 px-3 py-1.5 text-xs text-foreground hover:bg-lime/20 transition-colors">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowEvmInput(true)}
                className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-muted hover:text-foreground hover:border-lime/30 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M12 8v8" /><path d="M8 12h8" />
                </svg>
                Connect EVM wallet
              </button>
            )}

            <div>
              <label className="block text-xs text-muted mb-1.5">Your Name</label>
              <input type="text" placeholder="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-lime/50 transition-colors" />
            </div>

            <button type="button"
              className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-muted hover:text-foreground hover:border-lime/30 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Connect X account
              <span className="text-xs text-muted/50">optional</span>
            </button>

            <button type="submit" disabled={loading}
              className="w-full rounded-[var(--radius-md)] bg-foreground py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors mt-2 disabled:opacity-50">
              {loading ? "Saving..." : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
