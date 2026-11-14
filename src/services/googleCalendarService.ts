import { CalendarEvent, EventCategory } from '../types';
import { formatLocalDateFromDate } from '../utils/dateUtils';

export interface GoogleCalendarApiItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

/**
 * Deduce executive category from event title & description
 */
function deduceCategory(title = '', desc = ''): EventCategory {
  const text = (title + ' ' + desc).toLowerCase();
  if (text.includes('foco') || text.includes('focus') || text.includes('deep work') || text.includes('estratégia')) {
    return 'focus';
  }
  if (text.includes('almoço') || text.includes('lunch') || text.includes('jantar') || text.includes('dinner') || text.includes('networking')) {
    return 'networking';
  }
  if (text.includes('voo') || text.includes('flight') || text.includes('pessoal') || text.includes('médico') || text.includes('treino')) {
    return 'personal';
  }
  return 'meeting';
}

/**
 * Format date YYYY-MM-DD and time HH:MM into an ISO string with timezone
 */
function toIsoDateTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, mins] = timeStr.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, mins, 0);
  return date.toISOString();
}

/**
 * Fetch events from Google Calendar API
 */
export async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEvent[]> {
  const min = timeMin || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const max = timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', min);
  url.searchParams.set('timeMax', max);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const items: GoogleCalendarApiItem[] = data.items || [];

  return items
    .filter((item) => item.status !== 'cancelled' && (item.start?.dateTime || item.start?.date))
    .map((item) => {
      let date = '';
      let startTime = '09:00';
      let endTime = '10:00';

      if (item.start?.dateTime) {
        const startDate = new Date(item.start.dateTime);
        date = formatLocalDateFromDate(startDate);
        startTime = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
      } else if (item.start?.date) {
        date = item.start.date;
        startTime = '09:00';
      }

      if (item.end?.dateTime) {
        const endDate = new Date(item.end.dateTime);
        endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      } else if (item.end?.date) {
        endTime = '18:00';
      }

      return {
        id: `gcal-${item.id}`,
        googleEventId: item.id,
        title: item.summary || 'Sem título',
        date,
        startTime,
        endTime,
        category: deduceCategory(item.summary, item.description),
        location: item.location,
        attendees: (item.attendees || []).map((a) => a.email || a.displayName || '').filter(Boolean),
        description: item.description,
        syncedWithGoogle: true,
        googleHtmlLink: item.htmlLink,
        syncStatus: 'synced',
        status: 'confirmed',
      };
    });
}

/**
 * Create an event on Google Calendar
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<{ id: string; htmlLink: string }> {
  const startDateTime = toIsoDateTime(event.date, event.startTime);
  const endDateTime = toIsoDateTime(event.date, event.endTime);

  const body: any = {
    summary: event.title,
    description: event.description || 'Agendado e sincronizado pelo Toki Prime Executive Assistant.',
    start: {
      dateTime: startDateTime,
    },
    end: {
      dateTime: endDateTime,
    },
  };

  if (event.location) {
    body.location = event.location;
  }

  if (event.attendees && event.attendees.length > 0) {
    body.attendees = event.attendees.map((email) => ({ email }));
  }

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Google Calendar event: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return { id: result.id, htmlLink: result.htmlLink };
}

/**
 * Update an existing event on Google Calendar
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<void> {
  if (!event.googleEventId) {
    throw new Error('Event does not have a googleEventId');
  }

  const startDateTime = toIsoDateTime(event.date, event.startTime);
  const endDateTime = toIsoDateTime(event.date, event.endTime);

  const body: any = {
    summary: event.title,
    description: event.description || '',
    start: {
      dateTime: startDateTime,
    },
    end: {
      dateTime: endDateTime,
    },
  };

  if (event.location) {
    body.location = event.location;
  }

  if (event.attendees) {
    body.attendees = event.attendees.map((email) => ({ email }));
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.googleEventId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update Google Calendar event: ${response.status} - ${errorText}`);
  }
}

/**
 * Delete an event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  googleEventId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const errorText = await response.text();
    throw new Error(`Failed to delete Google Calendar event: ${response.status} - ${errorText}`);
  }
}

/**
 * Real-time Bidirectional Synchronization:
 * 1. Fetches all events from Google Calendar.
 * 2. Uploads local events that don't have a googleEventId to Google Calendar.
 * 3. Imports new remote Google Calendar events to local state.
 * 4. Merges into a consistent single list.
 */
export async function syncBidirectionalEvents(
  localEvents: CalendarEvent[],
  accessToken: string
): Promise<{ mergedEvents: CalendarEvent[]; uploadedCount: number; importedCount: number }> {
  // Step 1: Fetch remote events
  const googleEvents = await fetchGoogleCalendarEvents(accessToken);
  const googleEventMap = new Map<string, CalendarEvent>();
  googleEvents.forEach((gEvt) => {
    if (gEvt.googleEventId) {
      googleEventMap.set(gEvt.googleEventId, gEvt);
    }
  });

  let uploadedCount = 0;
  let importedCount = 0;

  // Step 2: Upload local events that do not yet exist on Google Calendar
  const updatedLocalEvents: CalendarEvent[] = [];
  for (const localEvt of localEvents) {
    if (!localEvt.googleEventId) {
      try {
        const { id, htmlLink } = await createGoogleCalendarEvent(accessToken, localEvt);
        uploadedCount++;
        updatedLocalEvents.push({
          ...localEvt,
          googleEventId: id,
          syncedWithGoogle: true,
          googleHtmlLink: htmlLink,
          syncStatus: 'synced',
        });
      } catch (err) {
        console.warn(`Could not upload event "${localEvt.title}" to Google Calendar:`, err);
        updatedLocalEvents.push({ ...localEvt, syncStatus: 'local_only' });
      }
    } else {
      // Event already linked
      const remoteEvt = googleEventMap.get(localEvt.googleEventId);
      if (remoteEvt) {
        // Updated with latest remote details if any
        updatedLocalEvents.push({
          ...localEvt,
          syncedWithGoogle: true,
          googleHtmlLink: remoteEvt.googleHtmlLink || localEvt.googleHtmlLink,
          syncStatus: 'synced',
        });
        googleEventMap.delete(localEvt.googleEventId);
      } else {
        // Event was deleted remotely on Google Calendar, retain or mark
        updatedLocalEvents.push(localEvt);
      }
    }
  }

  // Step 3: Add remaining remote events that don't exist locally
  for (const remainingRemote of googleEventMap.values()) {
    importedCount++;
    updatedLocalEvents.push(remainingRemote);
  }

  return {
    mergedEvents: updatedLocalEvents,
    uploadedCount,
    importedCount,
  };
}
