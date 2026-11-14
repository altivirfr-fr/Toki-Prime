/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssistantConfig, CalendarEvent } from '../types';
import { sendBrowserNotification, isNotificationSupported } from './notificationService';
import { getLocalDateString } from '../utils/dateUtils';

const CALL_STORAGE_PREFIX = 'toki_scheduled_call_done_';
const EVENT_CALL_STORAGE_PREFIX = 'toki_event_call_done_';

/**
 * Synthesizes a realistic telephone phone-ring melody using Web Audio API
 */
export function playPhoneRingSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Dual European/US Telephone Ring cadence: 440Hz + 480Hz
    [0, 0.4].forEach((burstOffset) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now + burstOffset);
      osc2.frequency.setValueAtTime(480, now + burstOffset);

      gain.gain.setValueAtTime(0.001, now + burstOffset);
      gain.gain.exponentialRampToValueAtTime(0.25, now + burstOffset + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + burstOffset + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now + burstOffset);
      osc1.stop(now + burstOffset + 0.36);
      osc2.start(now + burstOffset);
      osc2.stop(now + burstOffset + 0.36);
    });
  } catch (e) {
    console.warn('Phone ring sound playback omitted:', e);
  }
}

export { getLocalDateString };

/**
 * Checks whether the daily briefing call for the scheduled time has already been dispatched today
 */
export function hasCallTriggeredToday(callTime: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  const today = getLocalDateString();
  const key = `${CALL_STORAGE_PREFIX}${today}_${callTime}`;
  return localStorage.getItem(key) === 'true';
}

export function markCallTriggeredToday(callTime: string): void {
  if (typeof localStorage === 'undefined') return;
  const today = getLocalDateString();
  const key = `${CALL_STORAGE_PREFIX}${today}_${callTime}`;
  localStorage.setItem(key, 'true');
}

export function resetTodayCallTrigger(callTime?: string): void {
  if (typeof localStorage === 'undefined') return;
  const today = getLocalDateString();
  if (callTime) {
    localStorage.removeItem(`${CALL_STORAGE_PREFIX}${today}_${callTime}`);
  } else {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${CALL_STORAGE_PREFIX}${today}`)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }
}

export function resetEventCallTriggers(eventId?: string): void {
  if (typeof localStorage === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (eventId && k.startsWith(`${EVENT_CALL_STORAGE_PREFIX}${eventId}_`)) {
      keysToRemove.push(k);
    } else if (!eventId && k.startsWith(EVENT_CALL_STORAGE_PREFIX)) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

export function isTimeToCall(callTime: string): boolean {
  if (!callTime) return false;
  const now = new Date();
  const parts = callTime.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;
  return now.getHours() === parts[0] && now.getMinutes() === parts[1];
}

/**
 * Evaluates daily scheduled briefing call
 */
export function checkScheduledDailyCall(
  config: AssistantConfig,
  onTriggerCall: (reason: 'scheduled' | 'manual') => void
): boolean {
  if (config.callAlerts === false) return false;
  const callTime = config.scheduledCallTime || '08:30';

  if (!isTimeToCall(callTime)) {
    return false;
  }

  if (hasCallTriggeredToday(callTime)) {
    return false;
  }

  markCallTriggeredToday(callTime);
  playPhoneRingSound();

  if (isNotificationSupported()) {
    sendBrowserNotification({
      title: `Ligação do ${config.name}`,
      body: `São ${callTime}. ${config.name} está ligando com seu briefing executivo.`,
      tag: `toki-scheduled-call-${getLocalDateString()}`,
      onClick: () => {
        window.focus();
        onTriggerCall('scheduled');
      },
    });
  }

  onTriggerCall('scheduled');
  return true;
}

/**
 * Computes the local Date object when an event call should trigger
 */
export function getEventCallTargetDate(event: CalendarEvent): Date | null {
  if (!event.date || !event.startTime) return null;
  const [y, m, d] = event.date.split('-').map(Number);
  const [hh, mm] = event.startTime.split(':').map(Number);
  if ([y, m, d, hh, mm].some((n) => isNaN(n))) return null;

  const eventStart = new Date(y, m - 1, d, hh, mm, 0, 0);
  const offsetMin = typeof event.callMinutesBefore === 'number' ? event.callMinutesBefore : 0;
  return new Date(eventStart.getTime() - offsetMin * 60_000);
}

/**
 * Formats the exact HH:MM at which Toki will call for an event
 */
export function getEventCallTimeLabel(startTime: string, minutesBefore = 0): string {
  const [hh, mm] = startTime.split(':').map(Number);
  if (isNaN(hh) || isNaN(mm)) return startTime;
  const totalMinutes = ((hh * 60 + mm - minutesBefore) % 1440 + 1440) % 1440;
  const outH = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
  const outM = (totalMinutes % 60).toString().padStart(2, '0');
  return `${outH}:${outM}`;
}

/**
 * Checks all events with `callMe: true` and triggers an incoming call at their exact trigger minute
 */
export function checkEventCalls(
  events: CalendarEvent[],
  assistantName: string,
  onTriggerEventCall: (event: CalendarEvent) => void
): CalendarEvent | null {
  if (typeof localStorage === 'undefined') return null;

  const nowMs = Date.now();

  for (const event of events) {
    if (!event.callMe || event.status === 'cancelled') continue;

    const targetDate = getEventCallTargetDate(event);
    if (!targetDate) continue;

    const diffMs = nowMs - targetDate.getTime();
    // Fire within [-15s, +90s] of the exact scheduled call timestamp
    if (diffMs >= -15_000 && diffMs <= 90_000) {
      const offset = event.callMinutesBefore ?? 0;
      const storageKey = `${EVENT_CALL_STORAGE_PREFIX}${event.id}_${event.date}_${event.startTime}_${offset}`;
      if (localStorage.getItem(storageKey) === 'true') {
        continue;
      }

      localStorage.setItem(storageKey, 'true');
      playPhoneRingSound();

      if (isNotificationSupported()) {
        const offsetText =
          offset > 0
            ? `Começa em ${offset} ${offset === 1 ? 'minuto' : 'minutos'} (${event.startTime})`
            : `No horário do evento (${event.startTime})`;
        sendBrowserNotification({
          title: `Lembrete do ${assistantName} · ${event.title}`,
          body: `${offsetText}. Clique para atender a ligação.`,
          tag: `toki-evt-call-${event.id}`,
          onClick: () => {
            window.focus();
            onTriggerEventCall(event);
          },
        });
      }

      onTriggerEventCall(event);
      return event;
    }
  }

  return null;
}
