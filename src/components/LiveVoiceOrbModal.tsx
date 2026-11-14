import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Send, 
  Calendar, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { AssistantConfig, CalendarEvent, ExecutiveTask } from '../types';
import { sendChatMessage, speakText } from '../services/geminiService';
import { getTheme } from '../utils/theme';

interface LiveVoiceOrbModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AssistantConfig;
  events: CalendarEvent[];
  tasks: ExecutiveTask[];
  onAddEvent: (event: CalendarEvent) => void;
  onResolveConflicts: () => void;
}

export const LiveVoiceOrbModal: React.FC<LiveVoiceOrbModalProps> = ({
  isOpen,
  onClose,
  config,
  events,
  tasks,
  onAddEvent,
  onResolveConflicts,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState(
    `Estou pronto. O que deseja que eu resolva na sua agenda ou prioridades agora?`
  );
  const [manualText, setManualText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const currentTheme = getTheme(config.auraColor);

  const recognitionRef = useRef<any>(null);
  const speakerCancelRef = useRef<{ cancel: () => void } | null>(null);

  // Initialize SpeechRecognition if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = config.language;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          if (transcript.trim()) {
            handleProcessCommand(transcript);
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (speakerCancelRef.current) {
        speakerCancelRef.current.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [config.language, transcript]);

  // Clean audio on close
  useEffect(() => {
    if (!isOpen) {
      if (speakerCancelRef.current) speakerCancelRef.current.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      setIsSpeaking(false);
    }
  }, [isOpen]);

  const toggleListening = () => {
    if (speakerCancelRef.current) {
      speakerCancelRef.current.cancel();
      setIsSpeaking(false);
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Could not start speech recognition, using fallback prompt', err);
        setIsListening(false);
      }
    }
  };

  const handleProcessCommand = async (commandText: string) => {
    if (!commandText.trim()) return;
    setIsThinking(true);
    setTranscript(commandText);

    try {
      const reply = await sendChatMessage({
        messages: [{ role: 'user', content: commandText }],
        assistantConfig: config,
        currentEvents: events,
        userTime: new Date().toISOString(),
      });

      // Check if reply contains a JSON action
      const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
      let cleanedReply = reply;
      if (jsonMatch) {
        try {
          const actionData = JSON.parse(jsonMatch[1]);
          cleanedReply = reply.replace(/```json[\s\S]*?```/, '').trim();

          if (actionData.action === 'CREATE_EVENT' && actionData.eventData) {
            const newEvt: CalendarEvent = {
              id: 'evt-' + Date.now(),
              title: actionData.eventData.title || 'Novo Compromisso',
              date: actionData.eventData.date || new Date().toISOString().split('T')[0],
              startTime: actionData.eventData.startTime || '14:00',
              endTime: actionData.eventData.endTime || '15:00',
              category: actionData.eventData.category || 'meeting',
              location: actionData.eventData.location || 'Google Meet',
              attendees: actionData.eventData.attendees || [],
              description: actionData.eventData.description || 'Criado via comando de voz Toki',
            };
            onAddEvent(newEvt);
          } else if (actionData.action === 'RESOLVE_CONFLICTS') {
            onResolveConflicts();
          }
        } catch (e) {
          console.warn('Could not parse action json:', e);
        }
      }

      setLastResponse(cleanedReply);
      setIsThinking(false);

      if (soundEnabled) {
        setIsSpeaking(true);
        speakerCancelRef.current = speakText(
          cleanedReply,
          config.language,
          config.voiceSpeed,
          () => setIsSpeaking(false)
        );
      }
    } catch (err) {
      setIsThinking(false);
      setLastResponse('Houve uma oscilação na rede, mas já retomei o controle da sua agenda.');
    }
  };

  const handlePresetPrompt = (preset: string) => {
    handleProcessCommand(preset);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col items-center overflow-hidden">
        
        {/* Glow ambient background */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top controls */}
        <div className="w-full flex items-center justify-between z-10 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              {config.name} • Live Executive Voice
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (soundEnabled && speakerCancelRef.current) {
                  speakerCancelRef.current.cancel();
                  setIsSpeaking(false);
                }
              }}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-colors"
              title={soundEnabled ? 'Silenciar voz' : 'Ativar voz'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* THE GLOWING 3D ORB */}
        <div className="relative my-6 flex items-center justify-center">
          
          {/* Animated wave rings when speaking or listening */}
          {(isListening || isSpeaking || isThinking) && (
            <>
              <div className="absolute w-56 h-56 rounded-full border border-indigo-500/30 animate-ping opacity-30" />
              <div className="absolute w-64 h-64 rounded-full border border-purple-500/20 animate-pulse" />
            </>
          )}

          {/* Main Interactive Orb */}
          <button
            onClick={toggleListening}
            className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full transition-all duration-500 flex items-center justify-center shadow-2xl ${
              isListening
                ? 'scale-110 shadow-emerald-500/60 bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600'
                : isSpeaking
                ? `scale-105 ${currentTheme.shadowGlow} bg-gradient-to-tr ${currentTheme.orbGradient} animate-pulse-glow`
                : isThinking
                ? 'scale-95 shadow-amber-500/40 bg-gradient-to-tr from-amber-600 via-indigo-600 to-purple-600 animate-spin'
                : `${currentTheme.shadowGlow} bg-gradient-to-tr from-slate-900 via-slate-950 to-slate-900 border ${currentTheme.borderAccent} hover:scale-105`
            }`}
          >
            {/* Inner fluid core */}
            <div className="w-[88%] h-[88%] rounded-full bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden group">
              <div className={`absolute inset-0 opacity-40 bg-gradient-to-tr ${currentTheme.gradient} ${isSpeaking || isListening ? 'animate-pulse' : ''}`} />
              
              {isListening ? (
                <div className="flex flex-col items-center gap-1.5 z-10 text-emerald-400">
                  <Mic className="w-8 h-8 animate-bounce" />
                  <span className="text-[11px] font-bold tracking-wider uppercase">Ouvindo...</span>
                </div>
              ) : isThinking ? (
                <div className="flex flex-col items-center gap-1.5 z-10 text-amber-400">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <span className="text-[11px] font-bold tracking-wider uppercase">Pensando...</span>
                </div>
              ) : isSpeaking ? (
                <div className={`flex flex-col items-center gap-1.5 z-10 ${currentTheme.textLight}`}>
                  <div className="flex items-center gap-1 h-6">
                    <span className={`w-1 ${currentTheme.pingDot} rounded-full animate-wave-bar`} style={{ animationDelay: '0ms' }} />
                    <span className={`w-1 ${currentTheme.pingDot} rounded-full animate-wave-bar`} style={{ animationDelay: '150ms' }} />
                    <span className={`w-1 ${currentTheme.pingDot} rounded-full animate-wave-bar`} style={{ animationDelay: '300ms' }} />
                    <span className={`w-1 ${currentTheme.pingDot} rounded-full animate-wave-bar`} style={{ animationDelay: '450ms' }} />
                  </div>
                  <span className="text-[11px] font-bold tracking-wider uppercase">Falando...</span>
                </div>
              ) : (
                <div className={`flex flex-col items-center gap-1.5 z-10 text-slate-300 group-hover:${currentTheme.textLight} transition-colors`}>
                  <Mic className="w-8 h-8" />
                  <span className="text-[11px] font-bold tracking-wider uppercase">Toque p/ falar</span>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Live Audio Subtitle / Response */}
        <div className="w-full text-center max-w-lg mb-6 z-10 min-h-[70px] flex flex-col items-center justify-center">
          {transcript && (
            <p className={`text-xs ${currentTheme.textAccent} font-medium mb-1.5 animate-in fade-in`}>
              &ldquo;{transcript}&rdquo;
            </p>
          )}
          <p className="text-sm sm:text-base text-slate-200 font-normal leading-relaxed">
            {lastResponse}
          </p>
        </div>

        {/* Preset Executive Pills */}
        <div className="w-full z-10 mb-6">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-2.5 text-center">
            Comandos Executivos Rápidos
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              'Resuma minhas reuniões de hoje',
              'Almoço amanhã às 12:30 no Fasano',
              'Resolva conflitos de agenda',
              'Bloqueie 2h de foco profundo à tarde',
              'Preparar pauta da reunião das 14h',
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetPrompt(preset)}
                className={`text-xs px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:${currentTheme.borderAccent} transition-all text-left flex items-center gap-1.5 active:scale-95`}
              >
                <Sparkles className={`w-3 h-3 ${currentTheme.textAccent}`} />
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input alternative for noisy environments */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualText.trim()) {
              handleProcessCommand(manualText);
              setManualText('');
            }
          }}
          className={`w-full flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-1.5 pl-4 z-10 ${currentTheme.borderFocus} transition-colors`}
        >
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Ou digite uma instrução para o Toki..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
          <button
            type="submit"
            disabled={!manualText.trim()}
            className={`p-2.5 rounded-xl ${currentTheme.primaryBtn} disabled:opacity-40 text-white transition-colors`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};
