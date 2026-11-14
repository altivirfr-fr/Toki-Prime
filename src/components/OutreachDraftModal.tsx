import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  MessageSquare, 
  Mail, 
  Calendar, 
  Sparkles,
  ExternalLink 
} from 'lucide-react';
import { CalendarEvent, OutreachDraft } from '../types';
import { generateOutreachDraft } from '../services/geminiService';

interface OutreachDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
}

export const OutreachDraftModal: React.FC<OutreachDraftModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [recipient, setRecipient] = useState('Parceiro Executivo');
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'email' | 'calendar'>('whatsapp');
  const [draft, setDraft] = useState<OutreachDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setLoading(true);
      generateOutreachDraft(event, 'Convite & Alinhamento', recipient)
        .then((data) => {
          setDraft(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [isOpen, event, recipient]);

  if (!isOpen || !event) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWhatsAppLink = (text: string) => {
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const getMailtoLink = (subject: string, body: string) => {
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-heading">
                Toki Outreach • Negociação de Horários
              </h2>
              <p className="text-xs text-slate-400">
                Textos executivos prontos para convidar, alinhar ou propor remarcação
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

        {/* Recipient name input */}
        <div className="my-4">
          <label className="text-xs text-slate-400 block mb-1">
            Nome do Destinatário ou Cargo:
          </label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 outline-none focus:border-indigo-500/50"
            placeholder="Ex: Carlos (VP de Produto), Dra. Helena..."
          />
        </div>

        {/* Channel Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 mb-4">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'whatsapp'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'email'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email Executivo
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'calendar'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Nota de Agenda
          </button>
        </div>

        {/* Content Box */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-emerald-300 font-medium animate-pulse">
              Toki formulando mensagem executiva...
            </p>
          </div>
        ) : draft ? (
          <div className="space-y-4 animate-in fade-in">
            {activeTab === 'whatsapp' && (
              <div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {draft.whatsappText}
                </div>
                <div className="flex items-center justify-between gap-3 mt-3">
                  <button
                    onClick={() => handleCopy(draft.whatsappText)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar Texto'}
                  </button>
                  <a
                    href={getWhatsAppLink(draft.whatsappText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir no WhatsApp
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div>
                <div className="text-xs text-slate-400 font-semibold mb-1">
                  Assunto: <span className="text-white">{draft.subject}</span>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {draft.emailBody}
                </div>
                <div className="flex items-center justify-between gap-3 mt-3">
                  <button
                    onClick={() => handleCopy(`${draft.subject}\n\n${draft.emailBody}`)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-indigo-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar Assunto + Corpo'}
                  </button>
                  <a
                    href={getMailtoLink(draft.subject, draft.emailBody)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Cliente de Email
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {draft.calendarInviteNote}
                </div>
                <div className="flex items-center justify-end mt-3">
                  <button
                    onClick={() => handleCopy(draft.calendarInviteNote)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar Nota'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

      </div>
    </div>
  );
};
