'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Send, Mic, MicOff, Image as ImageIcon,
  Plus, Trash2, Globe, ChevronLeft, Loader2,
} from 'lucide-react'
import { aiService, type AIThread, type AIMessage } from '@/services/ai.service'
import { KiliButton } from '@/components/ui/KiliButton'
import { KiliBottomSheet } from '@/components/ui/KiliBottomSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

// ── Typing animation ────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-gold"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )
}

// ── Message bubble ──────────────────────────────────
function MessageBubble({ msg }: { msg: AIMessage & { streaming?: boolean; streamText?: string } }) {
  const isUser = msg.role === 'user'
  const text = msg.streaming ? msg.streamText || '' : msg.content

  return (
    <motion.div
      className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {!isUser && (
        <div
          className="w-8 h-8 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 mt-1"
          style={{ background: 'var(--gradient-gold)' }}
        >
          K
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] px-4 py-3 rounded-3xl text-sm leading-relaxed',
          isUser
            ? 'text-black font-medium'
            : 'text-text-primary'
        )}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #F5A623, #E8892A)'
            : 'rgba(26,26,36,0.9)',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
          borderBottomRightRadius: isUser ? 8 : undefined,
          borderBottomLeftRadius: !isUser ? 8 : undefined,
        }}
      >
        <p className="whitespace-pre-wrap prose-dark">{text}</p>
        {msg.streaming && (
          <span className="inline-block w-1 h-4 bg-gold ml-1 animate-pulse" />
        )}
      </div>
    </motion.div>
  )
}

// ── Thread list sidebar/sheet ───────────────────────
function ThreadList({
  threads,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  threads: AIThread[]
  activeId: number | null
  onSelect: (id: number) => void
  onNew: () => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center justify-between border-b border-border-subtle">
        <h2 className="font-bold text-text-primary">Mazungumzo</h2>
        <motion.button
          onClick={onNew}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--gradient-gold)' }}
        >
          <Plus size={16} className="text-black" />
        </motion.button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {threads.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">
            Hakuna mazungumzo bado
          </p>
        ) : (
          threads.map((t) => (
            <motion.div
              key={t.id}
              onClick={() => onSelect(t.id)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group transition-all',
                activeId === t.id
                  ? 'bg-gold/10'
                  : 'hover:bg-white/4'
              )}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: 'var(--gradient-gold-subtle)' }}
              >
                🤖
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium truncate',
                    activeId === t.id ? 'text-gold' : 'text-text-primary'
                  )}
                >
                  {t.title}
                </p>
                <p className="text-[11px] text-text-muted">
                  Ujumbe {t.message_count}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(t.id) }}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-kili-red transition-all"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Main AI Page ────────────────────────────────────
