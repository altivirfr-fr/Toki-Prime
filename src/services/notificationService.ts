/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CalendarEvent } from '../types';

const NOTIFIED_STORAGE_KEY = 'toki_notified_events_v1';

let sharedAudioCtx: AudioContext | null = null;

/**
 * Checks if the browser supports Notification API
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Detects whether the app is currently running inside an iframe (e.g., preview sandbox),
 * where browsers may block native Notification popups even after permission or require top-level tab.
 */
export function isInsideIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Gets current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Unlocks Web Audio API on first user gesture so scheduled chimes play reliably
 */
export function unlockAudioContext(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
  } catch {
    // Ignore audio context errors on restricted environments
  }
}

/**
 * Requests browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  unlockAudioContext();
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificações:', error);
    return Notification.permission;
  }
}

/**
 * Synthesizes an executive dual-tone luxury chime via Web Audio API.
 * Guaranteed to work without external asset download failures.
 */
export function playExecutiveChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // First tone (E5 ~ 659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.22, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Second harmonious tone (G#5 ~ 830.6Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.26, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.9);
  } catch (e) {
    console.warn('Audio chime playback omitted or unsupported:', e);
  }
}

/**
 * Parse an event's date and startTime into a local Date instance
 */
export function getEventStartDateTime(event: CalendarEvent): Date | null {
  if (!event.date || !event.startTime) return null;

  try {
    const [year, month, day] = event.date.split('-').map(Number);
    const [hours, minutes] = event.startTime.split(':').map(Number);

    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day) ||
      isNaN(hours) ||
      isNaN(minutes)
    ) {
      return null;
    }

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  } catch {
    return null;
  }
}

/**
 * Retrieves the set of already notified event keys
 */
export function getNotifiedEventKeys(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (stored) {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch (e) {
    console.error('Failed to read notified events from storage', e);
  }
  return new Set();
}

/**
 * Records that a notification has been sent for a specific event occurrence
 */
export function markEventAsNotified(eventKey: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = getNotifiedEventKeys();
    current.add(eventKey);
    const list = Array.from(current).slice(-300);
    localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to write notified event to storage', e);
  }
}

/**
 * Clears notified events storage (useful for testing)
 */
export function clearNotifiedEventsHistory(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(NOTIFIED_STORAGE_KEY);
}

/**
 * Dispatches a native browser notification if supported and granted.
 * Falls back to ServiceWorker registration.showNotification if available.
 */
export function sendBrowserNotification(params: {
  title: string;
  body: string;
  tag?: string;
  onClick?: () => void;
}): Notification | null {
  if (!isNotificationSupported()) {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  const iconUrl =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238b5cf6"><circle cx="12" cy="12" r="10"/></svg>';

  try {
    const notification = new Notification(params.title, {
      body: params.body,
      tag: params.tag,
      icon: iconUrl,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      params.onClick?.();
      notification.close();
    };

    return notification;
  } catch (error) {
    // Some mobile browsers / PWAs require ServiceWorkerRegistration.showNotification
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(params.title, {
            body: params.body,
            tag: params.tag,
            icon: iconUrl,
            requireInteraction: true,
          });
        })
        .catch(() => {});
    }
    console.warn('Fallback SW ou bloqueio ao instanciar Notification:', error);
    return null;
  }
}

export type EventTriggerKind = '15m' | 'start';

export interface TriggeredEventNotification {
  event: CalendarEvent;
  kind: EventTriggerKind;
  minutesRemaining: number;
}

/**
 * Triggers notification + sound for an upcoming or starting event
 */
