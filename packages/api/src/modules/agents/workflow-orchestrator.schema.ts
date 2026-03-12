import { z } from 'zod';

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

export const ExecuteWorkflowSchema = z.object({
  input: boundedRecord().optional().default({}),
});

export const RetryStepSchema = z.object({
  step_index: z.number().int().min(0),
});

export type ExecuteWorkflowInput = z.infer<typeof ExecuteWorkflowSchema>;
export type RetryStepInput = z.infer<typeof RetryStepSchema>;
