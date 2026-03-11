import { z } from 'zod';

const stripHtml = (v: string) => v.replace(/<[^>]*>/g, '');

export const MemoryTypeEnum = z.enum(['fact', 'preference', 'context', 'relationship']);

export const CreateMemorySchema = z.object({
  memory_type: MemoryTypeEnum,
  content: z.string().min(1).max(10000).transform(stripHtml),
  embedding_key: z.string().max(256).optional(),
  importance: z.number().min(0).max(1).optional(),
  expires_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateMemorySchema = z.object({
  content: z.string().min(1).max(10000).transform(stripHtml).optional(),
  memory_type: MemoryTypeEnum.optional(),
  importance: z.number().min(0).max(1).optional(),
  embedding_key: z.string().max(256).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>;
