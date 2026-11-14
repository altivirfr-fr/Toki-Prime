import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Volume2, VolumeX, Calendar } from 'lucide-react';
import { AssistantConfig, CalendarEvent, ExecutiveTask } from '../types';
import { getAudioBriefingScript, speakText } from '../services/geminiService';
import { playPhoneRingSound } from '../services/callSchedulerService';
import { TokiAvatar } from './TokiAvatar';
import { getLocalDateString } from '../utils/dateUtils';

interface IncomingCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AssistantConfig;
  events: CalendarEvent[];
  tasks: ExecutiveTask[];
  callReason?: 'scheduled' | 'manual';
  event?: CalendarEvent | null;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  isOpen,
  onClose,
  config,
  events,
  tasks,
  callReason = 'scheduled',
  event = null,
}) => {
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [callDuration, setCallDuration] = useState(0);
  const [briefingScript, setBriefingScript] = useState('');
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakerCancelRef = useRef<{ cancel: () => void } | null>(null);

  const cleanup = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (speakerCancelRef.current) {
      speakerCancelRef.current.cancel();
      speakerCancelRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCallState('ringing');
      setCallDuration(0);
      setIsMuted(false);

      if (event) {
        const offset = event.callMinutesBefore ?? 0;
        const offsetPhrase =
          offset > 0
            ? `faltam ${offset} ${offset === 1 ? 'minuto' : 'minutos'} para começar`
            : 'está começando agora';
        const locationText = event.location ? ` Local: ${event.location}.` : '';
        const eventScript = `Olá! Aqui é o ${config.name}. Este é seu lembrete por ligação: ${event.title}, às ${event.startTime}, ${offsetPhrase}.${locationText} Deseja que eu prepare o dossiê da pauta?`;
        setBriefingScript(eventScript);
        setIsLoadingScript(false);
      } else {
        setIsLoadingScript(true);
        getAudioBriefingScript(events, tasks, config.name)
          .then((script) => {
            setBriefingScript(script);
            setIsLoadingScript(false);
          })
          .catch(() => {
            setBriefingScript(
              `Olá! Aqui é o ${config.name}. Sua agenda está organizada e seus compromissos prioritários de hoje estão prontos para revisão.`
            );
            setIsLoadingScript(false);
          });
      }

      playPhoneRingSound();
      ringIntervalRef.current = setInterval(() => {
        playPhoneRingSound();
      }, 2800);
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen, event?.id]);

  // Call duration counter
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      if (speakerCancelRef.current) {
        speakerCancelRef.current.cancel();
        speakerCancelRef.current = null;
      }
    } else if (callState === 'ringing' && !ringIntervalRef.current) {
      playPhoneRingSound();
      ringIntervalRef.current = setInterval(() => {
        playPhoneRingSound();
      }, 2800);
    } else if (callState === 'connected' && briefingScript) {
      speakerCancelRef.current = speakText(briefingScript, config.language, config.voiceSpeed);
    }
  };

  const handleAnswer = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    setCallState('connected');

    if (!isMuted && briefingScript) {
      speakerCancelRef.current = speakText(
        briefingScript,
        config.language,
        config.voiceSpeed
      );
    }
  };

  const handleDeclineOrHangup = () => {
    cleanup();
    setCallState('ended');
    setTimeout(() => {
      onClose();
    }, 250);
  };

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatCallEventDate = (dateStr: string) => {
    const today = getLocalDateString(0);
    const tomorrow = getLocalDateString(1);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
    if (dateStr === today) return `Hoje (${weekday})`;
    if (dateStr === tomorrow) return `Amanhã (${weekday})`;
    return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')} (${weekday})`;
  };

  const headerTitle = event ? event.title : `Briefing Diário · ${config.name}`;
  const pillSummary = event
    ? `Lembrete do ${config.name} · ${event.title} | ${formatCallEventDate(event.date)}, ${event.startTime} - ${event.endTime}`
    : callReason === 'scheduled'
    ? `Lembrete do ${config.name} · Daily Briefing (${config.scheduledCallTime || '08:30'})`
    : `Chamada do ${config.name}`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#101a32] text-white px-5 py-8 sm:py-12 animate-in fade-in duration-200 select-none"
      role="dialog"
      aria-modal="true"
      aria-label={`Ligação do ${config.name}`}
    >
      {/* Top Notification Pill matching Toki reference */}
      <div className="w-full max-w-md flex flex-col items-center gap-2">
        <p className="text-xs font-medium text-white/60 tracking-wide">
          {callState === 'ringing'
            ? 'Chamada recebida'
            : callState === 'connected'
            ? `Em chamada · ${formatDuration(callDuration)}`
            : 'Chamada encerrada'}
        </p>

        <div className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/[0.1] border border-white/[0.12] backdrop-blur-md shadow-lg">
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 overflow-hidden">
            <TokiAvatar size="xs" variant="ghost" className="text-[#18181b] w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-white/95 truncate tabular-nums">
            {pillSummary}
          </span>
        </div>
      </div>

      {/* Center Mascot & Event Title */}
      <div className="flex flex-col items-center text-center my-auto py-6 max-w-md w-full">
        <div className="relative flex items-center justify-center mb-7">
          {callState === 'ringing' && !isMuted && (
            <div className="absolute w-40 h-40 rounded-full border border-white/15 animate-ping" />
          )}
          <TokiAvatar size="xl" variant="call" className="relative z-10 w-32 h-32 sm:w-36 sm:h-36" />
        </div>

        <div className="flex items-center justify-center gap-2.5 px-4">
          <span className="w-7 h-7 rounded-md bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-sky-300" />
          </span>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight leading-snug">
            {headerTitle}
          </h2>
        </div>

        <p className="text-sm text-white/60 mt-1.5 font-normal">
          Ligação do {config.name}
        </p>

        {callState === 'connected' && (
          <div className="mt-6 w-full rounded-2xl bg-white/[0.06] border border-white/[0.1] p-4 text-left animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-medium text-sky-300 mb-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isMuted ? 'Áudio silenciado' : `${config.name} falando`}</span>
            </div>
            <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
              {briefingScript || 'Preparando resumo...'}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Controls: Recusar / Atender / Silenciar */}
      <div className="w-full max-w-xs flex flex-col items-center gap-7 pb-2">
        {callState === 'ringing' ? (
          <div className="w-full flex items-center justify-around gap-8">
            {/* Recusar */}
            <button
              type="button"
              onClick={handleDeclineOrHangup}
              className="flex flex-col items-center gap-2.5 group active:scale-95 transition-transform"
            >
              <div className="w-[72px] h-[72px] rounded-2xl bg-[#ef5350] hover:bg-[#e53935] text-white flex items-center justify-center shadow-lg shadow-black/30 transition-colors">
                <PhoneOff className="w-7 h-7" />
              </div>
              <span className="text-sm font-medium text-white/85">Recusar</span>
            </button>

            {/* Atender */}
            <button
              type="button"
              onClick={handleAnswer}
              disabled={isLoadingScript}
              className="flex flex-col items-center gap-2.5 group active:scale-95 transition-transform disabled:opacity-60"
            >
              <div className="w-[72px] h-[72px] rounded-2xl bg-[#27c26c] hover:bg-[#22b061] text-white flex items-center justify-center shadow-lg shadow-black/30 transition-colors">
                <Phone className="w-7 h-7" />
              </div>
              <span className="text-sm font-medium text-white/85">
                {isLoadingScript ? 'Conectando' : 'Atender'}
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleDeclineOrHangup}
            className="flex flex-col items-center gap-2.5 active:scale-95 transition-transform"
          >
            <div className="w-[72px] h-[72px] rounded-2xl bg-[#ef5350] hover:bg-[#e53935] text-white flex items-center justify-center shadow-lg shadow-black/30 transition-colors">
              <PhoneOff className="w-7 h-7" />
            </div>
            <span className="text-sm font-medium text-white/85">Encerrar</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleToggleMute}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/65 hover:text-white hover:bg-white/[0.06] transition-colors min-h-[44px]"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-rose-300" />
              <span>Som silenciado</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4" />
              <span>Silenciar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
