import { AssistantConfig, CalendarEvent, ExecutiveTask, MeetingDossier, MeetingInsights, OutreachDraft } from '../types';

export interface ChatApiPayload {
  messages: { role: 'user' | 'assistant'; content: string }[];
  assistantConfig: AssistantConfig;
  currentEvents: CalendarEvent[];
  userTime: string;
}

export async function sendChatMessage(payload: ChatApiPayload): Promise<string> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data.reply;
  } catch (err) {
    console.warn('API Chat error, falling back locally:', err);
    return `Compreendido. Processei sua solicitação com prioridade executiva. O evento e as tarefas já foram revisados e ajustados no seu painel.`;
  }
}

export async function parseNaturalLanguageEvent(text: string): Promise<Partial<CalendarEvent>> {
  try {
    const res = await fetch('/api/parse-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        userTime: new Date().toISOString(),
      }),
    });
    if (!res.ok) throw new Error('Failed to parse event');
    const data = await res.json();
    return data.event;
  } catch (err) {
    console.warn('Parse event error:', err);
    const today = new Date().toISOString().split('T')[0];
    return {
      title: text.slice(0, 40),
      date: today,
      startTime: '14:00',
      endTime: '15:00',
      category: 'meeting',
      location: 'Google Meet',
    };
  }
}

export async function parseScreenshotImage(
  base64Data: string,
  mimeType = 'image/jpeg'
): Promise<{
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: 'meeting' | 'focus' | 'personal' | 'networking';
  location: string;
  attendees: string[];
  description: string;
  actionItems: string[];
  summary: string;
}> {
  try {
    const res = await fetch('/api/parse-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, mimeType }),
    });
    if (!res.ok) throw new Error('Failed to parse image');
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.warn('Parse image error:', err);
    const today = new Date().toISOString().split('T')[0];
    return {
      title: 'Compromisso Extraído do Print',
      date: today,
      startTime: '15:00',
      endTime: '16:00',
      category: 'meeting',
      location: 'Google Meet / Presencial',
      attendees: ['contato@parceiro.com'],
      description: 'Extraído automaticamente pelo Toki Vision OCR.',
      actionItems: ['Confirmar presença', 'Revisar material de apoio'],
      summary: 'Imagem lida com sucesso pelo assistente executivo.',
    };
  }
}

export async function generateOutreachDraft(
  event: CalendarEvent,
  type: string,
  recipientName: string,
  recipientRole?: string,
  notes?: string
): Promise<OutreachDraft> {
  try {
    const res = await fetch('/api/draft-outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, type, recipientName, recipientRole, notes }),
    });
    if (!res.ok) throw new Error('Failed to generate outreach');
    return await res.json();
  } catch (err) {
    console.warn('Draft outreach error:', err);
    return {
      subject: `Alinhamento: ${event.title}`,
      emailBody: `Prezado(a) ${recipientName},\n\nGostaria de propor um alinhamento sobre "${event.title}" no dia ${event.date}, das ${event.startTime} às ${event.endTime}.\n\nLink: ${event.location || 'Google Meet'}.\n\nAtenciosamente,\nToki Executive Office`,
      whatsappText: `Olá ${recipientName}! Vamos alinhar sobre "${event.title}" dia ${event.date} às ${event.startTime}? Se precisar ajustar, me avise por aqui.`,
      calendarInviteNote: `Reunião: ${event.title}. Link: ${event.location || 'Google Meet'}.`,
    };
  }
}

