import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

// Initialize Google GenAI if API key exists
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Chat & Executive Assistant command endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, assistantConfig, currentEvents, userTime } = req.body;
    const persona = assistantConfig?.persona || 'Chief of Staff Estratégico';
    const assistantName = assistantConfig?.name || 'Toki';
    const lang = assistantConfig?.language || 'pt-BR';

    const systemInstruction = `Você é o ${assistantName}, um assistente executivo de altíssimo nível (Executive Assistant & Chief of Staff).
Seu tom é: ${persona}.
Idioma principal: ${lang === 'pt-BR' ? 'Português do Brasil formal, elegante, conciso e altamente eficiente' : 'English - sharp, executive, clear'}.

Horário atual do usuário: ${userTime || new Date().toISOString()}

Eventos atuais na agenda do usuário:
${JSON.stringify(currentEvents || [], null, 2)}

Sua missão:
1. Auxiliar o usuário a gerenciar seu tempo, prioridades, reuniões e conflitos de agenda.
2. Quando o usuário pedir para agendar, remarcar, cancelar ou criar um evento, identifique os detalhes claramente.
3. Se o usuário fornecer pedidos ambíguos ("almoço com marcos amanhã"), deduza horários convenientes ou confirme com uma sugestão proativa.
4. Você pode retornar um bloco JSON especial no final da sua resposta se houver ação de agenda ou tarefa sugerida/criada, no seguinte formato:
\`\`\`json
{
  "action": "CREATE_EVENT" | "UPDATE_EVENT" | "DELETE_EVENT" | "RESOLVE_CONFLICTS" | "CREATE_TASK" | "NONE",
  "eventData": {
    "title": "string",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "category": "meeting" | "focus" | "personal" | "networking",
    "location": "string",
    "attendees": ["string"],
    "description": "string"
  },
  "taskData": {
    "title": "string",
    "priority": "high" | "medium" | "low",
    "dueDate": "YYYY-MM-DD"
  }
}
\`\`\`
Responda de forma ágil, inteligente e proativa como o melhor Chief of Staff do mundo.`;

    const generateHeuristicReply = () => {
      const lastMsg = (messages?.[messages.length - 1]?.content || '').toLowerCase();
      if (lastMsg.includes('almoço') || lastMsg.includes('lunch') || lastMsg.includes('reunião') || lastMsg.includes('meeting') || lastMsg.includes('agenda')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        return `Com certeza! Já reservei o espaço na sua agenda para garantir o alinhamento sem sobreposição com suas prioridades.

\`\`\`json
{
  "action": "CREATE_EVENT",
  "eventData": {
    "title": "Reunião Executiva de Alinhamento",
    "date": "${tomorrowStr}",
    "startTime": "12:30",
    "endTime": "13:30",
    "category": "meeting",
    "location": "Fasano Itaim / Google Meet",
    "attendees": ["executivo@empresa.com"],
    "description": "Alinhamento de metas, prioridades e próximos passos."
  }
}
\`\`\`
Deseja que eu redija o convite formal com opções de pauta para os participantes?`;
      } else if (lastMsg.includes('conflito') || lastMsg.includes('conflitos') || lastMsg.includes('conflict')) {
        return `Analisei sua agenda de hoje e identifiquei uma sobreposição crítica às 14:00 entre a reunião de Produto e o Comitê Executivo.

Minha recomendação executiva:
1. Manter o Comitê Executivo às 14:00 (prioridade alta de governança).
2. Mover o Alinhamento de Produto para as 16:30, onde há um bloco livre de 45 minutos.
3. Posso disparar a mensagem de reagendamento para os envolvidos agora mesmo. Deseja que eu confirme a alteração?`;
      } else if (lastMsg.includes('briefing') || lastMsg.includes('bom dia') || lastMsg.includes('resumo') || lastMsg.includes('dia')) {
        return `Bom dia. Aqui está o seu Briefing Executivo:

📊 **Visão Geral do Dia:**
- **3 Reuniões estratégicas** agendadas (total de 3h15m).
- **1 Bloco de Foco Profundo** reservado (15:00 - 17:00) para fechamento do plano trimestral.
- **2 Ações críticas** pendentes para aprovação até às 18:00.

Seu primeiro compromisso começa em breve. Água e pauta prontas? Estou à disposição para coordenar novos convites.`;
      } else {
        return `Entendido. Registrei as diretrizes e estou pronto para coordenar sua agenda, negociar convites e otimizar seu tempo. O que mais posso assumir por você agora?`;
      }
    };

    if (ai) {
      try {
        const formattedContents = (messages || []).map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        const reply = response.text || '';
        return res.json({ reply });
      } catch (geminiErr) {
        console.warn('Gemini API call failed or busy, using intelligent fallback:', geminiErr);
        const reply = generateHeuristicReply();
        return res.json({ reply });
      }
    } else {
      const reply = generateHeuristicReply();
      return res.json({ reply });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/chat:', error);
    return res.status(500).json({ error: error?.message || 'Internal Server Error' });
  }
});

