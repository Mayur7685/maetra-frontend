"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useAleoPrograms } from "@/hooks/useAleoPrograms";
import { api, CreatorProfile, Post } from "@/lib/api";

const WEIGHT_STYLES: Record<string, string> = {
  Heavyweight: "bg-pomelo/15 text-pomelo",
  Middleweight: "bg-lemon/15 text-lemon",
  Lightweight: "bg-lime/15 text-lime",
};

export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const username = params.username as string;

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { subscribe: aleoSubscribe, waitForConfirmation, pending: txPending, error: txError, lastTxId, connected: walletConnected } = useAleoPrograms();

  useEffect(() => {
    if (!username) return;

    const fetchCreator = api.leaderboard.creator(username)
      .then((data) => setCreator(data.creator))
      .catch(() => {});

    const fetchPosts = token
      ? api.posts.creatorPosts(token, username)
          .then((data) => { setPosts(data.posts); setHasAccess(data.hasAccess); })
          .catch(() => {})
      : Promise.resolve();

    Promise.all([fetchCreator, fetchPosts]).finally(() => setLoading(false));
  }, [username, token]);

  const handleSubscribe = async () => {
    if (!token || !creator) return router.push("/login");
    setSubscribing(true);
    try {
      let aleoTxId: string | undefined;

      // Execute on-chain subscription via wallet if connected
      if (walletConnected && subPrice > 0 && creator.aleoAddress) {
        const tx = await aleoSubscribe(creator.aleoAddress, subPrice);
        if (!tx?.transactionId) {
          setSubscribing(false);
          return; // User rejected or tx failed
        }
        aleoTxId = tx.transactionId;

        // Wait for on-chain confirmation before unlocking content
        setConfirming(true);
        const status = await waitForConfirmation(aleoTxId);
        setConfirming(false);
        if (status !== "accepted") {
          setSubscribing(false);
          return; // Transaction failed or timed out
        }
      }

      // Only create DB subscription after successful on-chain confirmation
      await api.subscriptions.subscribe(token, creator.id, aleoTxId);
      // Refetch posts now that we have access
      const data = await api.posts.creatorPosts(token, username);
      setPosts(data.posts);
      setHasAccess(data.hasAccess);
    } catch {}
    setSubscribing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="app" />
        <div className="flex items-center justify-center pt-32">
          <p className="text-muted text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="app" />
        <div className="flex items-center justify-center pt-32">
          <p className="text-muted">Creator not found</p>
        </div>
      </div>
    );
  }

  const subPrice = Number(creator.subscriptionPriceMicrocredits || 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="app" />

      <div className="flex flex-col lg:flex-row pt-16">
        {/* Left sidebar */}
        <div className="w-full lg:w-96 lg:border-r border-b lg:border-b-0 border-border p-4 sm:p-6 pt-6 sm:pt-8 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-full bg-stone flex items-center justify-center text-lg font-semibold text-foreground">
              {(creator.displayName || creator.username || "?")[0].toUpperCase()}
            </div>
            <div>
              <span className="font-semibold text-foreground">{creator.displayName || creator.username}</span>
              {creator.xHandle && (
                <p className="text-xs text-muted flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-muted">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  {creator.xHandle}
                </p>
              )}
            </div>
          </div>

          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${WEIGHT_STYLES[creator.weightClass] || WEIGHT_STYLES.Lightweight}`}>
            {creator.weightClass}
          </span>

          {/* Stats */}
          <div className="mt-6">
            <p className="text-xs text-muted font-medium mb-3">This month:</p>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-xs text-muted">Win rate</p><p className="text-sm font-semibold text-lime">{creator.winRate}%</p></div>
              <div><p className="text-xs text-muted">Win streak</p><p className="text-sm font-semibold text-foreground">{creator.winStreak}</p></div>
              <div><p className="text-xs text-muted">Trust score</p><p className="text-sm font-semibold text-foreground">{creator.trustScore}</p></div>
              <div><p className="text-xs text-muted">Trades</p><p className="text-sm font-semibold text-foreground">{creator.tradeCount}</p></div>
              <div><p className="text-xs text-muted">Pos. opened</p><p className="text-sm font-semibold text-foreground">{creator.positionsOpened}</p></div>
              <div><p className="text-xs text-muted">Pos. closed</p><p className="text-sm font-semibold text-foreground">{creator.positionsClosed}</p></div>
            </div>
          </div>

          {/* Bio */}
          <div className="mt-6">
            <p className="text-xs text-muted font-medium mb-2">Bio</p>
            <p className="text-xs text-muted leading-relaxed whitespace-pre-line">{creator.bio || "No bio yet"}</p>
          </div>

          {/* Subscription cost */}
          <div className="mt-6">
            <p className="text-xs font-medium text-foreground mb-1">Subscription Cost</p>
            <p className="text-xs text-muted">{subPrice > 0 ? `${subPrice} microcredits` : "Free"}</p>
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 p-4 sm:p-8">
          {hasAccess ? (
            posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-muted">This creator hasn&apos;t posted any content yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <article key={post.id} className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-stone flex items-center justify-center text-sm font-semibold text-foreground">
                          {(creator.displayName || creator.username || "?")[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{creator.displayName || creator.username}</span>
                      </div>
                      <span className="text-xs text-muted">Published: {new Date(post.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-3">{post.title}</h2>
                    <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{post.contentEncrypted}</p>
                  </article>
                ))}
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-stone flex items-center justify-center text-2xl font-semibold text-foreground mx-auto mb-4">
                  {(creator.displayName || creator.username || "?")[0].toUpperCase()}
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">{creator.displayName || creator.username}</h2>
                <p className="text-sm text-muted mb-6 max-w-xs">{creator.bio || "Subscribe to unlock this creator's alpha content"}</p>
                <button
                  onClick={handleSubscribe}
                  disabled={subscribing || txPending || confirming}
                  className="rounded-[var(--radius-lg)] bg-lime px-6 py-3 text-sm font-semibold text-coal hover:bg-lime/85 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {confirming ? "Confirming on Aleo..." : txPending ? "Signing transaction..." : subscribing ? "Subscribing..." : `Unlock Alpha${subPrice > 0 ? ` for ${subPrice} microcredits` : ""}`}
                </button>
                {txError && <p className="text-xs text-tangerine mt-2">{txError}</p>}
                {lastTxId && <p className="text-xs text-lime mt-2 font-mono break-all">Tx: {lastTxId}</p>}
                <p className="text-xs text-muted mt-2">Value in USD is approximate and may vary</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
