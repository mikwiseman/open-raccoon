import { z } from 'zod';

const stripHtml = (v: string) => v.replace(/<[^>]*>/g, '');

/** Limit JSON object payloads to 10 KB to prevent memory exhaustion attacks. */
const boundedRecord = () =>
  z.record(z.unknown()).superRefine((val, ctx) => {
    const size = JSON.stringify(val).length;
    if (size > 10_240) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Object payload must not exceed 10 KB',
      });
    }
  });

export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(64).transform(stripHtml),
  description: z.string().max(2000).transform(stripHtml).optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
  trigger_config: boundedRecord().optional(),
  max_concurrent_runs: z.number().int().min(1).max(100).optional(),
  metadata: boundedRecord().optional(),
});

export const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(64).transform(stripHtml).optional(),
  description: z.string().max(2000).transform(stripHtml).nullable().optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
  trigger_config: boundedRecord().nullable().optional(),
  max_concurrent_runs: z.number().int().min(1).max(100).optional(),
  metadata: boundedRecord().optional(),
});

export const CreateStepSchema = z.object({
  name: z.string().min(1).max(64).transform(stripHtml),
  step_type: z.enum([
    'prompt',
    'tool_call',
    'condition',
    'transform',
    'wait',
    'sub_workflow',
    'human_input',
  ]),
  config: boundedRecord().optional(),
  position: z.number().int().min(0).optional(),
  timeout_ms: z.number().int().min(1000).max(3600000).optional(),
  retry_config: boundedRecord().optional(),
  metadata: boundedRecord().optional(),
});

export const UpdateStepSchema = z.object({
  name: z.string().min(1).max(64).transform(stripHtml).optional(),
  step_type: z
    .enum(['prompt', 'tool_call', 'condition', 'transform', 'wait', 'sub_workflow', 'human_input'])
    .optional(),
  config: boundedRecord().optional(),
  position: z.number().int().min(0).optional(),
  timeout_ms: z.number().int().min(1000).max(3600000).optional(),
  retry_config: boundedRecord().nullable().optional(),
  metadata: boundedRecord().optional(),
});

export const CreateEdgeSchema = z.object({
  source_step_id: z.string().uuid(),
  target_step_id: z.string().uuid(),
  condition: boundedRecord().optional(),
  label: z.string().max(32).transform(stripHtml).optional(),
});

export const RunWorkflowSchema = z.object({
  input: boundedRecord().optional(),
  conversation_id: z.string().uuid().optional(),
});

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;
export type CreateStepInput = z.infer<typeof CreateStepSchema>;
export type UpdateStepInput = z.infer<typeof UpdateStepSchema>;
export type CreateEdgeInput = z.infer<typeof CreateEdgeSchema>;
export type RunWorkflowInput = z.infer<typeof RunWorkflowSchema>;