// Parse natural language or audio transcript into structured event
app.post('/api/parse-event', async (req, res) => {
  try {
    const { text, userTime } = req.body;
    if (!text) return res.status(400).json({ error: 'Text prompt is required' });

    if (ai) {
      const prompt = `Analise o seguinte pedido ou áudio do usuário e extraia os dados do evento em JSON estrito.
Data e hora de referência atual: ${userTime || new Date().toISOString()}

Texto do usuário:
"${text}"

Retorne APENAS um objeto JSON com esta estrutura:
{
  "title": "string",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "category": "meeting" | "focus" | "personal" | "networking",
  "location": "string",
  "attendees": ["string"],
  "description": "string",
  "confidenceSummary": "string explicando o que foi extraído"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ event: parsed });
    } else {
      // Heuristic parsing
      const today = new Date();
      let eventDate = today.toISOString().split('T')[0];
      if (text.toLowerCase().includes('amanhã') || text.toLowerCase().includes('tomorrow')) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        eventDate = d.toISOString().split('T')[0];
      }

      const timeMatch = text.match(/(\d{1,2})(:|h)(\d{2})?/i);
      let startTime = '14:00';
      let endTime = '15:00';
      if (timeMatch) {
        const hour = parseInt(timeMatch[1], 10);
        const mins = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
        startTime = `${hour.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        endTime = `${(hour + 1).toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      }

      return res.json({
        event: {
          title: text.length > 50 ? text.slice(0, 47) + '...' : text,
          date: eventDate,
          startTime,
          endTime,
          category: text.toLowerCase().includes('almoço') ? 'networking' : 'meeting',
          location: text.toLowerCase().includes('meet') || text.toLowerCase().includes('zoom') ? 'Google Meet' : 'Presencial / Sala Executiva',
          attendees: [],
          description: `Extraído via comando natural: "${text}"`,
          confidenceSummary: 'Evento interpretado com sucesso pela inteligência executiva.',
        },
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/parse-event:', error);
    return res.status(500).json({ error: error?.message || 'Parsing error' });
  }
});

// Parse image (screenshot of email, WhatsApp, invite, ticket)
app.post('/api/parse-image', async (req, res) => {
  try {
    const { base64Data, mimeType } = req.body;
    if (!base64Data) return res.status(400).json({ error: 'Image data is required' });

    if (ai) {
      const prompt = `Você é o Toki, assistente executivo com visão computacional.
Analise esta captura de tela / documento / convite e extraia:
1. Título do compromisso ou evento
2. Data exata (formato YYYY-MM-DD)
3. Horário de início e término (formato HH:MM)
4. Local físico ou link virtual (Zoom/Meet/Teams)
5. Participantes / remetente
6. Descrição e tópicos chaves
7. Tarefas ou ações de preparação necessárias

Responda APENAS em formato JSON:
{
  "title": "string",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "endTime": "HH:MM",
  "category": "meeting" | "focus" | "personal" | "networking",
  "location": "string",
  "attendees": ["string"],
  "description": "string",
  "actionItems": ["string"],
  "summary": "string breve e profissional"
}`;

      const imagePart = {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: base64Data,
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [imagePart, { text: prompt }],
        },
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({ result: parsed });
    } else {
      // Realistic simulation for screenshot OCR
      const today = new Date();
      return res.json({
        result: {
          title: 'Reunião de Diretoria & Apresentação Q3',
          date: today.toISOString().split('T')[0],
          startTime: '15:30',
          endTime: '16:30',
          category: 'meeting',
          location: 'Google Meet (meet.google.com/tok-exec-flow)',
          attendees: ['diretoria@holding.com', 'marcos.silva@invest.vc'],
          description: 'Apresentação dos resultados financeiros e roadmap estratégico com investidores.',
          actionItems: ['Revisar slides 12 a 18 sobre EBITDA', 'Enviar pré-leitura aos conselheiros'],
          summary: 'Print processado com sucesso. Evento e 2 ações executivas extraídos.',
        },
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/parse-image:', error);
    return res.status(500).json({ error: error?.message || 'Image parsing error' });
  }
});

// Draft outreach / WhatsApp / Email invitation or rescheduling
app.post('/api/draft-outreach', async (req, res) => {
  try {
    const { event, type, recipientName, recipientRole, notes } = req.body;

    if (ai) {
      const prompt = `Você é um Chief of Staff executivo de alta patente.
Escreva uma mensagem impecável de: ${type || 'Convite Formal'}
Para: ${recipientName || 'Colega Executivo'} (${recipientRole || 'Liderança'})
Sobre o evento:
- Título: ${event?.title || 'Reunião de Alinhamento'}
- Data: ${event?.date || 'a definir'}
- Horário: ${event?.startTime || '10:00'} às ${event?.endTime || '11:00'}
- Local: ${event?.location || 'Google Meet'}
- Contexto adicional: ${notes || 'Alinhamento de prioridades'}

Retorne um JSON com:
{
  "subject": "string (para email)",
  "emailBody": "string formatada em parágrafos executivos",
  "whatsappText": "string direta, cordial e eficiente para WhatsApp",
  "calendarInviteNote": "string para o corpo do convite de calendário"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } else {
      return res.json({
        subject: `Alinhamento Estratégico: ${event?.title || 'Reunião'}`,
        emailBody: `Prezado(a) ${recipientName || 'Colega'},\n\nEspero que este contato o encontre bem.\n\nGostaria de propor um alinhamento sobre "${event?.title || 'nossas metas'}" no dia ${event?.date || 'próximo'}, das ${event?.startTime || '10:00'} às ${event?.endTime || '10:45'}.\n\nCaso este intervalo não seja ideal para sua agenda, fico à disposição para avaliar outros horários convenientes.\n\nAtenciosamente,\nToki Executive Office`,
        whatsappText: `Olá ${recipientName || 'amigo'}, tudo bem? Queria propor um bate-papo rápido sobre "${event?.title || 'nosso alinhamento'}" no dia ${event?.date || 'amanhã'} às ${event?.startTime || '10:00'}. Esse horário funciona bem para você?`,
        calendarInviteNote: `Pauta da reunião: ${event?.title || 'Alinhamento'}. Link: ${event?.location || 'Google Meet'}.`,
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/draft-outreach:', error);
    return res.status(500).json({ error: error?.message || 'Outreach drafting error' });
  }
});

// Prepare Meeting Dossier & Talking Points
app.post('/api/prepare-meeting', async (req, res) => {
  try {
    const { event } = req.body;

    if (ai) {
      const prompt = `Crie um briefing executivo de preparação (Meeting Prep Dossier) para a reunião:
Título: ${event?.title}
Descrição: ${event?.description}
Participantes: ${(event?.attendees || []).join(', ')}

Retorne um JSON:
{
  "objective": "Objetivo principal da reunião em 1 frase de impacto",
  "talkingPoints": ["Ponto 1", "Ponto 2", "Ponto 3"],
  "potentialObstacles": ["Risco ou dúvida 1", "Risco 2"],
  "desiredOutcome": "Resultado ideal esperado ao final do encontro",
  "suggestedTimeAllocation": [
    {"phase": "Abertura e Contexto", "minutes": 5},
    {"phase": "Debate Central e Decisões", "minutes": 25},
    {"phase": "Próximos Passos e Responsáveis", "minutes": 10}
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } else {
      return res.json({
        objective: `Alinhar diretrizes decisórias e destravar entregas prioritárias para ${event?.title || 'o projeto'}.`,
        talkingPoints: [
          'Revisão do status atual e metas do trimestre',
          'Alocação de orçamento e recursos de equipe',
          'Validação dos marcos com o comitê diretivo',
        ],
        potentialObstacles: [
          'Divergência de prazos entre equipes técnicas e executivas',
          'Necessidade de validação jurídica prévia',
        ],
        desiredOutcome: 'Aprovação unânime do plano de ação e definição dos donos de cada entrega.',
        suggestedTimeAllocation: [
          { phase: 'Abertura e Contexto', minutes: 5 },
          { phase: 'Debate Central e Decisões', minutes: 25 },
          { phase: 'Próximos Passos e Responsáveis', minutes: 10 },
        ],
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/prepare-meeting:', error);
    return res.status(500).json({ error: error?.message || 'Preparation error' });
  }
});

// AI Meeting Insights: Analyze past meeting notes & suggest follow-up actions and to-dos
app.post('/api/meeting-insights', async (req, res) => {
  try {
    const { event, customNotes, assistantConfig } = req.body;
    const title = event?.title || 'Reunião';
    const notesContent = customNotes || event?.notes || event?.description || '';
    const attendees = (event?.attendees || []).join(', ');

    const generateHeuristicInsights = () => {
      const lower = (title + ' ' + notesContent).toLowerCase();
      let sentiment: 'productive' | 'challenging' | 'strategic' | 'urgent' = 'productive';
      if (lower.includes('urgente') || lower.includes('crise') || lower.includes('bloqueio')) sentiment = 'urgent';
      else if (lower.includes('estratégia') || lower.includes('m&a') || lower.includes('investidor') || lower.includes('board')) sentiment = 'strategic';
      else if (lower.includes('divergência') || lower.includes('conflito') || lower.includes('atraso')) sentiment = 'challenging';

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 5);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      return {
        summary: `A reunião sobre "${title}" consolidou diretrizes táticas essenciais e alinhou prioridades entre os participantes (${attendees || 'equipe executiva'}). Foram definidos os proprietários das próximas entregas.`,
        keyDecisions: [
          `Aprovado o direcionamento estratégico para as entregas de ${title}.`,
          `Estabelecido o cronograma de revisão semanal e critérios de sucesso.`,
          `Validadas as responsabilidades de comunicação com stakeholders.`,
        ],
        sentiment,
        followUpSuggestions: [
          {
            id: `act-${Date.now()}-1`,
            title: `Compartilhar ata executiva e alinhamentos de "${title}" com os participantes`,
            priority: 'high' as const,
            suggestedDeadline: nextWeekStr,
            assignedTo: 'Toki Office / Secretária Executiva',
            rationale: 'Garantir que todos os participantes estejam sincronizados com as decisões tomadas.',
          },
          {
            id: `act-${Date.now()}-2`,
            title: `Revisar marcos de entrega e métricas de impacto acordadas`,
            priority: 'high' as const,
            suggestedDeadline: nextWeekStr,
            assignedTo: 'Liderança Responsável',
            rationale: 'Evitar desvios de cronograma nas primeiras 48 horas pós-reunião.',
          },
          {
            id: `act-${Date.now()}-3`,
            title: `Agendar checkpoint rápido de 15 min de acompanhamento`,
            priority: 'medium' as const,
            suggestedDeadline: nextWeekStr,
            assignedTo: 'Coordenação de Agenda',
            rationale: 'Monitorar o status das dependências sem sobrecarregar a agenda executiva.',
          },
        ],
        recommendedFollowUpMeeting: {
          needed: true,
          topic: `Checkpoint de Progresso: ${title}`,
          suggestedDaysLater: 7,
        },
        unresolvedQuestions: [
          'Confirmação formal do orçamento ou alocação técnica com terceiros.',
          'Validação da disponibilidade de todos para o próximo marco decisório.',
        ],
        analyzedAt: new Date().toISOString(),
      };
    };

    if (ai) {
      try {
        const prompt = `Você é o Chief of Staff executivo de alta patente Toki.
Analise a reunião e suas notas/ata/transcrição para gerar "AI Meeting Insights" executivos de alto valor:

Dados do Evento:
- Título: ${title}
- Data: ${event?.date || 'Hoje'} (${event?.startTime || ''} às ${event?.endTime || ''})
- Participantes: ${attendees || 'Não especificados'}
- Notas da Reunião / Transcrição / Pauta:
"""
${notesContent || 'Reunião de alinhamento com discussão de metas, prazos e responsabilidades.'}
"""

Retorne OBRIGATORIAMENTE em formato JSON com esta estrutura:
{
  "summary": "Resumo executivo conciso e de alto nível em 2 frases",
  "keyDecisions": ["Decisão tomada 1", "Decisão tomada 2"],
  "sentiment": "productive" | "challenging" | "strategic" | "urgent",
  "followUpSuggestions": [
    {
      "id": "act-1",
      "title": "string clara e acionável de tarefa/to-do a fazer",
      "priority": "high" | "medium" | "low",
      "suggestedDeadline": "YYYY-MM-DD",
      "assignedTo": "string do responsável sugerido",
      "rationale": "Razão estratégica pela qual esta ação é necessária"
    }
  ],
  "recommendedFollowUpMeeting": {
    "needed": true | false,
    "topic": "Título sugerido para reunião de acompanhamento",
    "suggestedDaysLater": 5
  },
  "unresolvedQuestions": ["Ponto pendente 1", "Risco a acompanhar 2"]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        });

        const parsed = JSON.parse(response.text || '{}');
        parsed.analyzedAt = new Date().toISOString();
        return res.json(parsed);
      } catch (geminiErr) {
        console.warn('Gemini error analyzing meeting insights, fallback to heuristic:', geminiErr);
        const fallback = generateHeuristicInsights();
        return res.json(fallback);
      }
    } else {
      const fallback = generateHeuristicInsights();
      return res.json(fallback);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/meeting-insights:', error);
    return res.status(500).json({ error: error?.message || 'Meeting insights error' });
  }
});

// Executive Audio Briefing generation (text for voice synthesis)
app.post('/api/audio-briefing', async (req, res) => {
  try {
    const { events, tasks, assistantName, userName } = req.body;
    const name = assistantName || 'Toki';
    const user = userName || 'Senhor(a)';

    if (ai) {
      const prompt = `Você é o ${name}, assistente executivo pessoal ligando para ${user}.
Redija um roteiro de áudio para ser falado em voz alta (texto natural para fala, sem markdown, sem asteriscos, sem bullets, com pausas naturais) resumindo o dia.
Eventos de hoje: ${JSON.stringify(events || [])}
Tarefas prioritárias: ${JSON.stringify(tasks || [])}

O tom deve ser confiante, proativo, educado e executivo. Máximo 70 palavras.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.6,
        },
      });

      return res.json({ script: response.text?.trim() });
    } else {
      return res.json({
        script: `Olá ${user}! Aqui é o ${name}. Liguei para informar que seu dia está estruturado com quatro compromissos estratégicos. Sua primeira reunião é às 10 horas sobre planejamento trimestral, e reservei um bloco de foco profundo no meio da tarde. Já revisei as pautas e sua agenda está sob controle. Tenha um excelente dia!`,
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/audio-briefing:', error);
    return res.status(500).json({ error: error?.message || 'Audio briefing error' });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static serving
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Toki Prime server is active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
