import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Mic,
  Send,
  Calendar,
  Phone,
  Bell,
  Image as ImageIcon,
  PenTool,
  ChevronDown,
  RotateCcw,
  Loader2,
  Clipboard,
} from 'lucide-react';
import { AssistantConfig, CalendarEvent, ChatMessage } from '../types';
import { parseNaturalLanguageEvent } from '../services/geminiService';
import { getEventCallTimeLabel } from '../services/callSchedulerService';
import { getLocalDateString } from '../utils/dateUtils';
import { getTheme } from '../utils/theme';
import { TokiAvatar } from './TokiAvatar';

interface TokiChatSchedulerProps {
  config: AssistantConfig;
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onToggleEventCallMe: (eventId: string, callMe: boolean) => void;
  onUpdateEventCallOffset: (eventId: string, minutesBefore: number) => void;
  onViewTodayEvents: () => void;
  onOpenEventInsights: (event: CalendarEvent) => void;
  onOpenDetailedWrite: () => void;
  onOpenPhotoUpload: (imageDataUrl?: string) => void;
  onOpenVoice: () => void;
  onTestNotification?: () => void;
}

const CHAT_STORAGE_KEY = 'toki_chat_messages_v1';

interface ParsedLocalIntent {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  priority: 'high' | 'medium' | 'low';
  callMe: boolean;
  callMinutesBefore: number;
  category: CalendarEvent['category'];
}

const CALL_OFFSET_OPTIONS = [
  { value: 0, label: 'No horário do evento' },
  { value: 1, label: '1 minuto antes' },
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
];

function formatMinutesLabel(minutesBefore = 0): string {
  if (minutesBefore <= 0) return 'No horário do evento';
  if (minutesBefore === 1) return '1 minuto antes';
  return `${minutesBefore} minutos antes`;
}

function formatEventDateTag(dateStr: string): string {
  const today = getLocalDateString(0);
  const tomorrow = getLocalDateString(1);
  const yesterday = getLocalDateString(-1);
  if (dateStr === today) return 'Hoje';
  if (dateStr === tomorrow) return 'Amanhã';
  if (dateStr === yesterday) return 'Ontem';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr;
}

function addMinutesToTime(hhmm: string, minsToAdd: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '10:00';
  const total = (h * 60 + m + minsToAdd) % 1440;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}

/**
 * Deterministic Portuguese natural-language parser for dates, times, and "me ligue X minutos antes"
 */
