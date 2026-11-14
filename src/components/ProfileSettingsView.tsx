import React from 'react';
import {
  Calendar,
  Bell,
  PhoneCall,
  Sliders,
  Download,
  ChevronRight,
  LogOut,
  CheckCircle2,
  Palette,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AssistantConfig, CalendarEvent } from '../types';
import { TokiAvatar } from './TokiAvatar';
import { downloadIcsFile } from '../utils/calendarExport';
import { getTheme } from '../utils/theme';

interface ProfileSettingsViewProps {
  config: AssistantConfig;
  events: CalendarEvent[];
  user: User | null;
  notificationPermission: NotificationPermission | 'unsupported';
  onOpenSettings: () => void;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onRequestNotificationPermission: () => void;
  onTestNotification: () => void;
  onTestScheduledCall: () => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  config,
  events,
  user,
  notificationPermission,
  onOpenSettings,
  onGoogleSignIn,
  onGoogleSignOut,
  onRequestNotificationPermission,
  onTestNotification,
  onTestScheduledCall,
}) => {
  const currentTheme = getTheme(config.auraColor);
  const displayName = user?.displayName || 'Minha Conta Toki Prime';
  const displayEmail = user?.email || 'Agenda local sincronizada';
  const initial = (user?.displayName || user?.email || 'T').charAt(0).toUpperCase();
  const activeCallCount = events.filter((e) => e.callMe).length;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Account Summary Card matching Screenshot 1 */}
      <div className="rounded-2xl bg-[#1e1e21] border border-white/[0.08] p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-full bg-zinc-700 text-white font-semibold text-lg flex items-center justify-center shrink-0">
              {initial}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white truncate">{displayName}</h2>
              <p className="text-xs text-zinc-400 truncate">{displayEmail}</p>
            </div>
          </div>
          {user ? (
            <button
              type="button"
              onClick={onGoogleSignOut}
              className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-xs font-medium text-zinc-200 flex items-center gap-1.5 min-h-[40px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Desconectar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoogleSignIn}
              className={`px-3.5 py-2 rounded-xl ${currentTheme.primaryBtn} text-xs font-medium min-h-[40px]`}
            >
              Conectar Google
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between text-xs text-zinc-400">
          <span>Compromissos com ligação ativa</span>
          <span className="text-zinc-100 font-semibold tabular-nums">{activeCallCount}</span>
        </div>
      </div>

      {/* Meu Toki */}
      <div className="rounded-2xl bg-[#1e1e21] border border-white/[0.08] divide-y divide-white/[0.07]">
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left min-h-[52px]"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-zinc-100">
            <TokiAvatar size="xs" variant="ghost" className="text-zinc-200 w-5 h-5" />
            <span>Meu {config.name}</span>
          </span>
          <span className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{config.persona}</span>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left min-h-[52px]"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-zinc-100">
            <Palette className="w-4 h-4 text-zinc-400" />
            <span>Tema Visual</span>
          </span>
          <span className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{currentTheme.label}</span>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </span>
        </button>
      </div>

      {/* Calendários & Ligações */}
      <div className="rounded-2xl bg-[#1e1e21] border border-white/[0.08] divide-y divide-white/[0.07]">
        <button
          type="button"
          onClick={user ? onGoogleSignOut : onGoogleSignIn}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left min-h-[52px]"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-zinc-100">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span>Calendários</span>
          </span>
          <span className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{user ? user.email : 'Não conectado'}</span>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </span>
        </button>

        <button
          type="button"
          onClick={onTestScheduledCall}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left min-h-[52px]"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-zinc-100">
            <PhoneCall className="w-4 h-4 text-zinc-400" />
            <span>Testar Ligação do {config.name}</span>
          </span>
          <span className="flex items-center gap-2 text-xs text-zinc-400 tabular-nums">
            <span>Diária: {config.scheduledCallTime || '08:30'}</span>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </span>
        </button>
      </div>

      {/* Notificações & Exportação */}
      <div className="rounded-2xl bg-[#1e1e21] border border-white/[0.08] divide-y divide-white/[0.07]">
        <button
          type="button"
          onClick={
            notificationPermission === 'granted'
              ? onTestNotification
              : onRequestNotificationPermission
          }
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left min-h-[52px]"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-zinc-100">
            <Bell className="w-4 h-4 text-zinc-400" />
            <span>Notificações</span>
          </span>
          <span className="flex items-center gap-2 text-xs text-zinc-400">
            {notificationPermission === 'granted' ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ativas (Testar)
              </span>
            ) : (
              <span>Ativar alertas</span>
            )}
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left min-h-[52px]"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-zinc-100">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <span>Configurações Gerais</span>
          </span>
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        </button>

        <button
          type="button"
          onClick={() => downloadIcsFile(events)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left min-h-[52px]"
        >
          <span className="flex items-center gap-3 text-sm font-medium text-zinc-100">
            <Download className="w-4 h-4 text-zinc-400" />
            <span>Exportar Agenda (.ICS)</span>
          </span>
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        </button>
      </div>
    </div>
  );
};
