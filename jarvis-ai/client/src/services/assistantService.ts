import { apiClient } from './api';
import { AssistantCommandRequest, AssistantCommandResponse } from '../types/assistant';
import { Conversation, Message } from '../types/conversation';

export const assistantService = {
  async checkHealth(): Promise<{ status: string }> {
    return apiClient<{ status: string }>('/api/health', { requiresAuth: false });
  },

  async sendCommand(message: string, conversation_id?: string): Promise<AssistantCommandResponse> {
    const payload: AssistantCommandRequest = { message, conversation_id };
    return apiClient<AssistantCommandResponse>('/api/assistant/command', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getConversations(): Promise<Conversation[]> {
    return apiClient<Conversation[]>('/api/conversations');
  },

  async createConversation(title?: string): Promise<Conversation> {
    return apiClient<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Conversation' }),
    });
  },

  async getConversation(id: string): Promise<Conversation> {
    return apiClient<Conversation>(`/api/conversations/${id}`);
  },

  async deleteConversation(id: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    return apiClient<Message[]>(`/api/conversations/${conversationId}/messages`);
  },
};
