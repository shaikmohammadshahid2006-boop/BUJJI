export type ActionType =
  | 'none'
  | 'open_url'
  | 'search_web'
  | 'play_media'
  | 'show_notification'
  | 'copy_text'
  | 'open_new_tab'
  | 'ask_confirmation'
  | 'desktop_command'
  | 'system_telemetry'
  | 'memory_view'
  | 'briefing'
  | 'undo_action';

export interface AssistantResponseData {
  url?: string;
  query?: string;
  media_url?: string;
  title?: string;
  snippet?: string;
  clipboard_text?: string;
  notification_title?: string;
  notification_body?: string;
  prompt_question?: string;
  desktop_app?: string;
  results?: Array<{ title: string; snippet: string; url: string }>;
  time?: string;
  date?: string;
  status?: string;
  [key: string]: any;
}

export interface AssistantCommandResponse {
  success: boolean;
  message: string;
  action: ActionType;
  data?: AssistantResponseData;
  conversation_id?: string;
  message_id?: string;
}

export interface AssistantCommandRequest {
  message: string;
  conversation_id?: string;
}
