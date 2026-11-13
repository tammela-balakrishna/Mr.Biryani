import { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I’m the Mr. BIRIYANI assistant. Ask me about the restaurant, ordering, reservations, or menu information.' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, open]);

  async function sendMessage(event) {
    event.preventDefault();
    const question = message.trim();
    if (!question || loading) return;
    setMessage('');
    setError('');
    setMessages((items) => [...items, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The assistant is unavailable.');
      setMessages((items) => [...items, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
      }]);
    } catch (err) {
      setError(err.message || 'Unable to connect to the assistant.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {open && (
        <section className="mb-3 flex h-[min(600px,75vh)] w-[min(370px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-[#D4A63A]/30 bg-[#111] shadow-2xl shadow-black/60" aria-label="Mr. BIRIYANI chatbot">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#1b1b1b] px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#D4A63A]/15 p-2 text-[#D4A63A]"><Bot size={20}/></span>
              <div><p className="font-semibold text-white">Mr. BIRIYANI Assistant</p><p className="text-xs text-neutral-400">Knowledge-based support</p></div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Close chat"><X size={19}/></button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.map((item, index) => (
              <div key={index} className={item.role === 'user' ? 'ml-8 rounded-2xl rounded-br-sm bg-[#D4A63A] px-3 py-2.5 text-sm text-black' : 'mr-5 rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2.5 text-sm text-neutral-100'}>
                <p className="whitespace-pre-wrap">{item.content}</p>
                {item.sources?.length > 0 && <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-neutral-400">Sources: {item.sources.map((source) => source.title).join(', ')}</p>}
              </div>
            ))}
            {loading && <p className="text-xs text-neutral-400">Searching restaurant information…</p>}
            {error && <p role="alert" className="rounded-lg bg-red-950/50 p-2 text-xs text-red-200">{error}</p>}
            <div ref={bottomRef}/>
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-3">
            <input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} placeholder="Ask a question…" aria-label="Message" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-[#D4A63A]" />
            <button type="submit" disabled={!message.trim() || loading} aria-label="Send message" className="rounded-xl bg-[#D4A63A] px-3 text-black disabled:opacity-40"><Send size={18}/></button>
          </form>
          <p className="px-3 pb-2 text-center text-[10px] text-neutral-500">AI answers can be incomplete. Confirm important details with staff.</p>
        </section>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close assistant' : 'Open assistant'} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D4A63A] text-black shadow-xl shadow-black/40 transition hover:scale-105">
        {open ? <X size={24}/> : <MessageCircle size={24}/>}
      </button>
    </div>
  );
}
