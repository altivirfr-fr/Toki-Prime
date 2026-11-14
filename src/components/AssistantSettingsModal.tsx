import React from 'react';
import { 
  X, 
  Settings, 
  Sparkles, 
  User, 
  Sliders, 
  Palette, 
  Globe, 
  Volume2, 
  ShieldCheck,
  Check,
  Zap,
  Bell,
  BellRing,
  RotateCcw,
  PhoneCall,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { AssistantConfig, AssistantPersona, AuraColor } from '../types';
import { THEMES, getTheme } from '../utils/theme';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  isNotificationSupported, 
  isInsideIframe,
  clearNotifiedEventsHistory 
} from '../services/notificationService';

interface AssistantSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AssistantConfig;
  onUpdateConfig: (newConfig: AssistantConfig) => void;
  onTestNotification?: () => void;
  onTestScheduledCall?: () => void;
}

export const AssistantSettingsModal: React.FC<AssistantSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onTestNotification,
  onTestScheduledCall,
}) => {
  const [permission, setPermission] = React.useState<NotificationPermission | 'unsupported'>(() => getNotificationPermission());
  const [resetNotice, setResetNotice] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
  };

  const handleResetHistory = () => {
    clearNotifiedEventsHistory();
    setResetNotice(true);
    setTimeout(() => setResetNotice(false), 2500);
  };

  if (!isOpen) return null;

  const currentTheme = getTheme(config.auraColor);

  const personas: { id: AssistantPersona; label: string; desc: string }[] = [
    {
      id: 'Chief of Staff Estratégico',
      label: 'Chief of Staff Estratégico',
      desc: 'Foco em ROI, prioridades de alta gestão e proteção do seu tempo.',
    },
    {
      id: 'Coordenador Diplomático',
      label: 'Coordenador Diplomático',
      desc: 'Polido, cordial e especialista em negociar horários sem atritos.',
    },
    {
      id: 'Tech Founder Partner',
      label: 'Tech Founder Partner',
      desc: 'Ágil, direto ao ponto, cultura de execução rápida de startups.',
    },
    {
      id: 'Diretor de Operações',
      label: 'Diretor de Operações',
      desc: 'Metódico, detalhista com pautas, atas e mitigação de atrasos.',
    },
  ];

  const themeList = Object.values(THEMES);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className={`relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border ${currentTheme.borderAccent} rounded-3xl shadow-2xl p-5 sm:p-7 flex flex-col max-h-[92vh] overflow-y-auto transition-colors duration-300`}>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl bg-gradient-to-tr ${currentTheme.gradient} text-white shadow-md transition-all duration-300`}>
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-heading">
                Personalizar Assistente & Tema Visual
              </h2>
              <p className="text-xs text-slate-400">
                Ajuste o tom, voz e a aura de cores aplicada aos botões e bordas da interface
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

        <div className="my-5 space-y-6">
          
          {/* THEME PICKER (AuraColor) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className={`w-3.5 h-3.5 ${currentTheme.textAccent}`} />
                Tema Visual da Interface & Aura do Assistente
              </label>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${currentTheme.badge}`}>
                Ativo: {currentTheme.label}
              </span>
            </div>

            {/* Theme options grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {themeList.map((theme) => {
                const isSelected = config.auraColor === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onUpdateConfig({ ...config, auraColor: theme.id })}
                    className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                      isSelected
                        ? `bg-slate-900 border-2 ${theme.borderAccent} shadow-lg shadow-black/40`
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Color Swatch Circle with gradient glow */}
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${theme.gradient} flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform`}>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'} font-heading`}>
                          {theme.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {theme.mood}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Theme Preview Box */}
            <div className={`mt-3 p-3.5 rounded-2xl bg-slate-900/90 border ${currentTheme.borderAccent} transition-all duration-300`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Zap className={`w-3.5 h-3.5 ${currentTheme.textAccent}`} />
                  Prévia em Tempo Real dos Botões & Destaques
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${currentTheme.badge}`}>
                  Aura {currentTheme.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${currentTheme.primaryBtn} transition-all`}
                >
                  Botão Principal
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${currentTheme.secondaryBtn} transition-all`}
                >
                  Botão Secundário
                </button>
                <span className={`text-[11px] px-2.5 py-1 rounded-xl font-bold uppercase tracking-wider ${currentTheme.badge}`}>
                  Tag de Destaque
                </span>
              </div>
            </div>
          </div>

          {/* Nome do Assistente */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <User className={`w-3.5 h-3.5 ${currentTheme.textAccent}`} />
              Nome do Assistente
            </label>
            <div className="flex gap-2">
              {['Toki Prime', 'Sophia', 'Jarvis', 'Atlas'].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onUpdateConfig({ ...config, name })}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                    config.name === name
                      ? `${currentTheme.primaryBtn}`
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Persona & Tom */}
          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              Persona & Tom de Comunicação
            </label>
            <div className="space-y-2">
              {personas.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onUpdateConfig({ ...config, persona: p.id })}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    config.persona === p.id
                      ? `bg-slate-900 border-2 ${currentTheme.borderAccent} shadow-sm`
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-heading">
                      {p.label}
                    </span>
                    {config.persona === p.id && (
                      <span className={`w-2 h-2 rounded-full ${currentTheme.pingDot} animate-ping`} />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Idioma & Velocidade da Fala */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Globe className={`w-3.5 h-3.5 ${currentTheme.textAccent}`} />
                Idioma
              </label>
              <select
                value={config.language}
                onChange={(e) => onUpdateConfig({ ...config, language: e.target.value as any })}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Volume2 className={`w-3.5 h-3.5 ${currentTheme.textAccent}`} />
                Velocidade da Voz ({config.voiceSpeed}x)
              </label>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={config.voiceSpeed}
                onChange={(e) =>
                  onUpdateConfig({ ...config, voiceSpeed: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-500 mt-2"
              />
            </div>
          </div>

          
          {/* LIGAÇÃO NO HORÁRIO PROGRAMADO (TOKI CALL ME) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <PhoneCall className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>Ligação Programada Diária</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold lowercase">
                      estilo toki
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    O {config.name} liga pontualmente para falar seu Daily Briefing do dia
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() =>
                  onUpdateConfig({
                    ...config,
                    callAlerts: !config.callAlerts,
                  })
                }
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                  config.callAlerts !== false ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    config.callAlerts !== false ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {config.callAlerts !== false && (
              <div className="pt-2 border-t border-slate-800/80 space-y-3 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    Horário da Ligação:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={config.scheduledCallTime || "08:30"}
                      onChange={(e) =>
                        onUpdateConfig({
                          ...config,
                          scheduledCallTime: e.target.value,
                        })
                      }
                      className="bg-slate-950/90 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-emerald-300 outline-none focus:border-emerald-400"
                    />
                    <span className="text-[11px] text-slate-400">Todo dia útil</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {onTestScheduledCall && (
                    <button
                      type="button"
                      onClick={onTestScheduledCall}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all active:scale-95"
                      title="Dispara a chamada imediatamente para você ouvir e atender"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      Testar Ligação Agora
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400 ml-auto">
                    Programado para: <strong className="text-emerald-300">{config.scheduledCallTime || "08:30"}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* NOTIFICAÇÕES DOS COMPROMISSOS AGENDADOS */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30`}>
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    Notificações de Compromissos
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Alertas visuais, sonoros e popups 15 min antes e na hora exata
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {permission === 'granted' ? (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Permitido
                  </span>
                ) : permission === 'denied' ? (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                    Bloqueado
                  </span>
                ) : permission === 'unsupported' ? (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-semibold">
                    Não suportado
                  </span>
                ) : (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    Pendente
                  </span>
                )}
              </div>
            </div>

            {/* Toggle 1: All appointments vs High priority only */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs text-slate-200 font-medium block">
                  Notificar todos os compromissos agendados
                </span>
                <span className="text-[10px] text-slate-400">
                  Inclui eventos de Alta, Média, Baixa prioridade e Google Agenda
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateConfig({
                    ...config,
                    notifyAllEvents: config.notifyAllEvents === false ? true : false,
                  })
                }
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors shrink-0 ${
                  config.notifyAllEvents !== false ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    config.notifyAllEvents !== false ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2: Notify at exact start time too */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs text-slate-200 font-medium block">
                  Avisar 15 min antes e na hora de início
                </span>
                <span className="text-[10px] text-slate-400">
                  Dispara lembrete prévio e aviso pontual quando o evento começa
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateConfig({
                    ...config,
                    highPriorityAlerts: config.highPriorityAlerts === false ? true : false,
                    notifyAtStart: config.highPriorityAlerts === false ? true : false,
                  })
                }
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors shrink-0 ${
                  config.highPriorityAlerts !== false ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    config.highPriorityAlerts !== false ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Action Buttons for Permissions & Testing */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
              {permission !== 'granted' && isNotificationSupported() && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Autorizar Notificações
                </button>
              )}

              {onTestNotification && (
                <button
                  type="button"
                  onClick={onTestNotification}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
                  title="Disparar som e notificação simulada agora"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Testar Notificação
                </button>
              )}

              <button
                type="button"
                onClick={handleResetHistory}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-[11px] transition-colors ml-auto"
                title="Limpar registro de alertas já disparados para permitir novo disparo"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{resetNotice ? 'Histórico limpo!' : 'Resetar histórico'}</span>
              </button>
            </div>

            {permission === 'denied' && (
              <p className="text-[11px] text-rose-400/90 leading-tight">
                As notificações do sistema estão bloqueadas neste navegador. Desbloqueie no ícone de cadeado da barra de endereços para receber popups externos. Os alertas internos e sonoros dentro do app continuam ativos.
              </p>
            )}

            {isInsideIframe() && permission !== 'granted' && (
              <p className="text-[11px] text-amber-300/90 leading-tight bg-amber-500/10 border border-amber-500/20 rounded-xl p-2">
                Aviso: Você está visualizando o app dentro de um painel incorporado (iframe). Alguns navegadores bloqueiam popups nativos dentro de iframes — abra o link direto do app em uma aba própria para receber notificações do sistema operacional mesmo em outras abas.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className={`w-full py-2.5 rounded-xl ${currentTheme.primaryBtn} font-semibold text-xs sm:text-sm transition-all`}
        >
          Salvar e Aplicar Tema
        </button>

      </div>
    </div>
  );
};
