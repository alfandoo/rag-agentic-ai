"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Trash2,
  Database,
  Copy,
  Check
} from "lucide-react";
import { ChatMessage } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { API_BASE_URL } from "@/lib/config";

interface FollowUpChatProps {
  topic: string;
  reportSummary: string;
  competitorNames?: string[];
}

export const FollowUpChat: React.FC<FollowUpChatProps> = ({
  topic,
  reportSummary,
  competitorNames = []
}) => {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const threadContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Build context-aware prompt suggestions using actual competitors in the report
  const dynamicSuggestions = React.useMemo(() => {
    if (competitorNames.length >= 2) {
      const c1 = competitorNames[0];
      const c2 = competitorNames[1];
      const allJoined = competitorNames.join(" vs ");
      if (language === "id") {
        return [
          `Bandingkan rincian harga & paket ${c1} vs ${c2}`,
          `Apa strategi terbaik untuk mengalahkan keunggulan ${c1}?`,
          `Ringkas keluhan pengguna (user sentiment) pada ${allJoined}`
        ];
      }
      return [
        `Compare pricing tiers and hidden costs: ${c1} vs ${c2}`,
        `What is the best strategy to beat ${c1}'s market positioning?`,
        `Summarize user sentiment & developer complaints across ${allJoined}`
      ];
    }
    return t.chat.suggestions;
  }, [competitorNames, language, t.chat.suggestions]);

  // Cancel an in-flight answer when the chat unmounts or the topic changes
  useEffect(() => () => abortRef.current?.abort(), []);

  // Only scroll inside the chat thread container when there are active messages
  useEffect(() => {
    if (messages.length > 0 && threadContainerRef.current) {
      threadContainerRef.current.scrollTop = threadContainerRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleCopyReply = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || isGenerating) return;

    const userMessage: ChatMessage = { role: "user", content: textToSend.trim() };
    const newMessages: ChatMessage[] = [...messages, userMessage];
    const requestMessages: ChatMessage[] = [...messages.slice(-6), userMessage];

    setMessages(newMessages);
    setInput("");
    setChatError(null);
    setIsGenerating(true);

    // Placeholder for streaming assistant response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const replyParts: string[] = [];
    let buffer = "";

    try {
      const response = await fetch(`${API_BASE_URL}/api/research/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          report_context: reportSummary,
          messages: requestMessages,
          language
        }),
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        if (response.status === 429) {
          const retry = response.headers.get("retry-after");
          const message =
            language === "id"
              ? `Batas chat tercapai. Coba lagi${retry ? ` dalam ${retry} detik` : " nanti"}.`
              : `Chat limit reached. Try again${retry ? ` in ${retry} seconds` : " later"}.`;
          setChatError(message);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: message };
            return updated;
          });
          return;
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // sse-starlette uses CRLF; normalize so both formats parse.
        buffer = buffer.replace(/\r\n/g, "\n");
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          for (const line of event.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6).trim());
              if (data.token) {
                replyParts.push(data.token);
                const nextReply = replyParts.join("");
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: nextReply
                  };
                  return updated;
                });
              }
            } catch {
              // Ignore malformed events; complete events still stream normally
            }
          }
        }
      }
    } catch {
      if (controller.signal.aborted) return;
      const partialReply = replyParts.join("");
      if (partialReply.trim()) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content:
              partialReply +
              (language === "id"
                ? "\n\n_[Jawaban terputus. Kirim ulang untuk melanjutkan.]_"
                : "\n\n_[Response interrupted. Send again to continue.]_")
          };
          return updated;
        });
        return;
      }
      // Fallback synchronous call only when no tokens arrived
      try {
        const fallbackRes = await fetch(`${API_BASE_URL}/api/research/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            report_context: reportSummary,
            messages: requestMessages,
            language
          }),
          signal: controller.signal
        });
        if (!fallbackRes.ok) {
          const message =
            language === "id"
              ? "Batas chat tercapai atau server sedang sibuk. Coba lagi nanti."
              : "Chat limit reached or the server is busy. Try again later.";
          setChatError(message);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: message };
            return updated;
          });
          return;
        }
        const fallbackData = await fallbackRes.json();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content:
              fallbackData.reply ||
              (language === "id" ? "Gagal memuat jawaban." : "Failed to load reply.")
          };
          return updated;
        });
      } catch {
        if (controller.signal.aborted) return;
        const message =
          language === "id"
            ? "Maaf, terjadi kesalahan saat menghubungi server backend."
            : "Sorry, an error occurred while connecting to the backend server.";
        setChatError(message);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: message };
          return updated;
        });
      }
    } finally {
      setIsGenerating(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pt-3 print:hidden">
      {/* Container Box */}
      <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-zinc-100 truncate">
                {t.chat.header}
              </h3>
              <p className="text-[11px] text-zinc-400 font-normal truncate">
                {t.chat.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
              <Database className="w-2.5 h-2.5" />
              {t.chat.ragBadge}
            </span>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setChatError(null);
                }}
                disabled={isGenerating}
                className="flex items-center gap-1 font-mono text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-950 hover:bg-zinc-800 px-2 py-1 rounded border border-zinc-800 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>{t.chat.clearChat}</span>
              </button>
            )}
          </div>
        </div>

        {chatError && (
          <div className="mx-3.5 sm:mx-4 mt-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-[11px] text-rose-200">
            {chatError}
          </div>
        )}

        {/* Message Thread */}
        <div
          ref={threadContainerRef}
          className="p-3.5 sm:p-4 min-h-[150px] max-h-[480px] overflow-y-auto space-y-4 bg-zinc-950"
        >
          {messages.length === 0 ? (
            <div className="text-center py-7 space-y-2">
              <p className="text-xs text-zinc-500 max-w-lg mx-auto leading-relaxed px-2">
                {language === "id"
                  ? "Belum ada percakapan. Pilih salah satu contoh pertanyaan di bawah atau ketik pertanyaan spesifik Anda mengenai hasil riset di atas."
                  : "No messages yet. Pick a suggested prompt below or ask a specific question about the competitor intelligence dossier above."}
              </p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 animate-slide-up ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}

                <div
                  className={`max-w-[90%] sm:max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-emerald-500 text-zinc-950 font-medium"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-200 space-y-2"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <>
                      <div className="markdown-content text-xs text-zinc-200">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ node, ...props }) => (
                              <a
                                {...props}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:underline font-medium"
                              />
                            )
                          }}
                        >
                          {m.content ||
                            (isGenerating && idx === messages.length - 1
                              ? t.chat.waiting
                              : "")}
                        </ReactMarkdown>
                      </div>
                      {m.content && (!isGenerating || idx < messages.length - 1) && (
                        <div className="flex justify-end pt-1 border-t border-zinc-800/70">
                          <button
                            type="button"
                            onClick={() => handleCopyReply(m.content, idx)}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                          >
                            {copiedIdx === idx ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                                <span className="text-emerald-400">{t.chat.copiedReply}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-2.5 h-2.5" />
                                <span>{t.chat.copyReply}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>

                {m.role === "user" && (
                  <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Suggestion Prompt Chips */}
        <div className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-zinc-900/70 border-t border-zinc-800/80 flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none touch-pan-x sm:flex-wrap">
          <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {t.chat.suggestionsLabel}
          </span>
          {dynamicSuggestions.map((suggestion, sIdx) => (
            <button
              key={sIdx}
              type="button"
              onClick={() => handleSend(suggestion)}
              disabled={isGenerating}
              className="text-[11px] px-2.5 py-1.5 sm:py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 disabled:opacity-40 cursor-pointer shrink-0 whitespace-nowrap sm:whitespace-normal interactive-btn"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder={t.chat.placeholder}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-base sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 disabled:opacity-50 min-h-[38px]"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isGenerating}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer shrink-0 interactive-btn min-h-[38px]"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>{t.chat.send}</span>
                <Send className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
