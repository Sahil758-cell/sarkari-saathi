"use client";

import { ArrowRight, Globe, Send, Sparkles, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useErrorMessage } from "@/components/Feedback";
import SchemeCard from "@/components/SchemeCard";
import { useLanguage } from "@/context/LanguageContext";
import { askAssistant } from "@/lib/api";
import { EXAMPLE_QUESTIONS } from "@/lib/constants";
import type { AskResponse } from "@/lib/types";

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; result: AskResponse }
  | { id: number; role: "error"; text: string };

const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : null);

function ExampleList({ onPick, disabled }: { onPick: (q: string) => void; disabled: boolean }) {
  return (
    <ul className="space-y-2">
      {EXAMPLE_QUESTIONS.map((q) => (
        <li key={q}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(q)}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 text-left text-sm shadow-card ring-1 ring-line transition hover:ring-primary/40 disabled:opacity-60"
          >
            <span>{q}</span>
            <ArrowRight size={16} className="shrink-0 text-primary" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function AssistantView() {
  const { language, t } = useLanguage();
  const errorMessage = useErrorMessage();
  const initialQuery = useSearchParams().get("q");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const handledInitial = useRef<string | null>(null);

  const ask = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || loading) return;
      setInput("");
      setLoading(true);
      setMessages((m) => [...m, { id: nextId.current++, role: "user", text }]);
      try {
        const result = await askAssistant(text, language);
        setMessages((m) => [...m, { id: nextId.current++, role: "assistant", result }]);
      } catch (err) {
        setMessages((m) => [
          ...m,
          { id: nextId.current++, role: "error", text: errorMessage(err) },
        ]);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, loading]
  );

  // `/assistant?q=...` runs that question straight away (once per value).
  useEffect(() => {
    if (initialQuery && handledInitial.current !== initialQuery) {
      handledInitial.current = initialQuery;
      void ask(initialQuery);
    }
  }, [initialQuery, ask]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section
        aria-label={t("assistantTitle")}
        className="flex h-[calc(100dvh-11rem)] min-h-[460px] flex-col overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-line"
      >
        <header className="flex items-center gap-3 border-b border-line bg-primary-light px-5 py-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
            <Sparkles size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold">{t("assistantTitle")}</h1>
            <p className="truncate text-xs text-muted">{t("assistantSubtitle")}</p>
          </div>
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={() => setMessages([])}
              disabled={loading}
              className="shrink-0 rounded-full border border-primary/30 bg-surface px-3 py-1 text-xs font-semibold text-primary hover:bg-primary-light disabled:opacity-60"
            >
              {t("newChat")}
            </button>
          ) : null}
        </header>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-5">
          {/* Greeting */}
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <Sparkles size={16} aria-hidden />
            </span>
            <div className="rounded-2xl rounded-tl-sm bg-canvas px-4 py-3 text-sm">
              <p className="font-semibold">{t("hiThere")}</p>
              <p className="text-muted">{t("howCanIHelp")}</p>
            </div>
          </div>

          {/* Examples inside the chat on small screens (sidebar is desktop-only) */}
          {messages.length === 0 ? (
            <div className="lg:hidden">
              <h2 className="mb-2 text-sm font-semibold text-muted">{t("exampleQuestions")}</h2>
              <ExampleList onPick={ask} disabled={loading} />
            </div>
          ) : null}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end gap-3">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm text-white">
                  {m.text}
                </p>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-line text-muted"
                  title={t("you")}
                >
                  <UserRound size={16} aria-hidden />
                </span>
              </div>
            ) : m.role === "error" ? (
              <div key={m.id} role="alert" className="flex gap-3">
                <span className="h-8 w-8 shrink-0" />
                <p className="rounded-2xl bg-danger-light px-4 py-3 text-sm text-danger">
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={m.id} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Sparkles size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="rounded-2xl rounded-tl-sm bg-canvas px-4 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      {t("answer")}
                    </p>
                    <p className="whitespace-pre-line text-sm leading-relaxed">{m.result.answer}</p>
                  </div>

                  {m.result.sources.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-muted">{t("sources")}</h3>
                      <div className="grid gap-2">
                        {m.result.sources.map((s) => (
                          <SchemeCard key={s.slug} scheme={s} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {m.result.web_sources.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-muted">
                        {t("fromOfficialGovSites")}
                      </h3>
                      <ul className="grid gap-2">
                        {m.result.web_sources.map((w) => {
                          const href = safeUrl(w.url);
                          return href ? (
                            <li key={w.url}>
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-surface p-3 text-sm transition-colors hover:border-primary/50 hover:bg-primary-light"
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                                  <Globe size={16} aria-hidden />
                                </span>
                                <span className="line-clamp-2">{w.title}</span>
                              </a>
                            </li>
                          ) : null;
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          )}

          {loading ? (
            <div role="status" className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <Sparkles size={16} aria-hidden />
              </span>
              <span className="flex items-center gap-2 rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
                <span className="flex gap-1" aria-hidden>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                </span>
                {t("thinking")}
              </span>
            </div>
          ) : null}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
          className="border-t border-line bg-surface p-3 sm:p-4"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="assistant-input" className="sr-only">
              {t("typeYourQuestion")}
            </label>
            <input
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("typeYourQuestion")}
              className="min-w-0 flex-1 rounded-full border border-line bg-canvas px-4 py-2.5 text-sm placeholder:text-faint focus:border-primary"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label={t("send")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-faint"
            >
              <Send size={17} aria-hidden />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-faint">{t("assistantDisclaimer")}</p>
        </form>
      </section>

      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <h2 className="mb-3 text-lg font-bold">{t("exampleQuestions")}</h2>
          <ExampleList onPick={ask} disabled={loading} />
        </div>
      </aside>
    </div>
  );
}
