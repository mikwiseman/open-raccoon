import { z } from 'zod';
import { ContentBlockSchema } from '@open-raccoon/shared';

export const CreateConversationSchema = z.object({
  title: z.string().max(255).optional(),
  type: z.enum(['dm', 'group', 'agent']),
  member_ids: z.array(z.string().uuid()).optional(),
});

export const UpdateConversationSchema = z.object({
  title: z.string().max(255).optional(),
  avatar_url: z.string().url().optional(),
});

export const SendMessageSchema = z.object({
  content: z.array(ContentBlockSchema),
});

export const AddMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']).optional(),
});

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
export type UpdateConversationInput = z.infer<typeof UpdateConversationSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type AddMemberInput = z.infer<typeof AddMemberSchema>;
