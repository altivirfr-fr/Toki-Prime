import React, { useState } from 'react';
import { 
  Sparkles, 
  PenTool, 
  Clipboard, 
  Mic, 
  Send, 
  Plus, 
  Calendar as CalendarIcon,
  Wand2
} from 'lucide-react';
import { CalendarEvent, AuraColor } from '../types';
import { parseNaturalLanguageEvent } from '../services/geminiService';
import { getTheme } from '../utils/theme';
import { getLocalDateString } from '../utils/dateUtils';

interface ExecutiveQuickBarProps {
  auraColor?: AuraColor;
  onAddEvent: (event: CalendarEvent) => void;
  onOpenWriteModal: () => void;
  onOpenPasteModal: () => void;
  onOpenVoice: () => void;
}

export const ExecutiveQuickBar: React.FC<ExecutiveQuickBarProps> = ({
  auraColor,
  onAddEvent,
  onOpenWriteModal,
  onOpenPasteModal,
  onOpenVoice,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentTheme = getTheme(auraColor);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsSubmitting(true);
    try {
      const parsed = await parseNaturalLanguageEvent(inputText);
      const today = getLocalDateString();

      const newEvt: CalendarEvent = {
        id: 'quick-' + Date.now(),
        title: parsed.title || inputText.trim(),
        date: parsed.date || today,
        startTime: parsed.startTime || '14:00',
        endTime: parsed.endTime || '15:00',
        category: parsed.category || 'meeting',
        location: parsed.location || 'Google Meet',
        attendees: parsed.attendees || [],
        description: parsed.description || `Criado via entrada rápida: "${inputText}"`,
        priority: 'high',
        status: 'confirmed',
      };

      onAddEvent(newEvt);
      setInputText('');
    } catch (err) {
      console.warn('Quick bar parse error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border ${currentTheme.borderAccent} rounded-3xl p-3 sm:p-4 shadow-xl transition-colors`}>
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        
        {/* Main Quick-Write Form */}
        <form onSubmit={handleQuickSubmit} className={`flex-1 flex items-center gap-2 bg-slate-950/80 border border-slate-800/90 rounded-2xl px-3.5 py-2 ${currentTheme.borderFocus} transition-colors`}>
          <PenTool className={`w-4 h-4 ${currentTheme.textAccent} shrink-0`} />
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="✍️ Escreva seu compromisso (ex: 'Almoço amanhã 13h no Fasano') ou cole uma foto (Ctrl+V)..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSubmitting}
            className={`p-1.5 rounded-xl ${currentTheme.primaryBtn} disabled:opacity-40 transition-all shrink-0`}
            title="Agendar diretamente"
          >
            {isSubmitting ? <Wand2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Button: Colar Foto (Ctrl+V) */}
          <button
            type="button"
            onClick={onOpenPasteModal}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all active:scale-95 group"
            title="Colar foto ou print de convite (Ctrl+V)"
          >
            <Clipboard className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Colar Foto (Ctrl+V)</span>
          </button>

          {/* Button: Escrever com Detalhes */}
          <button
            type="button"
            onClick={onOpenWriteModal}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl ${currentTheme.secondaryBtn} text-xs font-semibold transition-all active:scale-95`}
            title="Abrir formulário de escrita com todos os campos"
          >
            <Plus className={`w-3.5 h-3.5 ${currentTheme.textAccent}`} />
            <span>Escrever</span>
          </button>

        </div>

      </div>
    </div>
  );
};
