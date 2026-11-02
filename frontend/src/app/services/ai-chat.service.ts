import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
  intent?: string;
  model?: string;
  timestamp?: Date;
  contextUsed?: boolean;
  confidence?: number;
}

export interface ChatResponse {
  reply: string;
  agent: string;
  intent: string;
  model: string;
  contextUsed: boolean;
  entities: Record<string, unknown>;
  confidence: number;
}

@Injectable({ providedIn: 'root' })
export class AiChatService {
  private url = `${API_URL}/ai/chat`;

  constructor(private http: HttpClient) {}

  /**
   * Sends a message to the multi-agent orchestration pipeline.
   * The backend uses FreeLLMAPI models — no Antigravity credits consumed.
   *
   * @param message           The user's message
   * @param conversationHistory  Previous chat turns for context
   */
  sendMessage(
    message: string,
    conversationHistory: { role: string; content: string }[] = []
  ): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.url, {
      message,
      conversationHistory,
    });
  }
}
