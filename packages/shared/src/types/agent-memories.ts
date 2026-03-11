export type AgentMemoryType = 'fact' | 'preference' | 'context' | 'relationship';

export interface AgentMemory {
  id: string;
  agent_id: string;
  user_id: string;
  memory_type: AgentMemoryType;
  content: string;
  embedding_key: string | null;
  importance: number;
  access_count: number;
  last_accessed_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateMemoryInput {
  memory_type: AgentMemoryType;
  content: string;
  embedding_key?: string;
  importance?: number;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMemoryInput {
  content?: string;
  memory_type?: AgentMemoryType;
  importance?: number;
  embedding_key?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
}
