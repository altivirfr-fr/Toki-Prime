export type EventCategory = 'meeting' | 'focus' | 'personal' | 'networking' | 'urgent';

export interface SuggestedActionItem {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  suggestedDeadline?: string;
  assignedTo?: string;
  rationale: string;
}

export interface MeetingInsights {
  summary: string;
  keyDecisions: string[];
  sentiment: 'productive' | 'challenging' | 'strategic' | 'urgent';
  followUpSuggestions: SuggestedActionItem[];
  recommendedFollowUpMeeting?: {
    needed: boolean;
    topic?: string;
    suggestedDaysLater?: number;
  };
  unresolvedQuestions: string[];
  analyzedAt?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  category: EventCategory;
  location?: string;
  attendees?: string[];
  description?: string;
  notes?: string; // Meeting notes, transcript, or bullet points
  insights?: MeetingInsights; // AI Meeting Insights
  isConflict?: boolean;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  priority?: 'high' | 'medium' | 'low';
  callMe?: boolean; // Toggle "Me Ligue" por compromisso
  callMinutesBefore?: number; // Minutos antes para o Toki ligar (0 = na hora, 1, 5, 15, 30)
  googleEventId?: string;
  syncedWithGoogle?: boolean;
  googleHtmlLink?: string;
  syncStatus?: 'synced' | 'local_only' | 'syncing' | 'conflict';
}

export interface ExecutiveTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  dueDate: string;
  relatedEventId?: string;
  delegatedTo?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  eventId?: string; // Renders interactive event card inside chat
  actionTaken?: {
    type: 'CREATE_EVENT' | 'UPDATE_EVENT' | 'DELETE_EVENT' | 'RESOLVE_CONFLICTS' | 'CREATE_TASK' | 'NONE';
    eventData?: Partial<CalendarEvent>;
    taskData?: Partial<ExecutiveTask>;
  };
}

export type AssistantPersona =
  | 'Chief of Staff Estratégico'
  | 'Coordenador Diplomático'
  | 'Tech Founder Partner'
  | 'Diretor de Operações';

export type AuraColor = 'violet' | 'emerald' | 'amber' | 'blue' | 'rose';

export interface AssistantConfig {
  name: string;
  persona: AssistantPersona;
  language: 'pt-BR' | 'en-US';
  auraColor: AuraColor;
  voiceSpeed: number; // 0.8 to 1.3
  proactiveBriefing: boolean;
  callAlerts: boolean;
  scheduledCallTime?: string; // HH:MM, ex: '08:30' (horário programado para o Toki ligar)
  highPriorityAlerts?: boolean;
  notifyAllEvents?: boolean; // Notificar todos os compromissos (não apenas alta prioridade)
  notifyAtStart?: boolean; // Notificar também no horário exato de início (0 min)
}

export interface MeetingDossier {
  objective: string;
  talkingPoints: string[];
  potentialObstacles: string[];
  desiredOutcome: string;
  suggestedTimeAllocation: {
    phase: string;
    minutes: number;
  }[];
}

export interface OutreachDraft {
  subject: string;
  emailBody: string;
  whatsappText: string;
  calendarInviteNote: string;
}
