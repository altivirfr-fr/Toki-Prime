import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  Sparkles, 
  Check, 
  Clock, 
  MapPin, 
  Users, 
  Calendar, 
  FileText,
  ArrowRight,
  Smartphone,
  Mail,
  Plane
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CalendarEvent } from '../types';
import { parseScreenshotImage } from '../services/geminiService';

interface VisionDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (event: CalendarEvent) => void;
}

export const VisionDropModal: React.FC<VisionDropModalProps> = ({
  isOpen,
  onClose,
  onAddEvent,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);

  const demoPresets = [
    {
      id: 'whatsapp',
      name: 'WhatsApp de Sócio / Investidor',
      icon: Smartphone,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'Conversa combinando almoço de cap table',
      mockData: {
        title: 'Almoço com Fundo Kaszek (Série A)',
        date: getTomorrowDate(),
        startTime: '12:30',
        endTime: '14:00',
        category: 'networking' as const,
        location: 'Fasano Itaim - SP',
        attendees: ['investidor@kaszek.com', 'socio@minhaempresa.com'],
        description: 'Debater cap table, valuation da rodada e governança com sócios.',
        actionItems: ['Preparar deck financeiro resumido', 'Conferir projeção de runway'],
        summary: 'Print de WhatsApp processado: compromisso e 2 tarefas extraídas.',
      },
    },
    {
      id: 'email',
      name: 'Email Executivo de Diretoria',
      icon: Mail,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      description: 'Convite formal de alinhamento com conselho',
      mockData: {
        title: 'Comitê Executivo e Alinhamento Q3',
        date: getTodayDate(),
        startTime: '16:00',
        endTime: '17:30',
        category: 'meeting' as const,
        location: 'Google Meet (meet.google.com/tok-exec-q3)',
        attendees: ['conselho@holding.com', 'cfo@empresa.com'],
        description: 'Apresentação dos resultados de EBITDA e plano de expansão internacional.',
        actionItems: ['Revisar slides 5 e 9', 'Validar métricas de CAC e LTV com FP&A'],
        summary: 'Convite corporativo extraído com link de videoconferência.',
      },
    },
    {
      id: 'ticket',
      name: 'Confirmação de Voo Executivo',
      icon: Plane,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: 'Cartão de embarque LATAM / GOL',
      mockData: {
        title: 'Voo LA-3410: SP Congonhas ✈️ RJ Santos Dumont',
        date: getInTwoDaysDate(),
        startTime: '07:30',
        endTime: '08:35',
        category: 'personal' as const,
        location: 'Aeroporto de Congonhas (Portão 4)',
        attendees: ['passageiro@empresa.com'],
        description: 'Voo executivo para reunião presencial no Rio de Janeiro. Localizador: G6KL9P.',
        actionItems: ['Fazer check-in 24h antes', 'Pedir Uber às 06:15'],
        summary: 'Reserva aérea detectada com localizador e horários precisos.',
      },
    },
  ];

  function getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }
  function getTomorrowDate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  function getInTwoDaysDate() {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setExtractedData(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setSelectedPreview(result);
      const base64Clean = result.split(',')[1];
      const mime = file.type || 'image/jpeg';

      const data = await parseScreenshotImage(base64Clean, mime);
      setExtractedData(data);
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: typeof demoPresets[0]) => {
    setIsProcessing(true);
    setSelectedPreview(null);
    setExtractedData(null);

    setTimeout(() => {
      setExtractedData(preset.mockData);
      setIsProcessing(false);
    }, 600);
  };

  const handleConfirmAdd = () => {
    if (!extractedData) return;

    const newEvent: CalendarEvent = {
      id: 'vision-' + Date.now(),
      title: extractedData.title,
      date: extractedData.date,
      startTime: extractedData.startTime,
      endTime: extractedData.endTime,
      category: extractedData.category || 'meeting',
      location: extractedData.location || 'Google Meet',
      attendees: extractedData.attendees || [],
      description: extractedData.description,
      priority: 'high',
      status: 'confirmed',
    };

    onAddEvent(newEvent);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (e) {
      // confetti fallback
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-heading">
                Toki Vision OCR • Leitor de Capturas
              </h2>
              <p className="text-xs text-slate-400">
                Envie prints de WhatsApp, emails ou passagens para agendamento instantâneo
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

        {/* Upload Dropzone */}
        <div className="my-5">
          <label className="relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/50 hover:bg-slate-900/80 rounded-2xl cursor-pointer transition-all group overflow-hidden">
            <div className="flex flex-col items-center justify-center text-center px-4">
              <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 mb-2 transition-colors group-hover:scale-110" />
              <p className="text-xs font-medium text-slate-300">
                <span className="font-semibold text-indigo-400">Clique para carregar</span> ou arraste a captura de tela aqui
              </p>
              <p className="text-[11px] text-slate-500 mt-1">PNG, JPG ou JPEG até 10MB</p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Demo Presets with 1-Click test */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2.5">
            Ou teste com capturas de exemplo:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {demoPresets.map((preset) => {
              const IconComp = preset.icon;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className="flex flex-col items-start p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group active:scale-95"
                >
                  <div className={`p-1.5 rounded-lg border mb-2 ${preset.color}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-white group-hover:text-indigo-300 line-clamp-1">
                    {preset.name}
                  </span>
                  <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Spinner */}
        {isProcessing && (
          <div className="my-6 p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/30 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-indigo-300 font-medium animate-pulse">
              Toki Vision analisando entidades, horários e participantes...
            </p>
          </div>
        )}

        {/* Extracted Event Card */}
        {extractedData && !isProcessing && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 mb-4 animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  {extractedData.category === 'networking' ? 'Almoço / Networking' : extractedData.category === 'personal' ? 'Viagem / Pessoal' : 'Reunião Executiva'}
                </span>
                <h3 className="text-base font-bold text-white mt-1.5 font-heading">
                  {extractedData.title}
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium px-2.5 py-1 rounded-xl bg-slate-800">
                {extractedData.date}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 my-3">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{extractedData.startTime} - {extractedData.endTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{extractedData.location}</span>
              </div>
              {extractedData.attendees?.length > 0 && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{extractedData.attendees.join(', ')}</span>
                </div>
              )}
            </div>

            {extractedData.description && (
              <p className="text-xs text-slate-400 mb-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                {extractedData.description}
              </p>
            )}

            {extractedData.actionItems?.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Ações executivas identificadas:
                </p>
                <div className="space-y-1">
                  {extractedData.actionItems.map((act: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleConfirmAdd}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              Adicionar à Minha Agenda
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
