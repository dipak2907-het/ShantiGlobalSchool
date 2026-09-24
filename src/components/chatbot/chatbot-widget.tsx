"use client";

import { FormEvent, useState } from "react";

type ChatMessage = { sender: "visitor" | "assistant"; text: string };

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question || sending) return;
    setMessages((current) => [...current, { sender: "visitor", text: question }]);
    setInput(""); setSending(true);
    try {
      const response = await fetch("/api/chatbot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question }) });
      const data: unknown = await response.json();
      const answer = typeof data === "object" && data && "answer" in data && typeof data.answer === "string" ? data.answer : "Please contact the school office.";
      setMessages((current) => [...current, { sender: "assistant", text: answer }]);
    } catch {
      setMessages((current) => [...current, { sender: "assistant", text: "Please contact the school office." }]);
    } finally {
      setSending(false);
    }
  }

  return <div className="fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm">
    {isOpen && <section aria-label="School assistant" className="mb-3 overflow-hidden rounded-xl border bg-white shadow-xl"><header className="bg-blue-700 px-4 py-3 font-bold text-white">School assistant</header><div className="max-h-80 min-h-40 space-y-3 overflow-y-auto p-4 text-sm">{messages.length === 0 ? <p className="text-slate-600">Ask about admissions, holidays, contact details, or a class timetable.</p> : messages.map((message, index) => <p key={index} className={`rounded-lg p-3 ${message.sender === "visitor" ? "ml-8 bg-blue-50" : "mr-8 bg-slate-100"}`}>{message.text}</p>)}</div><form onSubmit={send} className="flex gap-2 border-t p-3"><label className="sr-only" htmlFor="chat-question">Ask a question</label><input id="chat-question" value={input} onChange={(event) => setInput(event.target.value)} maxLength={500} placeholder="Ask a question" className="min-w-0 flex-1 rounded border px-3 py-2" /><button disabled={sending} className="rounded bg-blue-700 px-3 py-2 font-semibold text-white disabled:opacity-60">{sending ? "…" : "Send"}</button></form></section>}
    <button onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} className="ml-auto block rounded-full bg-blue-700 px-5 py-3 font-bold text-white shadow-lg hover:bg-blue-800">{isOpen ? "Close chat" : "Chat with us"}</button>
  </div>;
}
