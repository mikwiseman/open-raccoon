export type PageInfo = {
  next_cursor: string | null;
  has_more: boolean;
};

export type ApiListResponse<T> = {
  items: T[];
  page_info: PageInfo;
};

export type SessionTokens = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number;
};

export type User = {
  id: string;
  username: string;
  display_name: string | null;
  email?: string;
  avatar_url: string | null;
  bio: string | null;
  status?: string | null;
  role?: string | null;
  settings?: Record<string, unknown> | null;
  last_seen_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Conversation = {
  id: string;
  type: 'dm' | 'group' | 'agent' | 'bridge';
  title: string | null;
  avatar_url: string | null;
  creator_id: string;
  agent_id: string | null;
  bridge_id: string | null;
  metadata: Record<string, unknown>;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationMemberUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type ConversationMember = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  muted: boolean;
  last_read_at: string | null;
  joined_at: string;
  user?: ConversationMemberUser;
};

export type MessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'human' | 'agent' | 'bridge' | 'system';
  type: 'text' | 'media' | 'code' | 'embed' | 'system' | 'agent_status';
  content: Record<string, unknown>;
  metadata: Record<string, unknown>;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  reactions?: MessageReaction[];
};

export type FeedItem = {
  id: string;
  creator_id: string;
  type: string;
  reference_id: string;
  reference_type: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  quality_score: number;
  trending_score: number;
  like_count: number;
  fork_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  liked_by_me?: boolean;
};

export type Page = {
  id: string;
  creator_id: string;
  agent_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  r2_path: string;
  deploy_url: string | null;
  custom_domain: string | null;
  version: number;
  visibility: 'public' | 'unlisted' | 'private';
  view_count: number;
  forked_from: string | null;
  created_at: string;
  updated_at: string;
};

export type PageVersion = {
  id: string;
  page_id: string;
  version: number;
  r2_path: string;
  changes: string | null;
  created_at: string;
};

export type MarketplaceAgent = {
  id: string;
  creator_id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  model: string | null;
  category: string | null;
  visibility: 'public' | 'unlisted' | 'private';
  usage_count: number;
  rating_count: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
};

export type MarketplaceCategory = {
  slug: string;
  name: string;
  description: string;
};

export type AgentRating = {
  id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
};

export type MarketplaceAgentProfileResponse = {
  agent: MarketplaceAgent;
  ratings: AgentRating[];
};

export type BridgeConnection = {
  id: string;
  user_id: string;
  platform: 'telegram' | 'whatsapp';
  method: string;
  status: string;
  metadata: Record<string, unknown>;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentChannelStatus = {
  message: string;
  category?: string;
};

export type ToolApprovalRequest = {
  request_id: string;
  tool: string;
  args_preview: string;
  scopes: string[];
};

export type ToolConfig = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  requires_approval: boolean;
};

export type McpServerConfig = {
  name: string;
  transport: 'stdio' | 'sse' | 'streamable_http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
};

export type Agent = {
  id: string;
  creator_id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  system_prompt: string;
  model: string;
  execution_mode: 'raw' | 'claude_sdk' | 'openai_sdk';
  temperature: number;
  max_tokens: number;
  tools: ToolConfig[];
  mcp_servers: McpServerConfig[];
  visibility: 'public' | 'unlisted' | 'private';
  category: string | null;
  usage_count: number;
  rating_sum: number;
  rating_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AgentSchedule = {
  id: string;
  agent_id: string;
  schedule_type: 'cron' | 'interval' | 'once';
  cron_expression: string | null;
  interval_seconds: number | null;
  run_at: string | null;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  max_runs: number | null;
  payload: Record<string, unknown>;
};

export type AgentMemory = {
  id: string;
  agent_id: string;
  content: string;
  importance: number;
  memory_type: 'observation' | 'reflection' | 'fact' | 'preference';
  tags: string[];
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
};

export type AgentEvent = {
  id: string;
  agent_id: string;
  event_type: string;
  trigger_type: string | null;
  duration_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  model: string | null;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  error_code: string | null;
  error_message: string | null;
  inserted_at: string;
};

export type IntegrationStatus = {
  service: string;
  connected: boolean;
  status: 'active' | 'expired' | 'revoked' | 'not_connected';
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
};

export type ChannelRoute = {
  id: string;
  agent_id: string;
  service: string;
  external_chat_id: string;
  direction: 'inbound' | 'outbound' | 'both';
  enabled: boolean;
  metadata: Record<string, unknown>;
};
