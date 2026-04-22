"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Send, Search, LogOut, MessageCircle, ArrowLeft, MoreVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  last_seen?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

function avatarColor(name: string) {
  const colors = ["#1e3a5f", "#1e3d2f", "#3d1e2f", "#2f2a1e", "#1e2f3d", "#3a1e3d", "#1e3a2f", "#2f1e3a"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ChatApp({
  currentUserId,
  currentUserName,
  currentUserEmail,
}: {
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
}) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUser, setActiveUser] = useState<Profile | null>(null);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // MERGED FIX: useMemo (from auth-fix) prevents the client being recreated on
  // every render, which would tear down and recreate realtime subscriptions.
  // The singleton in client.ts already guards against this, but useMemo makes
  // the dependency arrays in useEffect stable too.
  const supabase = useMemo(() => createClient(), []);

  // ── Load profiles ─────────────────────────────────────────────────────────

  const loadProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, last_seen")
      .neq("id", currentUserId)
      .order("full_name", { ascending: true });
    // MERGED FIX: explicit error check (from auth-fix)
    if (!error && data) setProfiles(data);
  }, [currentUserId, supabase]);

  // ── Load message history ──────────────────────────────────────────────────

  const loadMessages = useCallback(async (otherId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, created_at")
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherId}),` +
        `and(sender_id.eq.${otherId},receiver_id.eq.${currentUserId})`
      )
      .order("created_at", { ascending: true });
    // MERGED FIX: explicit error check (from auth-fix)
    if (!error && data) setMessages(data);
  }, [currentUserId, supabase]);

  // ── Upsert own profile on mount ───────────────────────────────────────────

  useEffect(() => {
    supabase
      .from("profiles")
      .upsert(
        { id: currentUserId, full_name: currentUserName, email: currentUserEmail, last_seen: new Date().toISOString() },
        { onConflict: "id" }
      )
      .then(() => loadProfiles());
  }, [currentUserId, currentUserName, currentUserEmail, supabase, loadProfiles]);

  // ── Realtime subscription ─────────────────────────────────────────────────

  useEffect(() => {
    if (!activeUser) return;
    loadMessages(activeUser.id);

    // Subscribe to ALL inserts then filter in JS — this ensures both sides of
    // the conversation receive live updates, not just the receiver.
    const channelName = `dm_${[currentUserId, activeUser.id].sort().join("_")}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          const belongs =
            (msg.sender_id === currentUserId && msg.receiver_id === activeUser.id) ||
            (msg.sender_id === activeUser.id && msg.receiver_id === currentUserId);
          if (!belongs) return;

          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            // Replace optimistic placeholder with confirmed record
            const optIdx = prev.findIndex(
              m => m.id.startsWith("tmp_") && m.sender_id === currentUserId
            );
            if (optIdx !== -1 && msg.sender_id === currentUserId) {
              const next = [...prev];
              next[optIdx] = msg;
              return next;
            }
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeUser, currentUserId, supabase, loadMessages]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const selectUser = (p: Profile) => {
    if (activeUser?.id === p.id) return;
    setActiveUser(p);
    setMessages([]);
    setMobileChatOpen(true);
    setSendError("");
  };

  const sendMessage = async () => {
    if (!text.trim() || !activeUser || sending) return;
    const content = text.trim();
    setText("");
    setSendError("");
    setSending(true);

    // Optimistic message shown immediately
    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
      sender_id: currentUserId,
      receiver_id: activeUser.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: currentUserId, receiver_id: activeUser.id, content })
      .select()
      .single();

    if (error) {
      // MERGED FIX: roll back optimistic message and restore input text (from complete-fix)
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setText(content);
      setSendError("Failed to send. Check your connection and try again.");
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // MERGED FIX: replace + refresh (from auth-fix) clears the server-side
    // session cache so the user can't navigate back to /chat with the back button.
    router.replace("/auth");
    router.refresh();
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const groupedMessages: Array<{ date: string; msgs: Message[] }> = [];
  messages.forEach(msg => {
    const d = fmtDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last?.date === d) last.msgs.push(msg);
    else groupedMessages.push({ date: d, msgs: [msg] });
  });

  const filtered = profiles.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="app-shell">

      {/* ── SIDEBAR ── */}
      <div className={`sidebar ${mobileChatOpen ? "" : "open"}`}>
        <div className="sidebar-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Strata Signal</span>
          </div>
          <button onClick={handleLogout} className="ss-btn-ghost" style={{ padding: "6px 10px", fontSize: 13 }}>
            <LogOut size={14} /> Log out
          </button>
        </div>

        {/* Current user chip */}
        <div style={{ padding: "10px 14px 6px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, background: avatarColor(currentUserName) }}>
              {initials(currentUserName)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{currentUserName}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>You</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <div style={{ position: "relative" }}>
            <Search size={13} color="var(--text3)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              className="search-input"
              placeholder="Search people…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* User list */}
        <div className="user-list">
          {filtered.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
              {profiles.length === 0 ? "No other users yet" : "No results"}
            </div>
          ) : (
            filtered.map(p => (
              <div
                key={p.id}
                className={`user-item ${activeUser?.id === p.id ? "active" : ""}`}
                onClick={() => selectUser(p)}
              >
                <div className="avatar avatar-online" style={{ background: avatarColor(p.full_name) }}>
                  {initials(p.full_name)}
                </div>
                <div className="user-info">
                  <div className="user-name">{p.full_name}</div>
                  <div className="user-preview">{p.email}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── CHAT PANEL ── */}
      <div className="chat-panel">
        {!activeUser ? (
          <div className="empty-chat">
            <div style={{ width: 64, height: 64, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={28} color="var(--text3)" strokeWidth={1.5} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text2)", marginBottom: 4 }}>Select a conversation</div>
              <div style={{ fontSize: 13, color: "var(--text3)" }}>Choose someone from the sidebar to start messaging</div>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="chat-header">
              <button
                id="back-btn"
                onClick={() => setMobileChatOpen(false)}
                className="ss-btn-ghost"
                style={{ padding: "6px 8px", display: "none" }}
              >
                <ArrowLeft size={16} />
              </button>
              <div className="avatar avatar-online" style={{ background: avatarColor(activeUser.full_name) }}>
                {initials(activeUser.full_name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{activeUser.full_name}</div>
                <div style={{ fontSize: 12, color: "var(--green)" }}>Online</div>
              </div>
              <button className="ss-btn-ghost" style={{ padding: "6px 8px" }}>
                <MoreVertical size={16} />
              </button>
            </div>

            {/* Messages */}
            <div className="messages-area">
              {groupedMessages.map(group => (
                <div key={group.date}>
                  <div className="date-divider">{group.date}</div>
                  {group.msgs.map((msg, i) => {
                    const mine = msg.sender_id === currentUserId;
                    const isOptimistic = msg.id.startsWith("tmp_");
                    const showAvatar = !mine && (
                      i === 0 || group.msgs[i - 1]?.sender_id !== msg.sender_id
                    );
                    return (
                      <div
                        key={msg.id}
                        className={`msg-row ${mine ? "mine" : ""} msg-in`}
                        style={{ marginBottom: 2, alignItems: "flex-end" }}
                      >
                        {!mine && (
                          <div
                            className="avatar"
                            style={{
                              width: 28, height: 28, fontSize: 10, flexShrink: 0,
                              background: showAvatar ? avatarColor(activeUser.full_name) : "transparent",
                              opacity: showAvatar ? 1 : 0,
                            }}
                          >
                            {showAvatar ? initials(activeUser.full_name) : ""}
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
                          <div
                            className={`msg-bubble ${mine ? "mine" : "theirs"}`}
                            style={{ opacity: isOptimistic ? 0.55 : 1, transition: "opacity 0.2s" }}
                          >
                            {msg.content}
                          </div>
                          <div className="msg-time">{fmtTime(msg.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Send error banner */}
            {sendError && (
              <div style={{ padding: "6px 16px", background: "#2a1010", borderTop: "1px solid #5c2020", fontSize: 12, color: "#e57373" }}>
                {sendError}
              </div>
            )}

            {/* Input bar */}
            <div className="input-bar">
              <textarea
                ref={inputRef}
                className="msg-input"
                placeholder={`Message ${activeUser.full_name}…`}
                value={text}
                onChange={e => { setText(e.target.value); setSendError(""); }}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={!text.trim() || sending}
              >
                <Send size={16} color="#fff" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Mobile layout via inline style — avoids SSR hydration mismatch */}
      <style>{`
        @media (max-width: 700px) {
          .sidebar { display: ${mobileChatOpen ? "none" : "flex"} !important; width: 100% !important; }
          .chat-panel { display: ${mobileChatOpen ? "flex" : "none"} !important; }
          #back-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
