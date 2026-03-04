import { z } from 'zod';

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(64),
  template: z.string().optional(),
  description: z.string().optional(),
  system_prompt: z.string().optional(),
  model: z.string().optional(),
  tools: z.array(z.unknown()).optional(),
  mcp_servers: z.array(z.unknown()).optional(),
  visibility: z.string().optional(),
  category: z.string().optional(),
});

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  description: z.string().optional(),
  system_prompt: z.string().optional(),
  model: z.string().optional(),
  tools: z.array(z.unknown()).optional(),
  mcp_servers: z.array(z.unknown()).optional(),
  visibility: z.string().optional(),
  category: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
