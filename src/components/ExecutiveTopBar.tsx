import React from 'react';
import { RefreshCw, LogOut, Bell, BellRing, PhoneCall } from 'lucide-react';
import { User } from 'firebase/auth';
import { AssistantConfig } from '../types';
import { getTheme } from '../utils/theme';
import { TokiAvatar } from './TokiAvatar';

export type AppSection = 'chat' | 'tasks' | 'agenda' | 'briefing' | 'profile';

interface ExecutiveTopBarProps {
  config: AssistantConfig;
  user: User | null;
  isSyncing: boolean;
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onOpenCall: () => void;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onTriggerSync: () => void;
  conflictsCount: number;
  notificationPermission?: NotificationPermission | 'unsupported';
  onRequestNotificationPermission?: () => void;
}

const NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: 'chat', label: 'Assistente' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'tasks', label: 'Tarefas' },
  { id: 'briefing', label: 'Briefing' },
  { id: 'profile', label: 'Perfil' },
];

export const ExecutiveTopBar: React.FC<ExecutiveTopBarProps> = ({
  config,
  user,
  isSyncing,
  activeSection,
  onSelectSection,
  onOpenCall,
  onGoogleSignIn,
  onGoogleSignOut,
  onTriggerSync,
  conflictsCount,
  notificationPermission,
  onRequestNotificationPermission,
}) => {
  const currentTheme = getTheme(config.auraColor);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#141416]/90 backdrop-blur-xl px-4 sm:px-6 h-16 flex items-center">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <button
          type="button"
          onClick={() => onSelectSection('chat')}
          className="flex items-center gap-2.5 text-left shrink-0"
        >
          <TokiAvatar size="sm" variant="chat" />
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-white">
              {config.name}
            </span>
            {conflictsCount > 0 && (
              <span className="text-[11px] font-medium text-rose-400 tabular-nums">
                · {conflictsCount} conflito{conflictsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </button>

        {/* Center: Desktop Single-Line Navigation */}
        <nav
          aria-label="Navegação principal"
          className="hidden lg:flex items-center gap-1 bg-[#1e1e21] border border-white/[0.07] rounded-xl p-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white/[0.1] text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Primary Utility & Google Sync Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenCall}
            className="hidden sm:flex items-center gap-1.5 px-3 h-9 rounded-xl bg-[#1e1e21] hover:bg-[#26262a] border border-white/[0.08] text-xs font-medium text-zinc-200 transition-colors"
            title={`Testar ligação do ${config.name} agora`}
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ligar</span>
          </button>

          {onRequestNotificationPermission && (
            <button
              type="button"
              onClick={onRequestNotificationPermission}
              className="w-9 h-9 rounded-xl bg-[#1e1e21] hover:bg-[#26262a] border border-white/[0.08] flex items-center justify-center text-zinc-300 transition-colors"
              title={
                notificationPermission === 'granted'
                  ? 'Notificações ativas'
                  : 'Ativar notificações do navegador'
              }
            >
              {notificationPermission === 'granted' ? (
                <Bell className="w-4 h-4 text-zinc-300" />
              ) : (
                <BellRing className="w-4 h-4 text-amber-400" />
              )}
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-1 bg-[#1e1e21] border border-white/[0.08] rounded-xl p-1 pl-2.5">
              <span className="text-xs font-medium text-emerald-400 hidden sm:inline">
                Google Sync
              </span>
              <button
                type="button"
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-300 transition-colors"
                title="Sincronizar Google Calendar"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onGoogleSignOut}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-zinc-400 hover:text-rose-400 transition-colors"
                title="Desconectar Google Agenda"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onGoogleSignIn}
              className={`flex items-center gap-2 px-3.5 h-9 rounded-xl ${currentTheme.primaryBtn} font-medium text-xs transition-colors whitespace-nowrap`}
              title="Conectar Google Calendar"
            >
              <span>Conectar Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
