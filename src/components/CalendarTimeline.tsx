import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Users,
  Calendar,
  AlertTriangle,
  FileText,
  Mail,
  ExternalLink,
  Download,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronDown,
  Phone,
  Bell,
} from 'lucide-react';
import { CalendarEvent, AuraColor } from '../types';
import { downloadIcsFile, getGoogleCalendarUrl } from '../utils/calendarExport';
import { getTheme } from '../utils/theme';
import { getLocalDateString, formatLocalDateFromDate } from '../utils/dateUtils';

export type PriorityFilter = 'all' | 'high' | 'medium' | 'low';

export interface PriorityBadgeConfig {
  label: string;
  shortLabel: string;
  dot: string;
  text: string;
}

export const getPriorityConfig = (priority?: 'high' | 'medium' | 'low'): PriorityBadgeConfig => {
  switch (priority) {
    case 'high':
      return {
        label: 'Alta prioridade',
        shortLabel: 'Alta',
        dot: 'bg-rose-400',
        text: 'text-rose-400',
      };
    case 'low':
      return {
        label: 'Baixa prioridade',
        shortLabel: 'Baixa',
        dot: 'bg-sky-400',
        text: 'text-sky-400',
      };
    case 'medium':
    default:
      return {
        label: 'Média prioridade',
        shortLabel: 'Média',
        dot: 'bg-amber-400',
        text: 'text-amber-400',
      };
  }
};

const CALL_OFFSET_OPTIONS = [
  { value: 0, label: 'No horário do evento' },
  { value: 1, label: '1 min antes' },
  { value: 5, label: '5 min antes' },
  { value: 15, label: '15 min antes' },
  { value: 30, label: '30 min antes' },
];

interface CalendarTimelineProps {
  events: CalendarEvent[];
  selectedDate: string;
  isGoogleConnected?: boolean;
  auraColor?: AuraColor;
  onSelectDate: (date: string) => void;
  onOpenInsights: (event: CalendarEvent) => void;
  onOpenDossier: (event: CalendarEvent) => void;
  onOpenOutreach: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onResolveConflicts: () => void;
  onUpdatePriority?: (eventId: string, priority: 'high' | 'medium' | 'low') => void;
  onToggleCallMe?: (eventId: string, callMe: boolean) => void;
  onUpdateCallOffset?: (eventId: string, minutesBefore: number) => void;
}

