/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  RefreshCw,
  Bell,
  BellRing,
  X,
  MessageCircle,
  Target,
  Briefcase,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { User } from 'firebase/auth';
import {
  checkScheduledDailyCall,
  checkEventCalls,
  resetTodayCallTrigger,
  resetEventCallTriggers,
} from './services/callSchedulerService';
import {
  getNotificationPermission,
  requestNotificationPermission,
  checkUpcomingEventNotifications,
  unlockAudioContext,
  isInsideIframe,
  playExecutiveChime,
  sendBrowserNotification,
  TriggeredEventNotification,
} from './services/notificationService';

import { AssistantConfig, CalendarEvent, ExecutiveTask } from './types';
import { ExecutiveTopBar, AppSection } from './components/ExecutiveTopBar';
import { TokiChatScheduler } from './components/TokiChatScheduler';
import { DailyBriefingCard } from './components/DailyBriefingCard';
import { CalendarTimeline } from './components/CalendarTimeline';
import { TaskPriorityList } from './components/TaskPriorityList';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { LiveVoiceOrbModal } from './components/LiveVoiceOrbModal';
import { IncomingCallModal } from './components/IncomingCallModal';
import { VisionDropModal } from './components/VisionDropModal';
import { QuickAddEventModal } from './components/QuickAddEventModal';
import { MeetingPrepModal } from './components/MeetingPrepModal';
import { MeetingInsightsModal } from './components/MeetingInsightsModal';
import { OutreachDraftModal } from './components/OutreachDraftModal';
import { AssistantSettingsModal } from './components/AssistantSettingsModal';
import { ConfirmActionModal } from './components/ConfirmActionModal';
import { getTheme } from './utils/theme';
import { getLocalDateString, formatLocalDateFromDate } from './utils/dateUtils';

import { googleSignIn, logout, initAuth, getAccessToken } from './services/googleAuth';
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  syncBidirectionalEvents,
} from './services/googleCalendarService';

