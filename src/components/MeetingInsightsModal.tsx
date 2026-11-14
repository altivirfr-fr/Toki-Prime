import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  ListChecks, 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Check, 
  Mic, 
  MicOff, 
  Send, 
  FileText, 
  ArrowRight, 
  AlertCircle, 
  TrendingUp, 
  Share2, 
  HelpCircle,
  Copy,
  Mail,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AssistantConfig, CalendarEvent, ExecutiveTask, MeetingInsights, SuggestedActionItem } from '../types';
import { generateMeetingInsights } from '../services/geminiService';

interface MeetingInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  config: AssistantConfig;
  onAddTasks: (newTasks: ExecutiveTask[]) => void;
  onUpdateEventNotes: (eventId: string, notes: string, insights: MeetingInsights) => void;
  onOpenOutreachWithNotes?: (event: CalendarEvent, summary: string, actions: string[]) => void;
  onScheduleFollowUp?: (title: string, daysLater: number) => void;
}

export const MeetingInsightsModal: React.FC<MeetingInsightsModalProps> = ({
  isOpen,
  onClose,
  event,
  config,
  onAddTasks,
  onUpdateEventNotes,
  onOpenOutreachWithNotes,
  onScheduleFollowUp,
}) => {
  const [notes, setNotes] = useState('');
  const [insights, setInsights] = useState<MeetingInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [addedTaskIds, setAddedTaskIds] = useState<Set<string>>(new Set());
  const [copiedSummary, setCopiedSummary] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Default rich notes templates if event has no notes
  const getDefaultNotesForEvent = (evt: CalendarEvent): string => {
    if (evt.notes) return evt.notes;
    const lower = evt.title.toLowerCase();
    if (lower.includes('kaszek') || lower.includes('almoço')) {
      return `Pauta: Cap table e rodada Série A com fundo Kaszek.
- Discutido valuation pré-money em torno de US$ 32M a US$ 35M.
- Kaszek solicitou abertura do data room técnico e projeção de churn para o próximo tri.
- Combinado envio da minuta até sexta-feira para os conselheiros.
- Próximo passo: sócios precisam alinhar participação das stock options antes da assinatura.`;
    }
    if (lower.includes('produto') || lower.includes('roadmap')) {
      return `Pauta: Aprovação do redesign mobile e migração para nova arquitetura.
- Head de Produto apresentou aumento de 22% no engajamento nos testes preliminares.
- Decidido lançar a funcionalidade de sincronização com Google Calendar para 100% da base.
- Equipe de design precisa entregar as telas de onboarding até quarta 18h.
- Bloqueio identificado: validação de compliance com time de segurança.`;
    }
    if (lower.includes('daily') || lower.includes('alinhamento')) {
      return `Pauta: Daily executivo e revisão de KPIs semanais.
- ARR cresceu 8.4% no último mês, atingindo a meta antecipadamente.
- Equipe de vendas reportou gargalo no onboarding de grandes contas corporativas.
- CFO solicitou revisão do orçamento de contratações do Q3.
- Definido que o VP de Engenharia liderará a integração da nova esteira de deploy.`;
    }
    return evt.description || `Reunião executiva realizada para deliberar sobre ${evt.title}.
Principais tópicos: revisão de marcos, prazos, mitigação de riscos e alocação de equipe.`;
  };

  useEffect(() => {
    if (isOpen && event) {
      const initialNotes = getDefaultNotesForEvent(event);
      setNotes(initialNotes);
      setAddedTaskIds(new Set());

      // If event already has cached insights, load them; otherwise trigger automatic AI analysis
      if (event.insights) {
        setInsights(event.insights);
      } else {
        triggerAnalysis(initialNotes);
      }
    }
  }, [isOpen, event]);

  const triggerAnalysis = async (currentNotes?: string) => {
    if (!event) return;
    setLoading(true);
    try {
      const notesToAnalyze = currentNotes !== undefined ? currentNotes : notes;
      const result = await generateMeetingInsights(event, notesToAnalyze, config);
      setInsights(result);
      onUpdateEventNotes(event.id, notesToAnalyze, result);
    } catch (err) {
      console.warn('Error fetching insights:', err);
    } finally {
      setLoading(false);
    }
  };

  // Web Speech recognition for voice dictation of notes
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = config.language;

        recognition.onresult = (e: any) => {
          let transcript = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            transcript += e.results[i][0].transcript;
          }
          if (transcript) {
            setNotes((prev) => (prev ? prev + ' ' + transcript : transcript));
          }
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
      }
    }
  };

  // Add a single suggested to-do to executive task list
  const handleAddSingleAction = (item: SuggestedActionItem) => {
    const newTask: ExecutiveTask = {
      id: `task-insight-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: item.title,
      priority: item.priority,
      completed: false,
      dueDate: item.suggestedDeadline || new Date().toISOString().split('T')[0],
      delegatedTo: item.assignedTo,
      relatedEventId: event?.id,
    };

    onAddTasks([newTask]);
    setAddedTaskIds((prev) => new Set(prev).add(item.id));

    try {
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7 },
      });
    } catch (e) {}
  };

  // Add all suggested to-dos in bulk
  const handleAddAllActions = () => {
    if (!insights?.followUpSuggestions) return;

    const unadded = insights.followUpSuggestions.filter((item) => !addedTaskIds.has(item.id));
    if (unadded.length === 0) return;

    const newTasks: ExecutiveTask[] = unadded.map((item, idx) => ({
      id: `task-insight-${Date.now()}-${idx}`,
      title: item.title,
      priority: item.priority,
      completed: false,
      dueDate: item.suggestedDeadline || new Date().toISOString().split('T')[0],
      delegatedTo: item.assignedTo,
      relatedEventId: event?.id,
    }));

    onAddTasks(newTasks);
    setAddedTaskIds(new Set(insights.followUpSuggestions.map((s) => s.id)));

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {}
  };

  const handleCopySummary = () => {
    if (!insights || !event) return;
    const text = `📊 AI MEETING INSIGHTS: ${event.title}\n\n📝 Resumo Executivo:\n${insights.summary}\n\n✅ Decisões Tomadas:\n${insights.keyDecisions.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\n📌 Ações de Follow-up:\n${insights.followUpSuggestions.map((a, i) => `${i + 1}. [${a.priority.toUpperCase()}] ${a.title} (Resp: ${a.assignedTo || 'A definir'})`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  if (!isOpen || !event) return null;

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'urgent':
        return { label: 'Atenção / Urgente', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      case 'strategic':
        return { label: 'Alta Relevância Estratégica', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'challenging':
        return { label: 'Desafiadora / Alinhamento Crítico', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      default:
        return { label: 'Produtiva & Alinhada', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    }
  };

  const sentimentInfo = getSentimentBadge(insights?.sentiment || 'productive');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-7 flex flex-col max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  AI Meeting Insights
                </span>
                <span className="text-xs text-slate-400">
                  {event.startTime} - {event.endTime}
                </span>
                {event.syncedWithGoogle && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hidden sm:inline">
                    G-Calendar
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white font-heading mt-1">
                {event.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopySummary}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5 text-xs"
              title="Copiar Resumo dos Insights"
            >
              {copiedSummary ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedSummary ? 'Copiado!' : 'Copiar'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Meeting Notes Input & Transcribe Section */}
        <div className="my-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Notas da Reunião / Ata ou Transcrição
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  isRecording
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Ditar notas usando voz"
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{isRecording ? 'Ouvindo...' : 'Ditar'}</span>
              </button>

              <button
                type="button"
                onClick={() => triggerAnalysis()}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Analisando...' : 'Reanalisar com IA'}</span>
              </button>
            </div>
          </div>

          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cole notas soltas, transcrição de áudio ou pontos debatidos nesta reunião para a IA analisar..."
            className="w-full bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500/50 resize-y leading-relaxed"
          />
        </div>

        {/* AI Analysis Results */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <Sparkles className="w-4 h-4 text-purple-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <p className="text-xs text-indigo-300 font-medium animate-pulse">
              Toki analisando notas, identificando decisões e gerando to-dos automáticos...
            </p>
          </div>
        ) : insights ? (
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* Executive Summary Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  Resumo Executivo Pós-Reunião
                </span>
                <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${sentimentInfo.color}`}>
                  {sentimentInfo.label}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                {insights.summary}
              </p>
            </div>

            {/* Key Decisions */}
            {insights.keyDecisions?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider mb-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Decisões Tomadas & Acordos
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {insights.keyDecisions.map((dec, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        ✓
                      </span>
                      <span className="leading-relaxed">{dec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Follow-up Actions & To-Dos */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
                  <ListChecks className="w-4 h-4 text-indigo-400" />
                  To-Dos & Ações de Follow-up Sugeridos ({insights.followUpSuggestions?.length || 0})
                </div>
                {insights.followUpSuggestions?.length > 0 && (
                  <button
                    onClick={handleAddAllActions}
                    disabled={insights.followUpSuggestions.every((i) => addedTaskIds.has(i.id))}
                    className="text-xs px-3 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Todos às Tarefas
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {insights.followUpSuggestions?.map((item) => {
                  const isAdded = addedTaskIds.has(item.id);
                  const priorityClass =
                    item.priority === 'high'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : item.priority === 'medium'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-slate-500/20 text-slate-300 border-slate-500/30';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isAdded
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityClass}`}
                          >
                            {item.priority === 'high' ? 'Alta Prioridade' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                          </span>
                          {item.assignedTo && (
                            <span className="text-[11px] text-indigo-400 font-medium">
                              Resp: {item.assignedTo}
                            </span>
                          )}
                          {item.suggestedDeadline && (
                            <span className="text-[11px] text-slate-400">
                              • Prazo: {item.suggestedDeadline}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-white">
                          {item.title}
                        </p>
                        {item.rationale && (
                          <p className="text-[11px] text-slate-400 mt-1 italic">
                            &ldquo;{item.rationale}&rdquo;
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleAddSingleAction(item)}
                        disabled={isAdded}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center justify-center gap-1.5 transition-all ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-95'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Adicionado às Tarefas</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar à Lista</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unresolved Questions & Recommended Follow-up */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Unresolved questions */}
              {insights.unresolvedQuestions?.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Pontos em Aberto / Atenção
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {insights.unresolvedQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 shrink-0">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Follow-up Meeting */}
              {insights.recommendedFollowUpMeeting?.needed && (
                <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/25 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Próximo Encontro Recomendado
                    </div>
                    <p className="text-xs font-semibold text-white mt-1">
                      {insights.recommendedFollowUpMeeting.topic || `Checkpoint: ${event.title}`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Sugerido para daqui a {insights.recommendedFollowUpMeeting.suggestedDaysLater || 7} dias
                    </p>
                  </div>

                  {onScheduleFollowUp && (
                    <button
                      onClick={() =>
                        onScheduleFollowUp(
                          insights.recommendedFollowUpMeeting?.topic || `Follow-up: ${event.title}`,
                          insights.recommendedFollowUpMeeting?.suggestedDaysLater || 7
                        )
                      }
                      className="mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 text-xs font-semibold transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agendar Checkpoint na Agenda
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Outreach bridge */}
            {onOpenOutreachWithNotes && (
              <div className="pt-2">
                <button
                  onClick={() =>
                    onOpenOutreachWithNotes(
                      event,
                      insights.summary,
                      insights.followUpSuggestions.map((s) => s.title)
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition-all group"
                >
                  <Mail className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Redigir E-mail / WhatsApp de Follow-up com estes Insights</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

          </div>
        ) : null}

      </div>
    </div>
  );
};