export function triggerEventNotification(
  event: CalendarEvent,
  kind: EventTriggerKind,
  minutesRemaining: number,
  onClick?: () => void
): void {
  playExecutiveChime();

  const priorityTag =
    event.priority === 'high'
      ? 'Alta Prioridade'
      : event.priority === 'low'
      ? 'Baixa Prioridade'
      : 'Média Prioridade';

  const minsRounded = Math.max(1, Math.round(minutesRemaining));
  const title =
    kind === 'start'
      ? `⏰ Começando Agora: ${event.title}`
      : `🔔 Em ${minsRounded} min: ${event.title}`;

  const locationText = event.location ? ` | Local: ${event.location}` : '';
  const body =
    kind === 'start'
      ? `Seu compromisso das ${event.startTime} está começando agora${locationText} (${priorityTag}).`
      : `Início às ${event.startTime}${locationText} (${priorityTag}). Clique para ver insights e pauta.`;

  sendBrowserNotification({
    title,
    body,
    tag: `event-${kind}-${event.id}-${event.date}-${event.startTime}`,
    onClick,
  });
}

/**
 * Checks all scheduled calendar events and triggers notifications:
 * 1. Up to 15 minutes before start (0 < diffMinutes <= 15.5)
 * 2. Right at start time (-1.5 <= diffMinutes <= 0.5) if notifyAtStart !== false
 *
 * By default notifies ALL scheduled events (notifyAllEvents !== false),
 * or filters to priority === 'high' when notifyAllEvents === false.
 */
export function checkUpcomingEventNotifications(
  events: CalendarEvent[],
  options: {
    notifyAllEvents?: boolean;
    notifyAtStart?: boolean;
  },
  onTrigger?: (payload: TriggeredEventNotification) => void
): TriggeredEventNotification[] {
  const { notifyAllEvents = true, notifyAtStart = true } = options;

  const eligibleEvents = notifyAllEvents
    ? events.filter((e) => e.status !== 'cancelled')
    : events.filter((e) => e.status !== 'cancelled' && e.priority === 'high');

  const now = new Date();
  const notifiedKeys = getNotifiedEventKeys();
  const triggered: TriggeredEventNotification[] = [];

  for (const event of eligibleEvents) {
    const startDate = getEventStartDateTime(event);
    if (!startDate) continue;

    const diffMs = startDate.getTime() - now.getTime();
    const diffMinutes = diffMs / (60 * 1000);

    // 1. Check 15-minute warning window (between 0.5 and 15.5 minutes before start)
    // Also catches events added less than 15 minutes before start!
    if (diffMinutes > 0.5 && diffMinutes <= 15.5) {
      const eventKey = `${event.id}_15m_${event.date}_${event.startTime}`;

      if (!notifiedKeys.has(eventKey)) {
        markEventAsNotified(eventKey);
        const payload: TriggeredEventNotification = {
          event,
          kind: '15m',
          minutesRemaining: Math.round(diffMinutes),
        };
        triggerEventNotification(event, '15m', diffMinutes, () => {
          onTrigger?.(payload);
        });
        onTrigger?.(payload);
        triggered.push(payload);
      }
    }

    // 2. Check exact start-time window (-1.5 to +0.5 minutes around startTime)
    if (notifyAtStart && diffMinutes >= -1.5 && diffMinutes <= 0.5) {
      const startKey = `${event.id}_0m_${event.date}_${event.startTime}`;

      if (!notifiedKeys.has(startKey)) {
        markEventAsNotified(startKey);
        const payload: TriggeredEventNotification = {
          event,
          kind: 'start',
          minutesRemaining: 0,
        };
        triggerEventNotification(event, 'start', 0, () => {
          onTrigger?.(payload);
        });
        onTrigger?.(payload);
        triggered.push(payload);
      }
    }
  }

  return triggered;
}

/**
 * Legacy alias for backwards compatibility
 */
export function checkHighPriorityUpcomingEvents(
  events: CalendarEvent[],
  onTrigger?: (event: CalendarEvent) => void
): CalendarEvent[] {
  const results = checkUpcomingEventNotifications(
    events,
    { notifyAllEvents: false, notifyAtStart: false },
    (payload) => onTrigger?.(payload.event)
  );
  return results.map((r) => r.event);
}
