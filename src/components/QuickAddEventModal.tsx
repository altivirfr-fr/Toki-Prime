import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Clock, 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  Plus, 
  Wand2, 
  Clipboard, 
  Image as ImageIcon, 
  UploadCloud, 
  Check, 
  FileText,
  PenTool,
  RefreshCw,
  Camera
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CalendarEvent, EventCategory } from '../types';
import { parseNaturalLanguageEvent, parseScreenshotImage } from '../services/geminiService';
import { getLocalDateString } from '../utils/dateUtils';

interface QuickAddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (event: CalendarEvent) => void;
  defaultDate?: string;
  initialMode?: 'write' | 'paste_photo';
  initialPastedImage?: string | null; // Base64 data URL if pasted globally
}

export const QuickAddEventModal: React.FC<QuickAddEventModalProps> = ({
  isOpen,
  onClose,
  onAddEvent,
  defaultDate,
  initialMode = 'write',
  initialPastedImage = null,
}) => {
  const [activeTab, setActiveTab] = useState<'write' | 'paste_photo'>(initialMode);
  const [naturalText, setNaturalText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || getLocalDateString());
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [category, setCategory] = useState<EventCategory>('meeting');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [location, setLocation] = useState('Google Meet');
  const [attendees, setAttendees] = useState('');
  const [description, setDescription] = useState('');

  // Paste Photo state
  const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial mode and pasted image when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      if (initialPastedImage) {
        setPastedImagePreview(initialPastedImage);
        processBase64Image(initialPastedImage);
      }
    } else {
      // Reset state on close
      setPastedImagePreview(null);
      setPasteNotice(null);
      setNaturalText('');
      setTitle('');
    }
  }, [isOpen, initialMode, initialPastedImage]);

  // Capture Ctrl+V / Cmd+V paste events inside this modal
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleImageFile(file);
            setActiveTab('paste_photo');
            setPasteNotice('Foto colada da área de transferência com sucesso!');
            setTimeout(() => setPasteNotice(null), 3000);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleImageFile = (file: File) => {
    setIsOcrProcessing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setPastedImagePreview(result);
      processBase64Image(result, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const processBase64Image = async (dataUrl: string, mimeType = 'image/jpeg') => {
    setIsOcrProcessing(true);
    try {
      const base64Clean = dataUrl.split(',')[1] || dataUrl;
      const extracted = await parseScreenshotImage(base64Clean, mimeType);

      if (extracted.title) setTitle(extracted.title);
      if (extracted.date) setDate(extracted.date);
      if (extracted.startTime) setStartTime(extracted.startTime);
      if (extracted.endTime) setEndTime(extracted.endTime);
      if (extracted.category) setCategory(extracted.category);
      if (extracted.location) setLocation(extracted.location);
      if (extracted.attendees && extracted.attendees.length > 0) {
        setAttendees(extracted.attendees.join(', '));
      }
      if (extracted.description) setDescription(extracted.description);

      setPasteNotice(`✅ Compromisso extraído: "${extracted.title}"`);
      setTimeout(() => setPasteNotice(null), 4000);
    } catch (e) {
      console.warn('OCR error:', e);
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Clipboard API button click: reads image from clipboard
  const handleReadClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((type) => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], 'pasted-event.png', { type: imageType });
            handleImageFile(file);
            setPasteNotice('Foto lida da área de transferência!');
            return;
          }
        }
      }
      setPasteNotice('Nenhuma imagem encontrada na área de transferência. Copie um print (Ctrl+C ou Win+Shift+S) e tente novamente.');
      setTimeout(() => setPasteNotice(null), 4000);
    } catch (err) {
      // Clipboard read permission might be blocked, encourage Ctrl+V
      setPasteNotice('Dica: Pressione Ctrl+V no teclado para colar a imagem diretamente!');
      setTimeout(() => setPasteNotice(null), 4000);
    }
  };

  const handleMagicParse = async () => {
    if (!naturalText.trim()) return;
    setIsParsing(true);
    try {
      const parsed = await parseNaturalLanguageEvent(naturalText);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.date) setDate(parsed.date);
      if (parsed.startTime) setStartTime(parsed.startTime);
      if (parsed.endTime) setEndTime(parsed.endTime);
      if (parsed.category) setCategory(parsed.category);
      if (parsed.location) setLocation(parsed.location);
      if (parsed.description) setDescription(parsed.description);
    } catch (e) {
      console.warn('Error parsing natural text:', e);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newEvt: CalendarEvent = {
      id: 'evt-' + Date.now(),
      title: title.trim(),
      date,
      startTime,
      endTime,
      category,
      location: location.trim() || undefined,
      attendees: attendees
        ? attendees.split(',').map((a) => a.trim()).filter(Boolean)
        : [],
      description: description.trim() || undefined,
      priority,
      status: 'confirmed',
    };

    onAddEvent(newEvt);

    try {
      confetti({
        particleCount: 35,
        spread: 55,
        origin: { y: 0.7 },
      });
    } catch (e) {}

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-7 flex flex-col max-h-[92vh] overflow-y-auto">
        
        {/* Header with Mode Switcher */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-heading">
                Novo Compromisso
              </h2>
              <p className="text-xs text-slate-400">
                Escreva o compromisso ou cole a foto/print do evento
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs: Escrever vs Colar Foto */}
        <div className="grid grid-cols-2 gap-2 my-4 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'write'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>1. Escrever Compromisso</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste_photo')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'paste_photo'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clipboard className="w-4 h-4 text-emerald-400" />
            <span>2. Colar Foto (Ctrl+V)</span>
          </button>
        </div>

        {/* Notice Banner */}
        {pasteNotice && (
          <div className="mb-4 p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{pasteNotice}</span>
          </div>
        )}

        {/* Tab 1: Escrever Compromisso */}
        {activeTab === 'write' && (
          <div className="space-y-4 mb-4">
            {/* Natural Language Magic Bar */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/25">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-indigo-300 block mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                  Escreva em linguagem natural:
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Pressione Enter para preencher</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={naturalText}
                  onChange={(e) => setNaturalText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleMagicParse();
                    }
                  }}
                  placeholder="Ex: Almoço com Ana na sexta 13h no Fasano..."
                  className="flex-1 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500/50"
                />
                <button
                  type="button"
                  onClick={handleMagicParse}
                  disabled={isParsing || !naturalText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isParsing ? 'Lendo...' : 'Preencher'}</span>
                </button>
              </div>

              {/* Quick suggestion pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Sugestões:</span>
                {[
                  'Almoço amanhã 12:30 no Fasano',
                  'Reunião de Diretoria sexta às 15:30',
                  'Bloco de foco profundo hoje 16h às 18h',
                ].map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setNaturalText(sug);
                      setTimeout(() => handleMagicParse(), 50);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Colar Foto do Evento (Ctrl+V / Upload) */}
        {activeTab === 'paste_photo' && (
          <div className="space-y-4 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-2 border-dashed border-indigo-500/40 hover:border-indigo-500/70 text-center flex flex-col items-center justify-center gap-2.5 relative group">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(file);
                }}
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Clipboard className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white font-heading">
                  Pressione <kbd className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-xs">Ctrl + V</kbd> para colar a foto aqui
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Copie um print de WhatsApp, convite de e-mail ou passagem e cole diretamente nesta tela.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleReadClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  Colar da Área de Transferência
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
                  Carregar do Dispositivo
                </button>
              </div>
            </div>

            {/* Pasted Preview & OCR Status */}
            {isOcrProcessing && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 flex items-center justify-center gap-2 text-xs text-indigo-300 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Toki Vision analisando a foto colada e extraindo os dados...</span>
              </div>
            )}

            {pastedImagePreview && !isOcrProcessing && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                <img
                  src={pastedImagePreview}
                  alt="Foto Colada"
                  className="w-16 h-16 object-cover rounded-xl border border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    Foto analisada com sucesso!
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    Os dados foram preenchidos abaixo. Você pode ajustar e confirmar.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Form (Available in both modes for verification and editing) */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="border-t border-slate-800/80 pt-3">
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              Título do Compromisso *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião Executiva de Alinhamento"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Início</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Término</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              >
                <option value="meeting">Reunião Executiva</option>
                <option value="focus">Foco Profundo (Deep Work)</option>
                <option value="networking">Almoço / Networking</option>
                <option value="personal">Pessoal / Viagem</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">Local ou Link</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Google Meet, Fasano..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              >
              </input>
            </div>
          </div>

          {/* Priority / Criticidade Level Selector */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1.5 flex items-center justify-between">
              <span>Nível de Criticidade (Prioridade)</span>
              <span className="text-[10px] text-slate-400">
                {priority === 'high' ? '🚨 Dispara alerta no navegador 15 min antes' : 'Indicador colorido na agenda'}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  priority === 'high'
                    ? 'bg-rose-500/20 text-rose-200 border-rose-500/60 shadow-sm shadow-rose-500/20 ring-1 ring-rose-500/40'
                    : 'bg-slate-950/60 text-slate-400 hover:text-rose-300 border-slate-800 hover:border-rose-500/30'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Alta</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('medium')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  priority === 'medium'
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/60 shadow-sm shadow-amber-500/20 ring-1 ring-amber-500/40'
                    : 'bg-slate-950/60 text-slate-400 hover:text-amber-300 border-slate-800 hover:border-amber-500/30'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Média</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('low')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  priority === 'low'
                    ? 'bg-sky-500/20 text-sky-200 border-sky-500/60 shadow-sm shadow-sky-500/20 ring-1 ring-sky-500/40'
                    : 'bg-slate-950/60 text-slate-400 hover:text-sky-300 border-slate-800 hover:border-sky-500/30'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Baixa</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">
              Participantes (separados por vírgula)
            </label>
            <input
              type="text"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="ana@empresa.com, marcos@holding.com"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">Descrição & Notas</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pauta, notas prévias ou detalhes colados da foto..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Confirmar e Agendar</span>
          </button>
        </form>

      </div>
    </div>
  );
};
