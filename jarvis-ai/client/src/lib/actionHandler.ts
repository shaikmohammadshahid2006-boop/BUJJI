import { ActionType, AssistantResponseData } from '../types/assistant';

const DANGEROUS_SCHEMES = [
  'javascript:',
  'file:',
  'data:',
  'vbscript:',
  'blob:',
];

export function isSafeBrowserUrl(url?: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  for (const scheme of DANGEROUS_SCHEMES) {
    if (clean.startsWith(scheme)) {
      return false;
    }
  }
  return clean.startsWith('http://') || clean.startsWith('https://');
}

export interface ActionExecutionResult {
  executed: boolean;
  message?: string;
}

export async function executeClientAction(
  action: ActionType | string,
  data?: AssistantResponseData
): Promise<ActionExecutionResult> {
  if (!action || action === 'none') {
    return { executed: true };
  }

  switch (action) {
    case 'open_url':
    case 'open_new_tab':
    case 'play_media': {
      const targetUrl = data?.url;
      if (targetUrl && isSafeBrowserUrl(targetUrl)) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return { executed: true, message: `Opened ${data?.title || targetUrl}` };
      }
      return { executed: false, message: 'Invalid or blocked URL scheme' };
    }

    case 'search_web': {
      const searchUrl = data?.url;
      if (searchUrl && isSafeBrowserUrl(searchUrl)) {
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
        return { executed: true, message: `Searching web for '${data?.query}'` };
      }
      return { executed: true };
    }

    case 'copy_text': {
      const textToCopy = data?.clipboard_text;
      if (textToCopy) {
        try {
          await navigator.clipboard.writeText(textToCopy);
          return { executed: true, message: 'Copied to clipboard' };
        } catch (e) {
          return { executed: false, message: 'Failed to access clipboard' };
        }
      }
      return { executed: false };
    }

    case 'show_notification': {
      const title = data?.notification_title || 'BUJJI Notification';
      const body = data?.notification_body || 'System alert';

      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.svg' });
          return { executed: true };
        } else if (Notification.permission !== 'denied') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            new Notification(title, { body, icon: '/favicon.svg' });
            return { executed: true };
          }
        }
      }
      return { executed: true };
    }

    case 'desktop_command': {
      return {
        executed: true,
        message: 'Desktop application command intercepted. Local BUJJI Companion Agent required for host manipulation.'
      };
    }

    default:
      return { executed: true };
  }
}
