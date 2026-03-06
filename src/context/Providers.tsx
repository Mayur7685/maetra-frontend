"use client";

import { ReactNode, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import { api } from "@/lib/api";

/** Auto-syncs connected Aleo wallet address to the backend */
function WalletSync({ children }: { children: ReactNode }) {
  const { token, user, refreshUser } = useAuth();
  const { connected, address } = useWallet();

  useEffect(() => {
    if (connected && address && token && user && user.aleoAddress !== address) {
      api.profile.connectWallet(token, address)
        .then(() => refreshUser())
        .catch(() => {});
    }
  }, [connected, address, token, user, refreshUser]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <AuthProvider>
        <WalletSync>{children}</WalletSync>
      </AuthProvider>
    </WalletProvider>
  );
}