export default function App() {
  const todayStr = getLocalDateString(0);
  const tomorrowStr = getLocalDateString(1);
  const inTwoDaysStr = getLocalDateString(2);

  // Assistant Configuration
  const [config, setConfig] = useState<AssistantConfig>(() => {
    const saved = localStorage.getItem('toki_assistant_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.name || parsed.name === 'Toki') {
          parsed.name = 'Toki Prime';
        }
        return parsed;
      } catch (e) {}
    }
    return {
      name: 'Toki Prime',
      persona: 'Chief of Staff Estratégico',
      language: 'pt-BR',
      auraColor: 'blue',
      voiceSpeed: 1.0,
      proactiveBriefing: true,
      callAlerts: true,
      scheduledCallTime: '08:30',
      highPriorityAlerts: true,
      notifyAllEvents: true,
      notifyAtStart: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('toki_assistant_config', JSON.stringify(config));
  }, [config]);

  // Executive Calendar Events
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('toki_calendar_events');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'evt-1',
        title: 'Daily Executivo & Alinhamento de Metas',
        date: todayStr,
        startTime: '09:30',
        endTime: '10:15',
        category: 'meeting',
        location: 'Google Meet (meet.google.com/tok-daily)',
        attendees: ['cfo@empresa.com', 'coo@empresa.com', 'cto@empresa.com'],
        description: 'Revisão das métricas semanais, ARR, pipeline de vendas e prioridades.',
        notes:
          'Pauta da Daily: ARR atingiu meta +8.4%. Pipeline corporativo necessita reforço no onboarding. Decidido priorizar integração do novo sistema.',
        priority: 'high',
        status: 'confirmed',
        callMe: true,
        callMinutesBefore: 5,
      },
      {
        id: 'evt-2',
        title: 'Almoço de Negócios com Fundo Kaszek',
        date: todayStr,
        startTime: '12:30',
        endTime: '14:00',
        category: 'networking',
        location: 'Fasano Itaim - SP',
        attendees: ['investidor@kaszek.com', 'socio@minhaempresa.com'],
        description: 'Debater cap table, valuation da rodada Série A e estrutura do conselho.',
        notes:
          'Almoço Kaszek: Valuation debatido em US$ 35M pré-money. Pediram projeção de retenção de clientes para o Q4 e abertura do data room técnico.',
        priority: 'high',
        status: 'confirmed',
        callMe: true,
        callMinutesBefore: 15,
      },
      {
        id: 'evt-3',
        title: 'Comitê de Produto & Roadmap Q3',
        date: todayStr,
        startTime: '14:00',
        endTime: '15:00',
        category: 'meeting',
        location: 'Sala de Guerra / Google Meet',
        attendees: ['head.product@empresa.com', 'design.lead@empresa.com'],
        description: 'Aprovação final do redesign da aplicação e lançamento da versão mobile.',
        notes:
          'Comitê de Produto: Lançamento do novo recurso aprovado para 100% dos usuários. Design lead precisa finalizar as telas finais até quarta.',
        priority: 'high',
        status: 'confirmed',
        isConflict: true,
      },
      {
        id: 'evt-4',
        title: 'Alinhamento com Diretor Jurídico',
        date: todayStr,
        startTime: '14:00',
        endTime: '14:45',
        category: 'meeting',
        location: 'Google Meet',
        attendees: ['juridico@holding.com'],
        description: 'Revisão dos termos de confidencialidade e cláusulas do term sheet.',
        notes:
          'Jurídico: Cláusula de não-concorrência ajustada. Aguardando assinatura digital da holding.',
        priority: 'medium',
        status: 'confirmed',
        isConflict: true,
      },
      {
        id: 'evt-5',
        title: 'Bloco de Foco Profundo: Estratégia de M&A',
        date: todayStr,
        startTime: '15:30',
        endTime: '17:30',
        category: 'focus',
        location: 'Escritório Privativo (Não Interromper)',
        description: 'Análise aprofundada dos modelos financeiros e sinergia de aquisição.',
        priority: 'high',
        status: 'confirmed',
      },
      {
        id: 'evt-6',
        title: '1-on-1 com VP de Engenharia',
        date: todayStr,
        startTime: '18:00',
        endTime: '18:45',
        category: 'meeting',
        location: 'Google Meet',
        attendees: ['vp.eng@empresa.com'],
        description: 'Revisão de retenção de talentos técnicos e arquitetura em nuvem.',
        notes:
          '1-on-1 Eng: Aprovada a contratação de 2 novos Staff Engineers. Latência do banco reduzida em 30%.',
        priority: 'medium',
        status: 'confirmed',
      },
      {
        id: 'evt-7',
        title: 'All Hands Geral da Empresa',
        date: tomorrowStr,
        startTime: '11:00',
        endTime: '12:00',
        category: 'meeting',
        location: 'Auditório Principal & Zoom Broadcast',
        attendees: ['todos@empresa.com'],
        description: 'Comunicação das metas do trimestre e celebração de resultados.',
        priority: 'high',
        status: 'confirmed',
      },
      {
        id: 'evt-8',
        title: 'Jantar com Conselheiros de Governança',
        date: inTwoDaysStr,
        startTime: '19:30',
        endTime: '21:30',
        category: 'networking',
        location: 'Restaurante Parigi',
        attendees: ['conselheiro1@board.com', 'conselheiro2@board.com'],
        description: 'Jantar institucional para prestação de contas pré-conselho.',
        priority: 'high',
        status: 'confirmed',
      },
      {
        id: 'evt-9',
        title: 'Revisão de Assinaturas e Recibos Administrativos',
        date: todayStr,
        startTime: '17:00',
        endTime: '17:30',
        category: 'personal',
        location: 'Portal Corporativo',
        description: 'Assinatura digital de termos administrativos e validação de relatórios.',
        priority: 'low',
        status: 'confirmed',
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('toki_calendar_events', JSON.stringify(events));
  }, [events]);

  // Executive Tasks
  const [tasks, setTasks] = useState<ExecutiveTask[]>(() => {
    const saved = localStorage.getItem('toki_executive_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'task-1',
        title: 'Revisar modelo financeiro e cap table pré-almoço Kaszek',
        priority: 'high',
        completed: false,
        dueDate: todayStr,
      },
      {
        id: 'task-2',
        title: 'Aprovar contratação do Lead Staff Engineer',
        priority: 'high',
        completed: false,
        dueDate: todayStr,
        delegatedTo: 'RH & VP Eng',
      },
      {
        id: 'task-3',
        title: 'Homologar minuta jurídica do contrato de expansão',
        priority: 'medium',
        completed: true,
        dueDate: todayStr,
      },
      {
        id: 'task-4',
        title: 'Encaminhar pauta antecipada para o All Hands',
        priority: 'medium',
        completed: false,
        dueDate: tomorrowStr,
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem('toki_executive_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Google Calendar Auth & Sync
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Navigation & Modals
  const [activeSection, setActiveSection] = useState<AppSection>('chat');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callReason, setCallReason] = useState<'scheduled' | 'manual'>('scheduled');
  const [activeCallEvent, setActiveCallEvent] = useState<CalendarEvent | null>(null);
  const [isVisionOpen, setIsVisionOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState<'write' | 'paste_photo'>('write');
  const [pastedImageForModal, setPastedImageForModal] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDossierEvent, setActiveDossierEvent] = useState<CalendarEvent | null>(null);
  const [activeInsightsEvent, setActiveInsightsEvent] = useState<CalendarEvent | null>(null);
  const [activeOutreachEvent, setActiveOutreachEvent] = useState<CalendarEvent | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => getNotificationPermission());
  const [activeEventAlert, setActiveEventAlert] = useState<TriggeredEventNotification | null>(null);
  const [notifBannerDismissed, setNotifBannerDismissed] = useState<boolean>(false);

  // Unlock Web Audio API on first user interaction
  useEffect(() => {
    const handleUnlock = () => unlockAudioContext();
    window.addEventListener('pointerdown', handleUnlock, { once: true });
    window.addEventListener('keydown', handleUnlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('keydown', handleUnlock);
    };
  }, []);

  const handleRequestNotificationPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      setBannerNotice('Notificações do navegador ativadas para seus compromissos.');
      setTimeout(() => setBannerNotice(null), 4500);
    } else if (perm === 'denied') {
      setBannerNotice('Notificações externas bloqueadas no navegador. Alertas internos continuam ativos.');
      setTimeout(() => setBannerNotice(null), 5000);
    }
  };

  const handleTestNotification = async () => {
    unlockAudioContext();
    if (notificationPermission === 'default') {
      const perm = await requestNotificationPermission();
      setNotificationPermission(perm);
    }

    const targetEvent =
      events.find((e) => e.date === todayStr) ||
      events[0] || {
        id: 'demo-evt',
        title: 'Reunião Executiva',
        date: todayStr,
        startTime: '10:00',
        endTime: '11:00',
        category: 'meeting',
        location: 'Google Meet',
        priority: 'high',
        status: 'confirmed',
      };

    playExecutiveChime();

    sendBrowserNotification({
      title: `Em 15 min: ${targetEvent.title}`,
      body: `Início às ${targetEvent.startTime} (${targetEvent.location || 'Local a definir'}).`,
      tag: `test-evt-${Date.now()}`,
      onClick: () => {
        setActiveInsightsEvent(targetEvent);
      },
    });

    setActiveEventAlert({
      event: targetEvent,
      kind: '15m',
      minutesRemaining: 15,
    });

    setBannerNotice('Alerta de teste disparado.');
    setTimeout(() => setBannerNotice(null), 4000);
  };

  const handleTestScheduledCall = (eventToCall?: CalendarEvent | null) => {
    unlockAudioContext();
    resetTodayCallTrigger();
    setActiveCallEvent(eventToCall || null);
    setCallReason('scheduled');
    setIsCallOpen(true);
  };

  // Automated Event Notification Monitor (15 min before & at start time)
  useEffect(() => {
    if (config.highPriorityAlerts === false) return;

    const checkAlerts = () => {
      checkUpcomingEventNotifications(
        events,
        {
          notifyAllEvents: config.notifyAllEvents !== false,
          notifyAtStart: config.notifyAtStart !== false,
        },
        (triggeredPayload) => {
          setActiveEventAlert(triggeredPayload);
        }
      );
    };

    checkAlerts();
    const intervalId = setInterval(checkAlerts, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAlerts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [events, config.highPriorityAlerts, config.notifyAllEvents, config.notifyAtStart]);

  // Automated Daily Call + Per-Event "Me Ligue" Monitor
  useEffect(() => {
    const checkCalls = () => {
      // 1. Check individual events with callMe enabled
      const triggeredEvent = checkEventCalls(events, config.name, (evt) => {
        setActiveCallEvent(evt);
        setCallReason('scheduled');
        setIsCallOpen(true);
      });

      // 2. If no event call triggered right now, check daily briefing call
      if (!triggeredEvent && config.callAlerts !== false) {
        checkScheduledDailyCall(config, (reason) => {
          setActiveCallEvent(null);
          setCallReason(reason);
          setIsCallOpen(true);
        });
      }
    };

    checkCalls();
    const intervalId = setInterval(checkCalls, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkCalls();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [events, config.callAlerts, config.scheduledCallTime, config.name]);

  const conflictsCount = events.filter((e) => e.isConflict).length;

  // Google Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        performBidirectionalSync(token);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Periodic Sync
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      const token = await getAccessToken();
      if (token && !isSyncing) {
        performBidirectionalSync(token, false);
      }
    }, 35000);
    return () => clearInterval(interval);
  }, [user, events, isSyncing]);

  // Global Image Paste Listener (Ctrl+V)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              setPastedImageForModal(reader.result as string);
              setQuickAddMode('paste_photo');
              setIsQuickAddOpen(true);
              setBannerNotice('Foto colada — extraindo dados do compromisso...');
              setTimeout(() => setBannerNotice(null), 4000);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const performBidirectionalSync = async (token: string, showNotice = true) => {
    setIsSyncing(true);
    try {
      const { mergedEvents, uploadedCount, importedCount } = await syncBidirectionalEvents(
        events,
        token
      );
      setEvents(mergedEvents);
      const now = new Date();
      setLastSyncTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );

      if (showNotice && (uploadedCount > 0 || importedCount > 0)) {
        setBannerNotice(
          `Sincronizado: ${importedCount} importado(s), ${uploadedCount} enviado(s).`
        );
        setTimeout(() => setBannerNotice(null), 4500);
      }
    } catch (err) {
      console.warn('Bidirectional sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setBannerNotice(`Conectado ao Google Calendar (${result.user.email})`);
        await performBidirectionalSync(result.accessToken, true);
        setTimeout(() => setBannerNotice(null), 4500);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'janela fechada';
      setBannerNotice(`Conexão não concluída (${msg}).`);
      setTimeout(() => setBannerNotice(null), 4500);
    }
  };

  const handleGoogleSignOut = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Desconectar Google Agenda?',
      description:
        'Deseja desconectar a sincronização com o Google Calendar? Seus eventos locais permanecerão salvos.',
      confirmLabel: 'Desconectar',
      isDestructive: false,
      onConfirm: async () => {
        await logout();
        setUser(null);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setBannerNotice('Google Agenda desconectada.');
        setTimeout(() => setBannerNotice(null), 3500);
      },
    });
  };

  const handleTriggerSync = async () => {
    const token = await getAccessToken();
    if (!token) {
      handleGoogleSignIn();
      return;
    }
    await performBidirectionalSync(token, true);
  };

  const handleAddEvent = async (newEvent: CalendarEvent) => {
    unlockAudioContext();
    setSelectedDate(newEvent.date);
    const token = await getAccessToken();
    if (token) {
      try {
        const { id, htmlLink } = await createGoogleCalendarEvent(token, newEvent);
        const syncedEvent: CalendarEvent = {
          ...newEvent,
          googleEventId: id,
          googleHtmlLink: htmlLink,
          syncedWithGoogle: true,
          syncStatus: 'synced',
        };
        setEvents((prev) => [syncedEvent, ...prev]);
        setBannerNotice(`Compromisso "${newEvent.title}" salvo e sincronizado.`);
        setTimeout(() => setBannerNotice(null), 4000);
        return;
      } catch (err) {
        console.warn('Could not sync to Google Calendar immediately, saving locally:', err);
      }
    }

    setEvents((prev) => [newEvent, ...prev]);
    setBannerNotice(`Compromisso "${newEvent.title}" adicionado.`);
    setTimeout(() => setBannerNotice(null), 4000);
  };

  const handleToggleEventCallMe = (eventId: string, callMe: boolean) => {
    unlockAudioContext();
    if (callMe) {
      resetEventCallTriggers(eventId);
    }
    setEvents((prev) =>
      prev.map((evt) => (evt.id === eventId ? { ...evt, callMe } : evt))
    );
  };

  const handleUpdateEventCallOffset = (eventId: string, minutesBefore: number) => {
    resetEventCallTriggers(eventId);
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventId
          ? { ...evt, callMinutesBefore: minutesBefore, callMe: true }
          : evt
      )
    );
  };

  const handleDeleteEvent = (id: string) => {
    const eventToDelete = events.find((e) => e.id === id);
    if (!eventToDelete) return;

    if (eventToDelete.googleEventId) {
      setConfirmModal({
        isOpen: true,
        title: 'Excluir do Google Calendar?',
        description: `Deseja remover "${eventToDelete.title}" também da sua agenda do Google Calendar?`,
        confirmLabel: 'Excluir',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          const token = await getAccessToken();
          if (token && eventToDelete.googleEventId) {
            try {
              await deleteGoogleCalendarEvent(token, eventToDelete.googleEventId);
            } catch (err) {
              console.warn('Error deleting from Google Calendar:', err);
            }
          }
          setEvents((prev) => prev.filter((e) => e.id !== id));
          setBannerNotice(`Compromisso "${eventToDelete.title}" removido.`);
          setTimeout(() => setBannerNotice(null), 3000);
        },
      });
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setBannerNotice(`Compromisso "${eventToDelete.title}" removido.`);
      setTimeout(() => setBannerNotice(null), 3000);
    }
  };

  const handleUpdatePriority = (eventId: string, newPriority: 'high' | 'medium' | 'low') => {
    setEvents((prev) =>
      prev.map((evt) => (evt.id === eventId ? { ...evt, priority: newPriority } : evt))
    );
    const label = newPriority === 'high' ? 'Alta' : newPriority === 'medium' ? 'Média' : 'Baixa';
    setBannerNotice(`Prioridade alterada para ${label}.`);
    setTimeout(() => setBannerNotice(null), 3000);
  };

  const handleResolveConflicts = async () => {
    const token = await getAccessToken();
    const updatedEvents = events.map((evt) => {
      if (evt.id === 'evt-4' || (evt.isConflict && evt.priority !== 'high')) {
        const updated = {
          ...evt,
          startTime: '17:30',
          endTime: '18:00',
          isConflict: false,
          description: `${evt.description || ''} (Reagendado pelo Toki para evitar sobreposição).`,
        };
        if (token && updated.googleEventId) {
          updateGoogleCalendarEvent(token, updated).catch(console.warn);
        }
        return updated;
      }
      if (evt.isConflict) {
        return { ...evt, isConflict: false };
      }
      return evt;
    });

    setEvents(updatedEvents);

    try {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.6 },
      });
    } catch (e) {}

    setBannerNotice('Conflito resolvido: compromisso movido para janela livre às 17:30.');
    setTimeout(() => setBannerNotice(null), 4500);
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (newTask: ExecutiveTask) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const currentTheme = getTheme(config.auraColor);

  const mobileTabs: { id: AppSection; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageCircle className="w-5 h-5" /> },
    { id: 'tasks', label: 'Tarefas', icon: <Target className="w-5 h-5" /> },
    { id: 'agenda', label: 'Agenda', icon: <Calendar className="w-5 h-5" /> },
    { id: 'briefing', label: 'Briefing', icon: <Briefcase className="w-5 h-5" /> },
    { id: 'profile', label: 'Perfil', icon: <UserIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#141416] text-zinc-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white pb-24 lg:pb-10">
      {/* Top Bar */}
      <ExecutiveTopBar
        config={config}
        user={user}
        isSyncing={isSyncing}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onOpenCall={() => handleTestScheduledCall(null)}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
        onTriggerSync={handleTriggerSync}
        conflictsCount={conflictsCount}
        notificationPermission={notificationPermission}
        onRequestNotificationPermission={handleRequestNotificationPermission}
      />

      {/* Upcoming Appointment Alert Toast */}
      {activeEventAlert && (
        <aside
          aria-label="Alerta de Compromisso Agendado"
          className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full bg-[#1e1e21] border border-white/[0.14] rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-4 duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white/[0.06] text-sky-400 shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs tabular-nums">
                  <span className="font-semibold text-sky-400">
                    {activeEventAlert.kind === 'start'
                      ? 'Começando agora'
                      : `Em ${activeEventAlert.minutesRemaining} min`}
                  </span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-300 font-medium">
                    {activeEventAlert.event.startTime}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mt-1 leading-snug line-clamp-2">
                  {activeEventAlert.event.title}
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                  {activeEventAlert.event.location || 'Local não informado'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveEventAlert(null)}
              className="p-1.5 rounded-lg hover:bg-white/[0.07] text-zinc-400 hover:text-white transition-colors shrink-0"
              title="Dispensar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.07] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                const evt = activeEventAlert.event;
                setActiveEventAlert(null);
                setActiveDossierEvent(evt);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-200"
            >
              Ver Dossiê
            </button>
            <button
              type="button"
              onClick={() => {
                const evt = activeEventAlert.event;
                setActiveEventAlert(null);
                setActiveInsightsEvent(evt);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium ${currentTheme.primaryBtn}`}
            >
              Insights
            </button>
          </div>
        </aside>
      )}

      {/* Subtle Notice Banner */}
      {bannerNotice && (
        <div className="bg-[#1b1b1e] border-b border-white/[0.08] px-4 py-2 text-center text-xs sm:text-sm text-zinc-200 flex items-center justify-center gap-2">
          <Sparkles className={`w-3.5 h-3.5 ${currentTheme.textAccent} shrink-0`} />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 space-y-5 flex-1">
        {/* Compact Notification Permission Prompt (only when not granted & not dismissed) */}
        {config.highPriorityAlerts !== false &&
          notificationPermission !== 'granted' &&
          !notifBannerDismissed && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#1e1e21] border border-white/[0.08] text-xs text-zinc-300">
              <div className="flex items-start sm:items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <p className="font-medium text-white">
                    {notificationPermission === 'denied'
                      ? 'Notificações externas bloqueadas no navegador'
                      : isInsideIframe()
                      ? 'Ative as notificações para receber lembretes dos compromissos'
                      : 'Autorize notificações para alertas 15 min antes e na hora dos eventos'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {notificationPermission === 'default' && (
                  <button
                    type="button"
                    onClick={handleRequestNotificationPermission}
                    className={`px-3 py-1.5 rounded-xl ${currentTheme.primaryBtn} font-medium text-xs`}
                  >
                    Ativar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 font-medium text-xs"
                >
                  Testar
                </button>
                <button
                  type="button"
                  onClick={() => setNotifBannerDismissed(true)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        {/* Google Sync Bar */}
        {user && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#1e1e21] border border-white/[0.08] text-xs text-zinc-300">
            <span className="truncate">
              Sincronização ativa com Google Agenda ({user.email})
              {lastSyncTime ? ` · ${lastSyncTime}` : ''}
            </span>
            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 font-medium text-sky-400 hover:text-sky-300 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
          </div>
        )}

        {/* SECTION: Chat Scheduler First (with side-by-side Agenda on Desktop) */}
        {activeSection === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7">
              <TokiChatScheduler
                config={config}
                events={events}
                onAddEvent={handleAddEvent}
                onToggleEventCallMe={handleToggleEventCallMe}
                onUpdateEventCallOffset={handleUpdateEventCallOffset}
                onViewTodayEvents={() => {
                  setSelectedDate(getLocalDateString(0));
                  setActiveSection('agenda');
                }}
                onOpenEventInsights={(evt) => setActiveInsightsEvent(evt)}
                onOpenDetailedWrite={() => {
                  setQuickAddMode('write');
                  setPastedImageForModal(null);
                  setIsQuickAddOpen(true);
                }}
                onOpenPhotoUpload={(img) => {
                  setQuickAddMode('paste_photo');
                  setPastedImageForModal(img || null);
                  setIsQuickAddOpen(true);
                }}
                onOpenVoice={() => setIsVoiceOpen(true)}
                onTestNotification={handleTestNotification}
              />
            </div>

            <div className="hidden lg:block lg:col-span-5">
              <CalendarTimeline
                events={events}
                selectedDate={selectedDate}
                isGoogleConnected={!!user}
                auraColor={config.auraColor}
                onSelectDate={setSelectedDate}
                onOpenInsights={(evt) => setActiveInsightsEvent(evt)}
                onOpenDossier={(evt) => setActiveDossierEvent(evt)}
                onOpenOutreach={(evt) => setActiveOutreachEvent(evt)}
                onDeleteEvent={handleDeleteEvent}
                onResolveConflicts={handleResolveConflicts}
                onUpdatePriority={handleUpdatePriority}
                onToggleCallMe={handleToggleEventCallMe}
                onUpdateCallOffset={handleUpdateEventCallOffset}
              />
            </div>
          </div>
        )}

        {/* SECTION: Agenda */}
        {activeSection === 'agenda' && (
          <div className="max-w-4xl mx-auto">
            <CalendarTimeline
              events={events}
              selectedDate={selectedDate}
              isGoogleConnected={!!user}
              auraColor={config.auraColor}
              onSelectDate={setSelectedDate}
              onOpenInsights={(evt) => setActiveInsightsEvent(evt)}
              onOpenDossier={(evt) => setActiveDossierEvent(evt)}
              onOpenOutreach={(evt) => setActiveOutreachEvent(evt)}
              onDeleteEvent={handleDeleteEvent}
              onResolveConflicts={handleResolveConflicts}
              onUpdatePriority={handleUpdatePriority}
              onToggleCallMe={handleToggleEventCallMe}
              onUpdateCallOffset={handleUpdateEventCallOffset}
            />
          </div>
        )}

        {/* SECTION: Tasks */}
        {activeSection === 'tasks' && (
          <div className="max-w-3xl mx-auto">
            <TaskPriorityList
              tasks={tasks}
              auraColor={config.auraColor}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        )}

        {/* SECTION: Briefing */}
        {activeSection === 'briefing' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <DailyBriefingCard
              config={config}
              events={events}
              tasks={tasks}
              onOpenCall={() => handleTestScheduledCall(null)}
            />
            <TaskPriorityList
              tasks={tasks}
              auraColor={config.auraColor}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        )}

        {/* SECTION: Profile & Settings */}
        {activeSection === 'profile' && (
          <ProfileSettingsView
            config={config}
            events={events}
            user={user}
            notificationPermission={notificationPermission}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onGoogleSignIn={handleGoogleSignIn}
            onGoogleSignOut={handleGoogleSignOut}
            onRequestNotificationPermission={handleRequestNotificationPermission}
            onTestNotification={handleTestNotification}
            onTestScheduledCall={() => handleTestScheduledCall(null)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (5 icons matching reference screenshots) */}
      <nav
        aria-label="Navegação móvel"
        className="lg:hidden fixed bottom-3 left-3 right-3 z-40 rounded-full bg-[#1e1e21]/95 border border-white/[0.1] backdrop-blur-xl px-2 py-1.5 shadow-2xl flex items-center justify-around"
      >
        {mobileTabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              aria-label={tab.label}
              className={`flex items-center justify-center w-14 h-11 rounded-full transition-colors ${
                isActive ? 'bg-white/[0.12] text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.icon}
            </button>
          );
        })}
      </nav>

      {/* MODALS */}
      <LiveVoiceOrbModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        config={config}
        events={events}
        tasks={tasks}
        onAddEvent={handleAddEvent}
        onResolveConflicts={handleResolveConflicts}
      />

      <IncomingCallModal
        isOpen={isCallOpen}
        onClose={() => {
          setIsCallOpen(false);
          setActiveCallEvent(null);
        }}
        config={config}
        events={events}
        tasks={tasks}
        callReason={callReason}
        event={activeCallEvent}
      />

      <VisionDropModal
        isOpen={isVisionOpen}
        onClose={() => setIsVisionOpen(false)}
        onAddEvent={handleAddEvent}
      />

      <QuickAddEventModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAddEvent={handleAddEvent}
        defaultDate={selectedDate}
        initialMode={quickAddMode}
        initialPastedImage={pastedImageForModal}
      />

      <MeetingInsightsModal
        isOpen={!!activeInsightsEvent}
        onClose={() => setActiveInsightsEvent(null)}
        event={activeInsightsEvent}
        config={config}
        onAddTasks={(newTasks) => {
          setTasks((prev) => [...newTasks, ...prev]);
          setBannerNotice(`${newTasks.length} tarefa(s) adicionada(s).`);
          setTimeout(() => setBannerNotice(null), 3500);
        }}
        onUpdateEventNotes={(eventId, notes, insights) => {
          setEvents((prev) =>
            prev.map((e) => (e.id === eventId ? { ...e, notes, insights } : e))
          );
        }}
        onOpenOutreachWithNotes={(event) => {
          setActiveInsightsEvent(null);
          setActiveOutreachEvent(event);
        }}
        onScheduleFollowUp={(title, daysLater) => {
          const d = new Date();
          d.setDate(d.getDate() + daysLater);
          const targetDate = formatLocalDateFromDate(d);
          handleAddEvent({
            id: 'followup-' + Date.now(),
            title,
            date: targetDate,
            startTime: '10:00',
            endTime: '10:30',
            category: 'meeting',
            location: 'Google Meet',
            description: `Reunião de acompanhamento para ${activeInsightsEvent?.title}`,
            priority: 'high',
            status: 'confirmed',
          });
          setActiveInsightsEvent(null);
        }}
      />

      <MeetingPrepModal
        isOpen={!!activeDossierEvent}
        onClose={() => setActiveDossierEvent(null)}
        event={activeDossierEvent}
      />

      <OutreachDraftModal
        isOpen={!!activeOutreachEvent}
        onClose={() => setActiveOutreachEvent(null)}
        event={activeOutreachEvent}
      />

      <AssistantSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onUpdateConfig={setConfig}
        onTestNotification={handleTestNotification}
        onTestScheduledCall={() => handleTestScheduledCall(null)}
      />

      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.confirmLabel}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
