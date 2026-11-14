import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Target, 
  ListChecks, 
  AlertTriangle, 
  Clock, 
  Check, 
  Copy, 
  Share2 
} from 'lucide-react';
import { CalendarEvent, MeetingDossier } from '../types';
import { generateMeetingDossier } from '../services/geminiService';

interface MeetingPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
}

export const MeetingPrepModal: React.FC<MeetingPrepModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [dossier, setDossier] = useState<MeetingDossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setLoading(true);
      generateMeetingDossier(event)
        .then((data) => {
          setDossier(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const handleCopySummary = () => {
    if (!dossier) return;
    const text = `📋 DOSSIÊ EXECUTIVO: ${event.title}\n\n🎯 Objetivo:\n${dossier.objective}\n\n💬 Pautas & Talking Points:\n${dossier.talkingPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n⚠️ Riscos a mitigar:\n${dossier.potentialObstacles.join('\n')}\n\n🏁 Resultado Desejado:\n${dossier.desiredOutcome}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  Meeting Prep Dossier
                </span>
                <span className="text-xs text-slate-400">{event.startTime} - {event.endTime}</span>
              </div>
              <h2 className="text-lg font-bold text-white font-heading mt-1">
                {event.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs"
              title="Copiar Dossiê"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-indigo-300 font-medium animate-pulse">
              Toki gerando inteligência e tópicos estratégicos para esta reunião...
            </p>
          </div>
        ) : dossier ? (
          <div className="my-5 space-y-5 animate-in fade-in">
            
            {/* Objective */}
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                <Target className="w-4 h-4" />
                Objetivo Central da Reunião
              </div>
              <p className="text-sm font-medium text-slate-100 leading-relaxed">
                {dossier.objective}
              </p>
            </div>

            {/* Talking points */}
            <div>
              <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2.5">
                <ListChecks className="w-4 h-4 text-emerald-400" />
                Pautas & Pontos Críticos para Apresentar
              </div>
              <div className="space-y-2">
                {dossier.talkingPoints.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Allocation */}
            {dossier.suggestedTimeAllocation?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Divisão de Tempo Sugerida
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {dossier.suggestedTimeAllocation.map((phase, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center"
                    >
                      <span className="text-lg font-bold text-cyan-300 font-heading block">
                        {phase.minutes} min
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {phase.phase}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Obstacles & Desired outcome */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Riscos / Desafios
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {dossier.potentialObstacles.map((obs, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Check className="w-4 h-4" />
                  Resultado Esperado
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {dossier.desiredOutcome}
                </p>
              </div>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
};
