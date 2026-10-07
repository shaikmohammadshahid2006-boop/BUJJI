import { ActionType, AssistantResponseData } from './assistant';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  action?: ActionType | string;
  metadata?: AssistantResponseData;
  created_at: string;
}
