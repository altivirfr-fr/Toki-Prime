import React, { useState } from 'react';
import { Volume2, Pause, PhoneCall } from 'lucide-react';
import { AssistantConfig, CalendarEvent, ExecutiveTask } from '../types';
import { speakText, getAudioBriefingScript } from '../services/geminiService';
import { getTheme } from '../utils/theme';
import { getLocalDateString } from '../utils/dateUtils';

interface DailyBriefingCardProps {
  config: AssistantConfig;
  events: CalendarEvent[];
  tasks: ExecutiveTask[];
  onOpenCall: () => void;
}

export const DailyBriefingCard: React.FC<DailyBriefingCardProps> = ({
  config,
  events,
  tasks,
  onOpenCall,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [speakerHandle, setSpeakerHandle] = useState<{ cancel: () => void } | null>(null);
  const currentTheme = getTheme(config.auraColor);

  const today = getLocalDateString(0);
  const todayEvents = events.filter((e) => e.date === today);
  const meetingsCount = todayEvents.filter((e) => e.category === 'meeting').length;
  const focusCount = todayEvents.filter((e) => e.category === 'focus').length;

  const focusScore = Math.min(
    95,
    Math.max(65, 75 + focusCount * 6 - (meetingsCount > 4 ? (meetingsCount - 4) * 8 : 0))
  );
  const completedTasks = tasks.filter((t) => t.completed).length;

  const handlePlayAudio = async () => {
    if (isPlayingAudio && speakerHandle) {
      speakerHandle.cancel();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    const script = await getAudioBriefingScript(todayEvents, tasks, config.name);
    const handle = speakText(script, config.language, config.voiceSpeed, () => {
      setIsPlayingAudio(false);
    });
    setSpeakerHandle(handle);
  };

  return (
    <div className="rounded-2xl bg-[#1e1e21] border border-white/[0.08] p-5 sm:p-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Summary & Actions */}
        <div className="flex-1 space-y-2.5">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Briefing Executivo Diário
          </div>

          <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            {todayEvents.length} compromisso{todayEvents.length === 1 ? '' : 's'} hoje e{' '}
            {tasks.length} tarefa{tasks.length === 1 ? '' : 's'} na fila
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">
            {focusCount > 0
              ? `${focusCount} bloco(s) de foco reservado(s) para trabalho contínuo sem interrupções.`
              : 'Considere reservar um bloco de 60–90 minutos para trabalho profundo hoje.'}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handlePlayAudio}
              className={`flex items-center gap-2 px-4 h-10 rounded-xl ${currentTheme.primaryBtn} font-medium text-xs sm:text-sm transition-colors`}
            >
              {isPlayingAudio ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pausar Resumo</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Ouvir Briefing</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenCall}
              className="flex items-center gap-2 px-4 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.09] text-zinc-100 font-medium text-xs sm:text-sm transition-colors tabular-nums"
            >
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>Receber Ligação ({config.scheduledCallTime || '08:30'})</span>
            </button>
          </div>
        </div>

        {/* Right: Clean Neutral Metrics */}
        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
          <div className="p-3.5 rounded-xl bg-[#141416] border border-white/[0.07] text-center">
            <span className="text-[11px] font-medium text-zinc-400 block">Foco</span>
            <div className="text-xl font-semibold text-white mt-1 tabular-nums">
              {focusScore}
              <span className="text-xs text-zinc-500 font-normal">/100</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141416] border border-white/[0.07] text-center">
            <span className="text-[11px] font-medium text-zinc-400 block">Hoje</span>
            <div className="text-xl font-semibold text-sky-400 mt-1 tabular-nums">
              {todayEvents.length}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#141416] border border-white/[0.07] text-center">
            <span className="text-[11px] font-medium text-zinc-400 block">Tarefas</span>
            <div className="text-xl font-semibold text-white mt-1 tabular-nums">
              {completedTasks}/{tasks.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
