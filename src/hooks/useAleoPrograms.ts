"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";

// Program IDs deployed on testnet
const PROGRAMS = {
  TRUST: "maetra_trust.aleo",
  SUBSCRIPTION: "maetra_subscription.aleo",
  CONTENT: "maetra_content.aleo",
} as const;

// Default base fee in microcredits (0.5 credits)
const DEFAULT_FEE = 500_000;

interface TxResult {
  transactionId: string;
}

export function useAleoPrograms() {
  const { wallet, executeTransaction, transactionStatus, connected } = useWallet();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Poll transaction status — matches NullPay pattern (1s interval, 120 attempts)
  const pollStatus = useCallback(
    async (tempTxId: string) => {
      console.log("[Aleo TX] Polling status for:", tempTxId);

      // Try polling via adapter directly (more reliable than hook for some wallets)
      const adapter = wallet?.adapter;

      for (let i = 0; i < 120; i++) {
        try {
          let statusStr: string | undefined;
          let onChainId: string | undefined;

          if (adapter && "transactionStatus" in adapter) {
            // Poll directly on adapter (NullPay pattern)
            const statusRes: unknown = await adapter.transactionStatus(tempTxId);
            // Handle both string and object responses
            if (typeof statusRes === "string") {
              statusStr = statusRes.toLowerCase();
            } else if (statusRes && typeof statusRes === "object") {
              statusStr = (statusRes as { status?: string }).status?.toLowerCase();
              onChainId = (statusRes as { transactionId?: string }).transactionId;
            }
          } else {
            // Fallback to hook
            const status = await transactionStatus(tempTxId);
            statusStr = status.status?.toLowerCase();
            onChainId = status.transactionId;
          }

          console.log("[Aleo TX] Poll #" + (i + 1) + ":", { status: statusStr, onChainId });

          if (onChainId && onChainId !== tempTxId) {
            setLastTxId(onChainId);
            console.log("[Aleo TX] On-chain ID:", onChainId);
          }

          if (statusStr === "accepted" || statusStr === "finalized" || statusStr === "completed") {
            setTxStatus("accepted");
            return;
          }
          if (statusStr === "failed" || statusStr === "rejected") {
            setTxStatus(statusStr);
            setError(`Transaction ${statusStr}`);
            return;
          }
          setTxStatus(statusStr || "pending");
        } catch (pollErr) {
          // Don't stop on individual errors — Shield wallet may not have started processing yet
          if (i % 10 === 9) {
            console.warn("[Aleo TX] Still polling, attempt #" + (i + 1) + ":", pollErr);
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      setTxStatus("timeout");
      setError("Transaction status polling timed out after 2 minutes");
    },
    [wallet, transactionStatus],
  );

  const execute = useCallback(
    async (
      program: string,
      fn: string,
      inputs: string[],
      fee: number = DEFAULT_FEE,
    ): Promise<TxResult | null> => {
      if (!connected) {
        setError("Wallet not connected");
        return null;
      }

      setPending(true);
      setError(null);
      setLastTxId(null);
      setTxStatus(null);

      try {
        console.log("[Aleo TX]", { program, function: fn, inputs, fee });

        const result = await executeTransaction({
          program,
          function: fn,
          inputs,
          fee,
          privateFee: false,
        });

        console.log("[Aleo TX] Result:", result);

        if (result?.transactionId) {
          setLastTxId(result.transactionId);
          setTxStatus("submitted");

          // Poll for real on-chain confirmation in background
          pollStatus(result.transactionId);

          return result;
        }

        setError("Transaction was rejected or cancelled by wallet");
        return null;
      } catch (err) {
        console.error("[Aleo TX] Error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        return null;
      } finally {
        setPending(false);
      }
    },
    [connected, executeTransaction, pollStatus],
  );

  // maetra_trust.aleo — submit_performance
  const submitPerformance = useCallback(
    async (leoInputs: {
      profitable_days: string;
      total_days: string;
      trade_count: string;
      current_streak: string;
      avg_volume_usd: string;
    }) => {
      return execute(PROGRAMS.TRUST, "submit_performance", [
        leoInputs.profitable_days,
        leoInputs.total_days,
        leoInputs.trade_count,
        leoInputs.current_streak,
        leoInputs.avg_volume_usd,
      ]);
    },
    [execute],
  );

  // maetra_subscription.aleo — set_price
  const setPrice = useCallback(
    async (priceMicrocredits: number) => {
      return execute(PROGRAMS.SUBSCRIPTION, "set_price", [
        `${priceMicrocredits}u64`,
      ]);
    },
    [execute],
  );

  // maetra_subscription.aleo — subscribe
  const subscribe = useCallback(
    async (
      creatorAddress: string,
      amountMicrocredits: number,
      durationBlocks: number = 430_000, // ~30 days at ~6s/block
    ) => {
      return execute(
        PROGRAMS.SUBSCRIPTION,
        "subscribe",
        [creatorAddress, `${amountMicrocredits}u64`, `${durationBlocks}u64`],
        DEFAULT_FEE,
      );
    },
    [execute],
  );

  // maetra_content.aleo — publish
  const publishContent = useCallback(
    async (postId: string, contentHash: string) => {
      // postId and contentHash should be field values (e.g. "12345field")
      return execute(PROGRAMS.CONTENT, "publish", [postId, contentHash]);
    },
    [execute],
  );

  // Poll transaction status
  const waitForConfirmation = useCallback(
    async (txId: string, maxAttempts: number = 60): Promise<string> => {
      const adapter = wallet?.adapter;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          let statusStr: string | undefined;
          if (adapter && "transactionStatus" in adapter) {
            const statusRes: unknown = await adapter.transactionStatus(txId);
            statusStr = typeof statusRes === "string"
              ? statusRes.toLowerCase()
              : (statusRes as { status?: string })?.status?.toLowerCase();
          } else {
            const status = await transactionStatus(txId);
            statusStr = status.status?.toLowerCase();
          }
          if (statusStr === "accepted" || statusStr === "finalized" || statusStr === "completed") return "accepted";
          if (statusStr === "failed" || statusStr === "rejected") return statusStr;
        } catch {
          // Status not available yet
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      return "timeout";
    },
    [wallet, transactionStatus],
  );

  return {
    submitPerformance,
    setPrice,
    subscribe,
    publishContent,
    waitForConfirmation,
    pending,
    error,
    lastTxId,
    txStatus,
    connected,
  };
}
