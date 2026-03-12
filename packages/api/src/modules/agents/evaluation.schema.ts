import { z } from 'zod';

const stripHtml = (v: string) => v.replace(/<[^>]*>/g, '');

export const CreateEvalSuiteSchema = z.object({
  name: z.string().min(1).max(128).transform(stripHtml),
  description: z.string().max(4000).transform(stripHtml).optional(),
  scoring_rubric: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateEvalSuiteSchema = z.object({
  name: z.string().min(1).max(128).transform(stripHtml).optional(),
  description: z.string().max(4000).transform(stripHtml).nullable().optional(),
  scoring_rubric: z.record(z.unknown()).nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateTestCaseSchema = z.object({
  name: z.string().min(1).max(128).transform(stripHtml),
  input: z.record(z.unknown()),
  expected_output: z.record(z.unknown()).optional(),
  weight: z.number().min(0).max(100).optional(),
  tags: z.array(z.string().max(64).transform(stripHtml)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateTestCaseSchema = z.object({
  name: z.string().min(1).max(128).transform(stripHtml).optional(),
  input: z.record(z.unknown()).optional(),
  expected_output: z.record(z.unknown()).nullable().optional(),
  weight: z.number().min(0).max(100).optional(),
  tags: z.array(z.string().max(64).transform(stripHtml)).max(20).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const RunEvaluationSchema = z.object({
  metadata: z.record(z.unknown()).optional(),
});

export type CreateEvalSuiteInput = z.infer<typeof CreateEvalSuiteSchema>;
export type UpdateEvalSuiteInput = z.infer<typeof UpdateEvalSuiteSchema>;
export type CreateTestCaseInput = z.infer<typeof CreateTestCaseSchema>;
export type UpdateTestCaseInput = z.infer<typeof UpdateTestCaseSchema>;
export type RunEvaluationInput = z.infer<typeof RunEvaluationSchema>;