function parsePortugueseSchedulePrompt(rawText: string): ParsedLocalIntent {
  let working = rawText.trim();
  const todayStr = getLocalDateString(0);
  let targetDate = todayStr;

  // 1. Detect "me ligue X minuto(s) antes" / "me ligue na hora" / "ligar X min antes"
  let callMe = false;
  let callMinutesBefore = 0;

  const callBeforeMatch = working.match(
    /(?:me\s+ligu?e|ligar|ligação)\s+(\d+)\s*(?:min(?:uto)?s?)\s+antes/i
  );
  if (callBeforeMatch) {
    callMe = true;
    callMinutesBefore = Math.max(0, parseInt(callBeforeMatch[1], 10));
    working = working.replace(callBeforeMatch[0], ' ');
  } else {
    const callAtStartMatch = working.match(
      /(?:me\s+ligu?e|ligar|ligação)(?:\s+(?:na\s+hora|no\s+hor[áa]rio|pontualmente))?/i
    );
    if (callAtStartMatch) {
      callMe = true;
      callMinutesBefore = 0;
      working = working.replace(callAtStartMatch[0], ' ');
    }
  }

  // 2. Detect explicit DD/MM/YYYY or DD/MM
  const fullDateMatch = working.match(/(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1], 10);
    const month = parseInt(fullDateMatch[2], 10);
    let year = fullDateMatch[3] ? parseInt(fullDateMatch[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      targetDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
    working = working.replace(fullDateMatch[0], ' ');
  } else if (/\bamanh[ãa]\b/i.test(working)) {
    targetDate = getLocalDateString(1);
    working = working.replace(/\bamanh[ãa]\b/i, ' ');
  } else if (/\bdepois\s+de\s+amanh[ãa]\b/i.test(working)) {
    targetDate = getLocalDateString(2);
    working = working.replace(/\bdepois\s+de\s+amanh[ãa]\b/i, ' ');
  } else if (/\bhoje\b/i.test(working)) {
    targetDate = todayStr;
    working = working.replace(/\bhoje\b/i, ' ');
  }

  // 3. Detect time: "às 21:50", "as 21h50", "13 48", "14h"
  let startTime = '';
  const timeColonMatch = working.match(/(?:[àa]s\s+)?(\d{1,2})[:h](\d{2})\b/i);
  const timeSpaceMatch = !timeColonMatch
    ? working.match(/(?:[àa]s\s+)(\d{1,2})\s+(\d{2})\b/i) || working.match(/\b([01]?\d|2[0-3])\s+([0-5]\d)\b/)
    : null;
  const timeHourOnlyMatch =
    !timeColonMatch && !timeSpaceMatch
      ? working.match(/(?:[àa]s\s+)(\d{1,2})h?\b/i)
      : null;

  if (timeColonMatch) {
    const hh = Math.min(23, parseInt(timeColonMatch[1], 10));
    const mm = Math.min(59, parseInt(timeColonMatch[2], 10));
    startTime = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    working = working.replace(timeColonMatch[0], ' ');
  } else if (timeSpaceMatch) {
    const hh = Math.min(23, parseInt(timeSpaceMatch[1], 10));
    const mm = Math.min(59, parseInt(timeSpaceMatch[2], 10));
    startTime = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    working = working.replace(timeSpaceMatch[0], ' ');
  } else if (timeHourOnlyMatch) {
    const hh = Math.min(23, parseInt(timeHourOnlyMatch[1], 10));
    startTime = `${hh.toString().padStart(2, '0')}:00`;
    working = working.replace(timeHourOnlyMatch[0], ' ');
  } else {
    // Default to 1 hour from now rounded to next 15m if no time specified
    const now = new Date();
    now.setMinutes(now.getMinutes() + 60);
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = (Math.floor(now.getMinutes() / 15) * 15).toString().padStart(2, '0');
    startTime = `${hh}:${mm}`;
  }

  const endTime = addMinutesToTime(startTime, 60);

  // 4. Priority heuristic
  let priority: 'high' | 'medium' | 'low' = callMe ? 'high' : 'medium';
  if (/\b(urgente|cr[íi]tic[oa]|alta|board|investidor|diretoria|vip)\b/i.test(rawText)) {
    priority = 'high';
  } else if (/\b(baixa|opcional|rotina|simples)\b/i.test(rawText)) {
    priority = 'low';
  }

  // 5. Category heuristic
  let category: CalendarEvent['category'] = 'meeting';
  if (/\b(almo[çc]o|jantar|caf[ée]|networking)\b/i.test(rawText)) category = 'networking';
  else if (/\b(foco|estudo|revis[ãa]o|deep\s*work)\b/i.test(rawText)) category = 'focus';
  else if (/\b(m[ée]dico|dentista|academia|voo|viagem|pessoal)\b/i.test(rawText)) category = 'personal';

  // 6. Clean remaining title
  const cleanedTitle = working
    .replace(/\b(agendar|marcar|criar|para|dia|as|às|em|no|na)\b$/gi, '')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    title: cleanedTitle || rawText.trim().slice(0, 60),
    date: targetDate,
    startTime,
    endTime,
    priority,
    callMe,
    callMinutesBefore,
    category,
  };
}

