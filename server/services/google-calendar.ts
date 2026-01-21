import { google } from 'googleapis';

async function getAccessToken() {
  // Always fetch fresh connection settings - never cache to avoid stale tokens
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Exported alias for status checking
export async function getCalendarClient() {
  return await getUncachableGoogleCalendarClient();
}

// Alias for routes.ts
export async function getUpcomingEvents(maxResults: number = 10) {
  return await listUpcomingEvents(maxResults);
}

export async function listCalendars() {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    const response = await calendar.calendarList.list();
    return response.data.items || [];
  } catch (error) {
    console.error('Error listing calendars:', error);
    throw error;
  }
}

export async function listUpcomingEvents(maxResults: number = 10) {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: sevenDaysLater.toISOString(),
      maxResults: maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error listing events:', error);
    throw error;
  }
}

export async function createEvent(eventDetails: {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string } | { date: string };
  end: { dateTime: string; timeZone?: string } | { date: string };
  location?: string;
}) {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventDetails,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

export async function checkConnection() {
  try {
    await getAccessToken();
    return { connected: true };
  } catch (error) {
    return { connected: false, error: (error as Error).message };
  }
}
