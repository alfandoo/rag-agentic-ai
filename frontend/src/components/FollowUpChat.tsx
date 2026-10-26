"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { ChatMessage } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

interface FollowUpChatProps {
  topic: string;
  reportSummary: string;
}

export const FollowUpChat: React.FC<FollowUpChatProps> = ({ topic, reportSummary }) => {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || isGenerating) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: textToSend.trim() }
    ];

    setMessages(newMessages);
    setInput("");
    setIsGenerating(true);

    // Placeholder for streaming assistant response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("http://localhost:8000/api/research/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          report_context: reportSummary,
          messages: newMessages,
          language
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let assistantReply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.replace("data: ", "").trim());
              if (data.token) {
                assistantReply += data.token;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantReply
                  };
                  return updated;
                });
              }
            } catch {
              // Ignore non-json lines
            }
          }
        }
      }
    } catch (err) {
      console.error("Follow-up chat streaming error:", err);
      // Fallback synchronous call
      try {
        const fallbackRes = await fetch("http://localhost:8000/api/research/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            report_context: reportSummary,
            messages: newMessages,
            language
          })
        });
        const fallbackData = await fallbackRes.json();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: fallbackData.reply || (language === "id" ? "Gagal memuat jawaban." : "Failed to load reply.")
          };
          return updated;
        });
      } catch {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: language === "id" 
              ? "Maaf, terjadi kesalahan saat menghubungi server backend." 
              : "Sorry, an error occurred while connecting to the backend server."
          };
          return updated;
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pt-4">
      {/* Container Box */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-zinc-300" />
            <div>
              <h3 className="font-semibold text-sm text-zinc-100">{t.chat.header}</h3>
              <p className="text-[11px] text-zinc-500 font-normal">{t.chat.subtitle}</p>
            </div>
          </div>
          <span className="font-mono text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
            Context: {topic}
          </span>
        </div>

        {/* Message Thread */}
        <div className="p-4 min-h-[140px] max-h-[460px] overflow-y-auto space-y-3.5 bg-zinc-950">
          {messages.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-zinc-500 italic">
                {language === "id" 
                  ? "Belum ada pesan. Tanyakan apa saja mengenai laporan riset kompetitor di atas!" 
                  : "No messages yet. Ask anything about the competitor intelligence report above!"}
              </p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-md bg-zinc-850 border border-zinc-700/80 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-zinc-100 text-zinc-950 font-medium"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-200"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-invert prose-xs max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content || (isGenerating && idx === messages.length - 1 ? t.chat.waiting : "")}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>

                {m.role === "user" && (
                  <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Prompt Chips */}
        <div className="px-3.5 py-2 bg-zinc-900/60 border-t border-zinc-800/80 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-zinc-400" />
            {t.chat.suggestionsLabel}
          </span>
          {t.chat.suggestions.map((suggestion, sIdx) => (
            <button
              key={sIdx}
              type="button"
              onClick={() => handleSend(suggestion)}
              disabled={isGenerating}
              className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-950 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder={t.chat.placeholder}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 disabled:opacity-50"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isGenerating}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium transition-colors disabled:opacity-40 disabled:hover:bg-zinc-100 cursor-pointer shrink-0"
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
