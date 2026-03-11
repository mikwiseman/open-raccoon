import { z } from 'zod';

/* ---- Collaboration Status ---- */

export const CollaborationStatusSchema = z.enum([
  'pending',
  'accepted',
  'in_progress',
  'completed',
  'failed',
  'rejected',
]);

export type CollaborationStatus = z.infer<typeof CollaborationStatusSchema>;

/* ---- Agent Collaboration Interface ---- */

export interface AgentCollaboration {
  id: string;
  requester_agent_id: string;
  responder_agent_id: string;
  requester_user_id: string;
  conversation_id: string;
  status: CollaborationStatus;
  task_description: string;
  task_result: string | null;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
}

/* ---- Payloads ---- */

export interface CreateCollaborationPayload {
  responder_agent_id: string;
  task_description: string;
  metadata?: Record<string, unknown>;
}

export interface CompleteCollaborationPayload {
  result: string;
}

export interface RejectCollaborationPayload {
  reason: string;
}

export interface ListCollaborationsQuery {
  status?: CollaborationStatus;
  direction?: 'sent' | 'received';
}

/* ---- Socket.IO Events ---- */

export const CollaborationRequestedEventSchema = z.object({
  type: z.literal('collaboration:requested'),
  collaboration_id: z.string(),
  requester_agent_id: z.string(),
  responder_agent_id: z.string(),
  task_description: z.string(),
});

export const CollaborationAcceptedEventSchema = z.object({
  type: z.literal('collaboration:accepted'),
  collaboration_id: z.string(),
  responder_agent_id: z.string(),
});

export const CollaborationCompletedEventSchema = z.object({
  type: z.literal('collaboration:completed'),
  collaboration_id: z.string(),
  responder_agent_id: z.string(),
  result: z.string(),
});

export const CollaborationRejectedEventSchema = z.object({
  type: z.literal('collaboration:rejected'),
  collaboration_id: z.string(),
  responder_agent_id: z.string(),
  reason: z.string(),
});

export type CollaborationRequestedEvent = z.infer<typeof CollaborationRequestedEventSchema>;
export type CollaborationAcceptedEvent = z.infer<typeof CollaborationAcceptedEventSchema>;
export type CollaborationCompletedEvent = z.infer<typeof CollaborationCompletedEventSchema>;
export type CollaborationRejectedEvent = z.infer<typeof CollaborationRejectedEventSchema>;
export type CollaborationEvent =
  | CollaborationRequestedEvent
  | CollaborationAcceptedEvent
  | CollaborationCompletedEvent
  | CollaborationRejectedEvent;
