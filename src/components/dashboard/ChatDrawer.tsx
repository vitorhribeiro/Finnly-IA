'use client'

import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send } from 'lucide-react'
import Image from 'next/image'

interface Message {
  role: 'bot' | 'user'
  text: string
}

const SUGGESTIONS = [
  'Quanto posso gastar hoje?',
  'Como está meu score?',
  'Onde estou gastando mais?',
  'Como melhorar minhas finanças?',
]

function formatMessage(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <b key={i}>{part.slice(2, -2)}</b>
      : part
  )
}

interface ChatDrawerProps {
  seed: string | null
  onClose: () => void
}

export function ChatDrawer({ seed, onClose }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Olá! Sou o **Finnly**, seu consultor financeiro com IA. Tenho acesso aos seus dados reais. Como posso ajudar?' },
  ])
  const [typing, setTyping] = useState(false)
  const [input, setInput] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const seeded = useRef(false)

  // History para contexto multi-turno
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  useEffect(() => {
    if (seed && !seeded.current) {
      seeded.current = true
      sendMessage(seed)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [messages, typing])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return

    setMessages(prev => [...prev, { role: 'user', text: trimmed }])
    setInput('')
    setTyping(true)

    // Adiciona ao histórico
    historyRef.current.push({ role: 'user', content: trimmed })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: historyRef.current.slice(-6) }),
      })

      const data = await res.json()
      const answer: string = data.answer ?? 'Desculpe, não consegui processar sua pergunta.'

      historyRef.current.push({ role: 'assistant', content: answer })
      setTyping(false)
      setMessages(prev => [...prev, { role: 'bot', text: answer }])
    } catch {
      setTyping(false)
      setMessages(prev => [...prev, { role: 'bot', text: 'Erro de conexão. Tente novamente.' }])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="drawer">
        <div className="chat-head">
          <div className="av" style={{ background: 'transparent', padding: 0, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
            <Image src="/images/logosemfundo.png" alt="Finnly" width={36} height={36} style={{ objectFit: 'contain' }} />
          </div>
          <div>
            <div className="nm">Finnly IA</div>
            <div className="st">
              <span className="led" />
              Online · consultor financeiro
            </div>
          </div>
          <button className="chat-close" onClick={onClose} aria-label="Fechar chat">
            <X size={18} />
          </button>
        </div>

        <div className="chat-body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {formatMessage(m.text)}
            </div>
          ))}
          {typing && (
            <div className="msg bot typing">
              <i /><i /><i />
            </div>
          )}
        </div>

        <div className="chat-suggest">
          {SUGGESTIONS.map(s => (
            <button key={s} className="chip" onClick={() => sendMessage(s)} disabled={typing}>
              {s}
            </button>
          ))}
        </div>

        <div className="chat-input">
          <textarea
            placeholder="Pergunte ao Finnly…"
            value={input}
            rows={1}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={typing}
          />
          <button
            className="chat-send"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || typing}
            aria-label="Enviar"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  )
}