export const CalendarTimeline: React.FC<CalendarTimelineProps> = ({
  events,
  selectedDate,
  auraColor,
  onSelectDate,
  onOpenInsights,
  onOpenDossier,
  onOpenOutreach,
  onDeleteEvent,
  onResolveConflicts,
  onUpdatePriority,
  onToggleCallMe,
  onUpdateCallOffset,
}) => {
  const [viewMode, setViewMode] = useState<'day' | 'list'>('day');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [activePriorityMenuId, setActivePriorityMenuId] = useState<string | null>(null);
  const currentTheme = getTheme(auraColor);
  const priorityMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(e.target as Node)) {
        setActivePriorityMenuId(null);
      }
    };
    if (activePriorityMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePriorityMenuId]);

  const dayEvents = events.filter((e) => e.date === selectedDate);
  const sortedDayEvents = [...dayEvents].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const highCount = dayEvents.filter((e) => (e.priority || 'medium') === 'high').length;
  const mediumCount = dayEvents.filter((e) => (e.priority || 'medium') === 'medium').length;
  const lowCount = dayEvents.filter((e) => e.priority === 'low').length;

  const visibleDayEvents = sortedDayEvents.filter((e) => {
    if (priorityFilter === 'all') return true;
    return (e.priority || 'medium') === priorityFilter;
  });

  const visibleEventsForList = [...events]
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
    .filter((e) => {
      if (priorityFilter === 'all') return true;
      return (e.priority || 'medium') === priorityFilter;
    });

  const hasConflicts = sortedDayEvents.some((e) => e.isConflict);

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    onSelectDate(formatLocalDateFromDate(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    onSelectDate(formatLocalDateFromDate(d));
  };

  const handleToday = () => {
    onSelectDate(getLocalDateString(0));
  };

  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'focus':
        return 'Foco';
      case 'networking':
        return 'Networking';
      case 'personal':
        return 'Pessoal';
      default:
        return 'Reunião';
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#1e1e21] border border-white/[0.08] rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 flex items-center justify-center transition-colors"
            title="Dia anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-sky-400 transition-colors"
          >
            Hoje
          </button>

          <span className="text-sm font-semibold text-white capitalize pl-1">
            {formatDateDisplay(selectedDate)}
          </span>

          <button
            type="button"
            onClick={handleNextDay}
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 flex items-center justify-center transition-colors"
            title="Próximo dia"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-[#141416] p-1 rounded-xl border border-white/[0.07] text-xs">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'day' ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Dia
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'list' ? 'bg-white/[0.1] text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Priority Filter Bar (uncluttered single row) */}
      <div className="flex flex-wrap items-center gap-1.5 px-1">
        {(
          [
            { id: 'all', label: `Todos (${dayEvents.length})`, dot: '' },
            { id: 'high', label: `Alta (${highCount})`, dot: 'bg-rose-400' },
            { id: 'medium', label: `Média (${mediumCount})`, dot: 'bg-amber-400' },
            { id: 'low', label: `Baixa (${lowCount})`, dot: 'bg-sky-400' },
          ] as const
        ).map((item) => {
          const active = priorityFilter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPriorityFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-colors ${
                active
                  ? 'bg-white/[0.1] border-white/[0.16] text-white'
                  : 'bg-[#1e1e21] border-white/[0.06] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {item.dot && <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />}
              <span className="tabular-nums">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conflict Alert */}
      {hasConflicts && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#241b1d] border border-rose-500/25 text-zinc-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-white">
                Sobreposição de horário detectada
              </p>
              <p className="text-xs text-zinc-400">
                Existem dois compromissos no mesmo horário hoje.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResolveConflicts}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Resolver com Toki Prime</span>
          </button>
        </div>
      )}

      {/* Day Timeline List */}
      {viewMode === 'day' ? (
        <div className="space-y-3">
          {visibleDayEvents.length === 0 ? (
            <div className="py-12 px-4 rounded-2xl bg-[#1e1e21] border border-white/[0.07] text-center">
              <Calendar className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
              <p className="text-sm font-medium text-zinc-300">
                {priorityFilter === 'all'
                  ? 'Nenhum compromisso para esta data'
                  : 'Nenhum compromisso com este nível de prioridade'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Escreva no campo de conversa ao lado para agendar em segundos.
              </p>
            </div>
          ) : (
            visibleDayEvents.map((event) => {
              const priorityConf = getPriorityConfig(event.priority);

              return (
                <div
                  key={event.id}
                  onClick={() => onOpenInsights(event)}
                  className={`p-4 rounded-2xl bg-[#1e1e21] border transition-colors cursor-pointer group ${
                    event.isConflict
                      ? 'border-rose-500/35 hover:border-rose-400/50'
                      : `${currentTheme.borderAccent}`
                  }`}
                >
                  {/* Top Unboxed Metadata Row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-xs tabular-nums flex-wrap">
                      <span className="font-semibold text-sky-400">
                        {event.startTime} <span className="text-zinc-600">▸</span> {event.endTime}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-400">{getCategoryLabel(event.category)}</span>
                      <span className="text-zinc-600">·</span>

                      {/* Interactive Priority Selector */}
                      <div
                        className="relative inline-flex"
                        ref={activePriorityMenuId === event.id ? priorityMenuRef : null}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onUpdatePriority) {
                              setActivePriorityMenuId(
                                activePriorityMenuId === event.id ? null : event.id
                              );
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 font-medium ${priorityConf.text} hover:opacity-80 transition-opacity`}
                          title="Alterar prioridade"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityConf.dot}`} />
                          <span>{priorityConf.shortLabel}</span>
                          {onUpdatePriority && <ChevronDown className="w-3 h-3 opacity-70" />}
                        </button>

                        {activePriorityMenuId === event.id && onUpdatePriority && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-full mt-1.5 z-40 w-44 bg-[#26262a] border border-white/[0.1] rounded-xl shadow-2xl py-1"
                          >
                            {(['high', 'medium', 'low'] as const).map((p) => {
                              const conf = getPriorityConfig(p);
                              const isSelected = (event.priority || 'medium') === p;
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => {
                                    onUpdatePriority(event.id, p);
                                    setActivePriorityMenuId(null);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-white/[0.06] ${
                                    isSelected ? 'text-white font-semibold' : 'text-zinc-300'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
                                    <span>{conf.label}</span>
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {event.syncedWithGoogle && (
                        <>
                          <span className="text-zinc-600">·</span>
                          <span className="text-emerald-400">Google</span>
                        </>
                      )}
                    </div>

                    {/* Hover Actions */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInsights(event);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.07] text-zinc-400 hover:text-white transition-colors"
                        title="AI Meeting Insights"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDossier(event);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.07] text-zinc-400 hover:text-white transition-colors"
                        title="Dossiê da Reunião"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenOutreach(event);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.07] text-zinc-400 hover:text-white transition-colors"
                        title="Redigir Convite / WhatsApp"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={event.googleHtmlLink || getGoogleCalendarUrl(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg hover:bg-white/[0.07] text-zinc-400 hover:text-white transition-colors"
                        title="Abrir no Google Agenda"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadIcsFile([event], `${event.title.slice(0, 20)}.ics`);
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/[0.07] text-zinc-400 hover:text-white transition-colors"
                        title="Exportar .ICS"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEvent(event.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/15 text-zinc-400 hover:text-rose-400 transition-colors"
                        title="Remover compromisso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-white group-hover:text-sky-300 transition-colors leading-snug">
                    {event.title}
                  </h3>

                  {/* Location / Attendees */}
                  {(event.location || (event.attendees && event.attendees.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 mt-1.5">
                      {event.location && (
                        <span className="flex items-center gap-1.5 truncate max-w-xs">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          {event.location}
                        </span>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <span className="flex items-center gap-1.5 truncate max-w-xs">
                          <Users className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          {event.attendees.length} participante{event.attendees.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Me Ligue Inline Toggle + Offset Row (matching Toki card ergonomics) */}
                  {onToggleCallMe && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 text-xs text-zinc-300">
                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Me Ligue</span>
                        {event.callMe && onUpdateCallOffset && (
                          <div className="flex items-center gap-1 text-zinc-400 ml-1">
                            <Bell className="w-3 h-3 text-zinc-500" />
                            <select
                              value={event.callMinutesBefore ?? 0}
                              onChange={(e) =>
                                onUpdateCallOffset(event.id, parseInt(e.target.value, 10))
                              }
                              className="bg-transparent text-xs text-sky-400 outline-none cursor-pointer"
                            >
                              {CALL_OFFSET_OPTIONS.map((opt) => (
                                <option
                                  key={opt.value}
                                  value={opt.value}
                                  className="bg-[#1e1e21] text-zinc-200"
                                >
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!event.callMe}
                        onClick={() => onToggleCallMe(event.id, !event.callMe)}
                        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                          event.callMe ? 'bg-white' : 'bg-zinc-700'
                        }`}
                        title={event.callMe ? 'Desativar ligação' : 'Ativar ligação do Toki Prime'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                            event.callMe
                              ? 'translate-x-5 bg-[#18181b]'
                              : 'translate-x-1 bg-zinc-300'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-[#1e1e21] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06]">
          {visibleEventsForList.length === 0 ? (
            <div className="py-10 text-center text-xs text-zinc-500">
              Nenhum evento encontrado.
            </div>
          ) : (
            visibleEventsForList.map((event) => {
              const priorityConf = getPriorityConfig(event.priority);
              return (
                <div
                  key={event.id}
                  onClick={() => onOpenInsights(event)}
                  className="px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 shrink-0 text-xs tabular-nums">
                      <span className="text-zinc-500 block">{event.date.slice(5)}</span>
                      <span className="text-sky-400 font-medium block">{event.startTime}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">{event.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className={`inline-flex items-center gap-1 ${priorityConf.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityConf.dot}`} />
                          {priorityConf.shortLabel}
                        </span>
                        <span>·</span>
                        <span className="truncate">{event.location || 'Online'}</span>
                      </div>
                    </div>
                  </div>

                  {onToggleCallMe && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!event.callMe}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCallMe(event.id, !event.callMe);
                      }}
                      className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors shrink-0 ${
                        event.callMe ? 'bg-white' : 'bg-zinc-700'
                      }`}
                      title="Me Ligue"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                          event.callMe
                            ? 'translate-x-5 bg-[#18181b]'
                            : 'translate-x-1 bg-zinc-300'
                        }`}
                      />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