export default function AIPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const [activeThreadId, setActiveThreadId] = useState<number | null>(null)
  const [messages, setMessages] = useState<
    Array<AIMessage & { streaming?: boolean; streamText?: string }>
  >([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [lang, setLang] = useState<'sw' | 'en'>('sw')
  const [isRecording, setIsRecording] = useState(false)
  const [showThreads, setShowThreads] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const { data: threads = [], refetch: refetchThreads } = useQuery({
    queryKey: ['ai-threads'],
    queryFn: aiService.getThreads,
    staleTime: 1000 * 30,
  })

  // Load thread messages
  useEffect(() => {
    if (!activeThreadId) return
    aiService.getMessages(activeThreadId).then((msgs) => {
      setMessages(msgs)
    })
  }, [activeThreadId])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')

    // Add user message optimistically
    const tempUserMsg: AIMessage & { streaming?: boolean } = {
      id: Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev: (AIMessage & { streaming?: boolean; streamText?: string })[]) => [...prev, tempUserMsg])
    setIsStreaming(true)

    // Add streaming AI message
    const tempAiId = Date.now() + 1
    setMessages((prev: (AIMessage & { streaming?: boolean; streamText?: string })[]) => [
      ...prev,
      {
        id: tempAiId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
        streaming: true,
        streamText: '',
      },
    ])

    await aiService.streamChat(
      text,
      activeThreadId,
      lang,
      (chunk) => {
        setMessages((prev: (AIMessage & { streaming?: boolean; streamText?: string })[]) =>
          prev.map((m: AIMessage & { streaming?: boolean; streamText?: string }) =>
            m.id === tempAiId
              ? { ...m, streamText: (m.streamText || '') + chunk }
              : m
          )
        )
      },
      (newThreadId) => {
        setActiveThreadId(newThreadId)
        setIsStreaming(false)
        refetchThreads()
        setMessages((prev: (AIMessage & { streaming?: boolean; streamText?: string })[]) =>
          prev.map((m: AIMessage & { streaming?: boolean; streamText?: string }) =>
            m.id === tempAiId
              ? { ...m, streaming: false, content: m.streamText || '' }
              : m
          )
        )
      },
      (err) => {
        setIsStreaming(false)
        toast.error(err)
        setMessages((prev: (AIMessage & { streaming?: boolean; streamText?: string })[]) => prev.filter((m: AIMessage & { streaming?: boolean; streamText?: string }) => m.id !== tempAiId))
      }
    )
  }, [input, isStreaming, activeThreadId, lang, refetchThreads])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        try {
          const text = await aiService.transcribeVoice(blob)
          setInput(text)
        } catch {
          toast.error('Sauti haikusikika vizuri. Jaribu tena.')
        }
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      toast.error('Ruhusa ya microphone inahitajika')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  const newThread = () => {
    setActiveThreadId(null)
    setMessages([])
    setShowThreads(false)
  }

  const deleteThread = async (id: number) => {
    await aiService.deleteThread(id)
    refetchThreads()
    if (activeThreadId === id) newThread()
  }

  const SUGGESTIONS = [
    '🏔️ Kupanda Kilimanjaro?',
    '🏖️ Pwani nzuri Zanzibar?',
    '🦁 Safari Serengeti',
    '🍛 Chakula cha Tanzania',
    '🚕 Usafiri Dar es Salaam',
    '🌊 Pemba Island',
  ]

  return (
    <div className="flex h-dvh bg-bg-base overflow-hidden">
      {/* Desktop Thread Sidebar */}
      <div
        className="hidden lg:flex flex-col flex-shrink-0 border-r"
        style={{
          width: 280,
          background: '#0D0D14',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <ThreadList
          threads={threads}
          activeId={activeThreadId}
          onSelect={(id) => { setActiveThreadId(id); setMessages([]) }}
          onNew={newThread}
          onDelete={deleteThread}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
          style={{
            background: 'rgba(10,10,15,0.9)',
            backdropFilter: 'blur(20px)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Mobile: threads button */}
          <button
            className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center bg-bg-elevated"
            onClick={() => setShowThreads(true)}
          >
            <span className="text-lg">📋</span>
          </button>

          {/* Logo */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-black text-black flex-shrink-0"
            style={{ background: 'var(--gradient-gold)' }}
          >
            K
          </div>
          <div className="flex-1">
            <p className="font-bold text-text-primary text-sm">
              KilicareGO AI
            </p>
            <p className="text-[11px] text-text-muted">
              Tanzania Tourism Expert 🌍
            </p>
          </div>

          {/* Language toggle */}
          <motion.button
            onClick={() => setLang(lang === 'sw' ? 'en' : 'sw')}
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{
              background: 'rgba(245,166,35,0.1)',
              border: '1px solid rgba(245,166,35,0.3)',
              color: '#F5A623',
            }}
          >
            <Globe size={14} />
            {lang === 'sw' ? '🇹🇿 SW' : '🇬🇧 EN'}
          </motion.button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pb-20">
              <motion.div
                className="text-7xl mb-6"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                🌍
              </motion.div>
              <h2 className="text-xl font-black text-text-primary mb-2">
                KilicareGO AI
              </h2>
              <p className="text-text-muted text-sm text-center max-w-xs mb-8">
                {lang === 'sw'
                  ? 'Msaidizi wako wa utalii Tanzania. Niulize chochote!'
                  : 'Your Tanzania tourism assistant. Ask me anything!'}
              </p>
              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {SUGGESTIONS.map((s) => (
                  <motion.button
                    key={s}
                    onClick={() => setInput(s.replace(/[🏔️🏖️🦁🍛🚕🌊]\s/, ''))}
                    whileTap={{ scale: 0.95 }}
                    className="px-3 py-2 rounded-2xl text-xs font-medium"
                    style={{
                      background: 'rgba(245,166,35,0.08)',
                      border: '1px solid rgba(245,166,35,0.2)',
                      color: '#C8C8D8',
                    }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg: AIMessage & { streaming?: boolean; streamText?: string }) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-3">
                  <div
                    className="w-8 h-8 rounded-2xl flex items-center justify-center text-lg"
                    style={{ background: 'var(--gradient-gold)' }}
                  >
                    K
                  </div>
                  <div
                    className="px-4 py-2 rounded-3xl rounded-bl-sm"
                    style={{
                      background: 'rgba(26,26,36,0.9)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div
          className="flex-shrink-0 px-4 py-3 border-t"
          style={{
            background: 'rgba(10,10,15,0.9)',
            backdropFilter: 'blur(20px)',
            borderColor: 'var(--border)',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          }}
        >
          <div
            className="flex items-end gap-2 rounded-3xl px-4 py-3"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder={
                lang === 'sw'
                  ? 'Uliza swali lolote la Tanzania...'
                  : 'Ask anything about Tanzania...'
              }
              rows={1}
              className="flex-1 bg-transparent text-sm text-text-primary outline-none resize-none max-h-28 leading-relaxed"
              style={{ minHeight: 24 }}
            />

            {/* Voice */}
            <motion.button
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerLeave={stopRecording}
              whileTap={{ scale: 0.9 }}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                isRecording
                  ? 'bg-kili-red animate-pulse'
                  : 'bg-bg-surface'
              )}
            >
              {isRecording ? (
                <MicOff size={16} className="text-white" />
              ) : (
                <Mic size={16} className="text-text-muted" />
              )}
            </motion.button>

            {/* Send */}
            <motion.button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              whileTap={{ scale: 0.88 }}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40"
              style={{ background: 'var(--gradient-gold)' }}
            >
              {isStreaming ? (
                <Loader2 size={16} className="text-black animate-spin" />
              ) : (
                <Send size={16} className="text-black" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile threads sheet */}
      <KiliBottomSheet
        isOpen={showThreads}
        onClose={() => setShowThreads(false)}
        title="Mazungumzo"
        height="75"
      >
        <ThreadList
          threads={threads}
          activeId={activeThreadId}
          onSelect={(id) => { setActiveThreadId(id); setMessages([]); setShowThreads(false) }}
          onNew={newThread}
          onDelete={deleteThread}
        />
      </KiliBottomSheet>
    </div>
  )
}