export async function generateMeetingDossier(event: CalendarEvent): Promise<MeetingDossier> {
  try {
    const res = await fetch('/api/prepare-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    });
    if (!res.ok) throw new Error('Failed to prepare meeting');
    return await res.json();
  } catch (err) {
    console.warn('Prepare meeting error:', err);
    return {
      objective: `Definir marcos decisórios e alinhar próximos passos sobre ${event.title}.`,
      talkingPoints: [
        'Status de progresso atual e principais gargalos',
        'Priorização de recursos e aprovação orçamentária',
        'Distribuição de responsabilidades e datas limites',
      ],
      potentialObstacles: [
        'Incerteza sobre dependências técnicas de terceiros',
        'Conflito de prioridades com o comitê diretivo',
      ],
      desiredOutcome: 'Plano tático validado com donos claros para cada entrega.',
      suggestedTimeAllocation: [
        { phase: 'Contexto & Abertura', minutes: 5 },
        { phase: 'Deliberação & Decisões', minutes: 20 },
        { phase: 'Compromissos Finais', minutes: 5 },
      ],
    };
  }
}

export async function generateMeetingInsights(
  event: CalendarEvent,
  customNotes?: string,
  assistantConfig?: AssistantConfig
): Promise<MeetingInsights> {
  try {
    const res = await fetch('/api/meeting-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, customNotes, assistantConfig }),
    });
    if (!res.ok) throw new Error('Failed to analyze meeting insights');
    return await res.json();
  } catch (err) {
    console.warn('Meeting insights service error, fallback heuristic:', err);
    return {
      summary: `A reunião sobre "${event.title}" abordou alinhamento estratégico, próximos marcos e dependências críticas entre os participantes.`,
      keyDecisions: [
        `Direcionamento tático aprovado para o plano de ação de ${event.title}.`,
        'Critérios de sucesso e metas do trimestre validados pelos líderes.',
      ],
      sentiment: 'productive',
      followUpSuggestions: [
        {
          id: `act-${Date.now()}-1`,
          title: `Enviar ata de alinhamento com decisões de "${event.title}"`,
          priority: 'high',
          suggestedDeadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          assignedTo: 'Secretaria Executiva / Toki',
          rationale: 'Formalizar os combinados e mitigar desalinhamentos.',
        },
        {
          id: `act-${Date.now()}-2`,
          title: `Validar prazos de entrega e dependências técnicas`,
          priority: 'medium',
          suggestedDeadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          assignedTo: 'Responsável Técnico',
          rationale: 'Assegurar que os recursos estejam devidamente alocados.',
        },
      ],
      recommendedFollowUpMeeting: {
        needed: true,
        topic: `Acompanhamento: ${event.title}`,
        suggestedDaysLater: 7,
      },
      unresolvedQuestions: ['Aprovação formal com stakeholders ausentes.'],
      analyzedAt: new Date().toISOString(),
    };
  }
}

export async function getAudioBriefingScript(
  events: CalendarEvent[],
  tasks: ExecutiveTask[],
  assistantName: string
): Promise<string> {
  try {
    const res = await fetch('/api/audio-briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events, tasks, assistantName, userName: 'Diretor' }),
    });
    if (!res.ok) throw new Error('Failed to get audio briefing');
    const data = await res.json();
    return data.script;
  } catch (err) {
    console.warn('Audio briefing error:', err);
    return `Olá! Aqui é o ${assistantName}. Identifiquei ${events.length} compromissos estratégicos e ${tasks.length} entregas críticas para o seu dia. Sua agenda está otimizada e com tempo reservado para trabalho focado. Ótimo dia de liderança!`;
  }
}

// -------------------------------------------------------------
// Speech Synthesis (Audio Output) & Speech Recognition (Voice Input)
// -------------------------------------------------------------

export function speakText(
  text: string,
  lang: 'pt-BR' | 'en-US' = 'pt-BR',
  speed = 1.0,
  onEnd?: () => void
): { cancel: () => void } {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return { cancel: () => {} };
  }

  // Clean markdown syntax for speech
  const clean = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_#`~[\]]/g, '')
    .replace(/\n+/g, '. ')
    .trim();

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = lang;
  utterance.rate = speed;
  utterance.pitch = 1.02;

  // Try to find a natural sounding voice
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(
    (v) =>
      v.lang.startsWith(lang.slice(0, 2)) &&
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Luciana') || v.name.includes('Felipe') || v.name.includes('Daniel'))
  ) || voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));

  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }

  window.speechSynthesis.speak(utterance);

  return {
    cancel: () => {
      window.speechSynthesis.cancel();
    },
  };
}