export const TokiChatScheduler: React.FC<TokiChatSchedulerProps> = ({
  config,
  events,
  onAddEvent,
  onToggleEventCallMe,
  onUpdateEventCallOffset,
  onViewTodayEvents,
  onOpenEventInsights,
  onOpenDetailedWrite,
  onOpenPhotoUpload,
  onOpenVoice,
  onTestNotification,
}) => {
  const currentTheme = getTheme(config.auraColor);
  const [composerText, setComposerText] = useState('');
  const [composerMode, setComposerMode] = useState<'rapido' | 'detalhado'>('rapido');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [openOffsetEventId, setOpenOffsetEventId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const plusMenuRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      {
        id: 'welcome-toki',
        role: 'assistant',
        content: `Olá! Escreva um compromisso abaixo em linguagem natural (ex: "Reunião com Felipe amanhã às 14:30. Me ligue 5 minutos antes") ou cole o print de um convite.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    if (isPlusMenuOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isPlusMenuOpen]);

  const handleResetChat = () => {
    const fresh: ChatMessage[] = [
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: `Novo bate-papo iniciado. Diga o título, data, horário e se quer que eu te ligue antes.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setMessages(fresh);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = composerText.trim();
    if (!text || isSubmitting) return;

    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: nowTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setComposerText('');
    setIsSubmitting(true);

    try {
      // Deterministic local Portuguese parsing guarantees date, time, and "me ligue X minutos antes" accuracy
      const localParsed = parsePortugueseSchedulePrompt(text);

      // Enrich title/description with Gemini API if available (non-blocking fallback)
      let apiParsed: Partial<CalendarEvent> | null = null;
      try {
        apiParsed = await parseNaturalLanguageEvent(text);
      } catch (err) {
        apiParsed = null;
      }

      const hasExplicitTimeInText =
        /(?:[àa]s\s+)?\d{1,2}[:h]\d{2}\b|\b([01]?\d|2[0-3])\s+([0-5]\d)\b|(?:[àa]s\s+)\d{1,2}h?\b/i.test(
          text
        );
      const hasExplicitDateInText =
        /\d{1,2}\/\d{1,2}|\bamanh[ãa]\b|\bhoje\b|\bdepois\s+de\s+amanh[ãa]\b/i.test(text);

      const finalDate = hasExplicitDateInText
        ? localParsed.date
        : apiParsed?.date || localParsed.date;
      const finalStart = hasExplicitTimeInText
        ? localParsed.startTime
        : apiParsed?.startTime || localParsed.startTime;
      const finalEnd = hasExplicitTimeInText
        ? localParsed.endTime
        : apiParsed?.endTime || addMinutesToTime(finalStart, 60);

      const cleanTitle =
        localParsed.title.length >= 3
          ? localParsed.title
          : apiParsed?.title || localParsed.title;

      const newEvent: CalendarEvent = {
        id: 'evt-' + Date.now(),
        title: cleanTitle,
        date: finalDate,
        startTime: finalStart,
        endTime: finalEnd,
        category: (apiParsed?.category as CalendarEvent['category']) || localParsed.category,
        location: apiParsed?.location || 'A definir',
        description: apiParsed?.description || `Agendado via chat com ${config.name}: "${text}"`,
        priority: localParsed.priority,
        status: 'confirmed',
        callMe: localParsed.callMe,
        callMinutesBefore: localParsed.callMinutesBefore,
      };

      onAddEvent(newEvent);

      let assistantReply = `Agendado! "${newEvent.title}" para ${formatEventDateTag(newEvent.date).toLowerCase()} às ${newEvent.startTime}.`;
      if (newEvent.callMe) {
        const callHour = getEventCallTimeLabel(newEvent.startTime, newEvent.callMinutesBefore ?? 0);
        if ((newEvent.callMinutesBefore ?? 0) > 0) {
          assistantReply = `Agendado! Vou te ligar às ${callHour}, ${formatMinutesLabel(newEvent.callMinutesBefore)} do compromisso.`;
        } else {
          assistantReply = `Agendado! Vou te ligar às ${callHour}, no horário exato do compromisso.`;
        }
      }

      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'assistant',
        content: assistantReply,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        eventId: newEvent.id,
      };

      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextareaPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            onOpenPhotoUpload(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onOpenPhotoUpload(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section
      aria-label="Assistente de Agendamento Toki"
      className="flex flex-col bg-[#1b1b1e] border border-white/[0.08] rounded-3xl overflow-hidden min-h-[540px] lg:min-h-[640px]"
    >
      {/* Top Chat Header matching reference screenshot 2 */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-white/[0.07] bg-[#1e1e21]">
        <button
          type="button"
          onClick={handleResetChat}
          className="w-10 h-10 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] flex items-center justify-center text-zinc-300 transition-colors"
          title="Novo bate-papo"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center">
          <div className="relative">
            <TokiAvatar size="md" variant="chat" />
          </div>
          <span className="-mt-2 px-2.5 py-0.5 rounded-full bg-[#2a2a2e] border border-white/[0.1] text-[11px] font-semibold text-zinc-100 shadow-sm">
            {config.name}
          </span>
        </div>

        <button
          type="button"
          onClick={onTestNotification}
          className="w-10 h-10 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] flex items-center justify-center text-zinc-300 transition-colors"
          title="Testar alerta de compromisso"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Chat Thread */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5 max-h-[460px]">
        {messages.map((msg) => {
          const linkedEvent = msg.eventId ? events.find((ev) => ev.id === msg.eventId) : undefined;

          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex flex-col items-end gap-1">
                {msg.timestamp && (
                  <span className="text-[11px] text-zinc-500 tabular-nums pr-1">
                    {msg.timestamp}
                  </span>
                )}
                <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-sm bg-[#2a2a2e] border border-white/[0.07] px-4 py-3 text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className="flex flex-col items-start gap-3">
              <p className="text-sm text-zinc-200 leading-relaxed max-w-[92%]">
                {msg.content}
              </p>

              {/* Inline Interactive Event Card matching Screenshot 2 & 5 */}
              {linkedEvent && (
                <div className="w-full max-w-md rounded-2xl bg-[#242427] border border-white/[0.08] p-4 space-y-3">
                  <div
                    onClick={() => onOpenEventInsights(linkedEvent)}
                    className="flex items-start justify-between gap-3 cursor-pointer group"
                  >
                    <h4 className="text-base font-semibold text-white group-hover:text-sky-300 transition-colors leading-snug">
                      {linkedEvent.title}
                    </h4>
                    <span className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    </span>
                  </div>

                  {/* Date + Start ▸ End Time Row */}
                  <div className="flex items-center justify-between text-sm tabular-nums">
                    <span className="font-medium text-sky-400">
                      {formatEventDateTag(linkedEvent.date)}
                    </span>
                    <span className="font-medium text-sky-400">
                      {linkedEvent.startTime} <span className="text-zinc-500 mx-0.5">▸</span> {linkedEvent.endTime}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/[0.07] space-y-2.5">
                    {/* Me Ligue Toggle Row */}
                    <div className="flex items-center justify-between min-h-[36px]">
                      <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                        <Phone className="w-4 h-4 text-zinc-400" />
                        <span>Me Ligue</span>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!linkedEvent.callMe}
                        onClick={() => onToggleEventCallMe(linkedEvent.id, !linkedEvent.callMe)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          linkedEvent.callMe ? 'bg-white' : 'bg-zinc-700'
                        }`}
                        title={
                          linkedEvent.callMe
                            ? 'Ligação ativada para este compromisso'
                            : 'Ativar ligação automática no horário'
                        }
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
                            linkedEvent.callMe
                              ? 'translate-x-6 bg-[#18181b]'
                              : 'translate-x-1 bg-zinc-300'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Reminder Offset Selector Row */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenOffsetEventId(
                            openOffsetEventId === linkedEvent.id ? null : linkedEvent.id
                          )
                        }
                        className="w-full flex items-center justify-between gap-2 py-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <Bell className="w-4 h-4 text-zinc-500" />
                          <span>{formatMinutesLabel(linkedEvent.callMinutesBefore ?? 0)}</span>
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                      </button>

                      {openOffsetEventId === linkedEvent.id && (
                        <div className="mt-1.5 rounded-xl bg-[#1b1b1e] border border-white/[0.1] py-1 shadow-xl z-20">
                          {CALL_OFFSET_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                onUpdateEventCallOffset(linkedEvent.id, opt.value);
                                setOpenOffsetEventId(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                                (linkedEvent.callMinutesBefore ?? 0) === opt.value
                                  ? 'text-sky-400 bg-white/[0.05] font-semibold'
                                  : 'text-zinc-300 hover:bg-white/[0.04]'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {linkedEvent.callMe && (
                                <span className="text-[11px] text-zinc-500 tabular-nums">
                                  às {getEventCallTimeLabel(linkedEvent.startTime, opt.value)}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick action pill like "Ver meus eventos de hoje" */}
              {linkedEvent && (
                <button
                  type="button"
                  onClick={onViewTodayEvents}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#242427] hover:bg-[#2c2c30] border border-white/[0.08] text-xs font-medium text-zinc-200 transition-colors min-h-[40px]"
                >
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <span>Ver meus eventos de hoje</span>
                </button>
              )}
            </div>
          );
        })}

        {isSubmitting && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-300" />
            <span>{config.name} agendando compromisso...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Spacious Multi-Line Composer ("Mensagem Toki") */}
      <div className="p-3 sm:p-4 border-t border-white/[0.07] bg-[#1b1b1e]">
        <form
          onSubmit={handleSend}
          className="rounded-2xl bg-[#242427] border border-white/[0.09] focus-within:border-white/[0.2] transition-colors p-3 sm:p-4 flex flex-col gap-3"
        >
          <textarea
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handleTextareaPaste}
            placeholder={`Mensagem ${config.name} — ex: Reunião com diretoria amanhã às 15:00 me ligue 5 minutos antes (ou Ctrl+V para colar foto)`}
            rows={3}
            className="w-full min-h-[84px] bg-transparent text-sm sm:text-base text-white placeholder-zinc-500 outline-none resize-none leading-relaxed"
          />

          {/* Composer Footer Toolbar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Plus Menu Button */}
              <div className="relative" ref={plusMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                  className="w-10 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] flex items-center justify-center text-zinc-200 transition-colors"
                  title="Mais opções: formulário completo ou foto do evento"
                >
                  <Plus className="w-5 h-5" />
                </button>

                {isPlusMenuOpen && (
                  <div className="absolute left-0 bottom-full mb-2 w-60 rounded-2xl bg-[#26262a] border border-white/[0.1] shadow-2xl p-1.5 z-30">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        onOpenDetailedWrite();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] text-left text-xs font-medium text-zinc-100"
                    >
                      <PenTool className="w-4 h-4 text-sky-400" />
                      <span>Formulário completo de evento</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        onOpenPhotoUpload();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] text-left text-xs font-medium text-zinc-100"
                    >
                      <Clipboard className="w-4 h-4 text-emerald-400" />
                      <span>Colar foto do evento (Ctrl+V)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[0.06] text-left text-xs font-medium text-zinc-100"
                    >
                      <ImageIcon className="w-4 h-4 text-zinc-300" />
                      <span>Enviar imagem / print</span>
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFilePicked}
                  className="hidden"
                />
              </div>

              {/* Rápido / Detalhado Mode Selector */}
              <button
                type="button"
                onClick={() => {
                  if (composerMode === 'rapido') {
                    setComposerMode('detalhado');
                    onOpenDetailedWrite();
                  } else {
                    setComposerMode('rapido');
                  }
                }}
                className="flex items-center gap-1.5 px-3 h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] text-xs font-medium text-zinc-200 transition-colors"
                title="Alternar entre agendamento rápido por texto ou formulário detalhado"
              >
                <span>{composerMode === 'rapido' ? 'Rápido' : 'Detalhado'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              {/* Quick Photo Button directly accessible */}
              <button
                type="button"
                onClick={() => onOpenPhotoUpload()}
                className="hidden sm:flex items-center gap-1.5 px-3 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-xs font-medium text-zinc-300 transition-colors"
                title="Colar foto ou print de convite"
              >
                <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Colar Foto</span>
              </button>
            </div>

            {/* Right Controls: Send + Mic */}
            <div className="flex items-center gap-2">
              {composerText.trim() ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center gap-1.5 px-4 h-10 rounded-xl ${currentTheme.primaryBtn} text-xs sm:text-sm font-medium transition-colors disabled:opacity-50`}
                >
                  <span>Agendar</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={onOpenVoice}
                className="w-11 h-10 rounded-xl bg-[#2d2d32] hover:bg-[#36363c] border border-white/[0.1] flex items-center justify-center text-zinc-100 transition-colors"
                title={`Falar com ${config.name} por voz`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
};
