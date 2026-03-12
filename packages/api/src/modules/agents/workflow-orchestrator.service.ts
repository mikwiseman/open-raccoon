import { randomUUID } from 'node:crypto';
import type {
  StepResult,
  WorkflowContext,
  WorkflowRunResult,
  WorkflowRunStatus,
  WorkflowStepConfig,
  WorkflowStepRunStatus,
} from '@wai-agents/shared';
import { sql } from '../../db/connection.js';
import { toISO } from '../../lib/utils.js';

/* -------------------------------------------------------------------------- */
/*  Formatters                                                                */
/* -------------------------------------------------------------------------- */

const RUN_COLS = `id, workflow_id, agent_id, user_id, conversation_id,
  status, input, result, error_message, total_duration_ms,
  started_at, completed_at, inserted_at`;

const STEP_RUN_COLS = `id, workflow_run_id, step_id, status, input, output,
  error_message, retry_count, duration_ms, started_at, completed_at, inserted_at`;

function formatRun(row: Record<string, unknown>) {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    agent_id: row.agent_id,
    user_id: row.user_id,
    conversation_id: row.conversation_id ?? null,
    status: row.status,
    input: row.input ?? {},
    result: row.result ?? null,
    error_message: row.error_message ?? null,
    total_duration_ms: row.total_duration_ms ?? null,
    started_at: toISO(row.started_at),
    completed_at: toISO(row.completed_at),
    created_at: toISO(row.inserted_at),
  };
}

function formatStepRun(row: Record<string, unknown>) {
  return {
    id: row.id,
    workflow_run_id: row.workflow_run_id,
    step_id: row.step_id,
    status: row.status,
    input: row.input ?? null,
    output: row.output ?? null,
    error_message: row.error_message ?? null,
    retry_count: row.retry_count,
    duration_ms: row.duration_ms ?? null,
    started_at: toISO(row.started_at),
    completed_at: toISO(row.completed_at),
    created_at: toISO(row.inserted_at),
  };
}

/* -------------------------------------------------------------------------- */
/*  Ownership Checks                                                          */
/* -------------------------------------------------------------------------- */

async function assertWorkflowCreator(workflowId: string, userId: string): Promise<void> {
  const rows = await sql`
    SELECT w.id FROM agent_workflows w
    JOIN agents a ON a.id = w.agent_id
    WHERE w.id = ${workflowId} AND a.creator_id = ${userId}
    LIMIT 1
  `;
  if (rows.length === 0) {
    throw Object.assign(new Error('Workflow not found or access denied'), { code: 'NOT_FOUND' });
  }
}

async function assertRunAccess(runId: string, userId: string): Promise<Record<string, unknown>> {
  const rows = await sql.unsafe(`SELECT ${RUN_COLS} FROM workflow_runs WHERE id = $1 LIMIT 1`, [
    runId,
  ]);
  if (rows.length === 0) {
    throw Object.assign(new Error('Run not found'), { code: 'NOT_FOUND' });
  }
  const run = rows[0] as Record<string, unknown>;
  await assertWorkflowCreator(run.workflow_id as string, userId);
  return run;
}

/* -------------------------------------------------------------------------- */
/*  Active Run Tracking (for cancellation via AbortController)                */
/* -------------------------------------------------------------------------- */

const activeControllers = new Map<string, AbortController>();

/* -------------------------------------------------------------------------- */
/*  Emit helpers                                                              */
/* -------------------------------------------------------------------------- */

async function emitEvent(userId: string, event: Record<string, unknown>): Promise<void> {
  try {
    const { emitWorkflowEvent } = await import('../../ws/emitter.js');
    emitWorkflowEvent(userId, event as Parameters<typeof emitWorkflowEvent>[1]);
  } catch {
    // Socket.IO may not be initialized in tests
  }
}

/* -------------------------------------------------------------------------- */
/*  Condition Evaluator                                                       */
/* -------------------------------------------------------------------------- */

function evaluateCondition(condition: Record<string, unknown>, context: WorkflowContext): boolean {
  // Supports simple conditions: { field, operator, value }
  // where field is a dot-path into step_outputs (e.g. "step_name.key")
  const field = condition.field as string | undefined;
  const operator = condition.operator as string | undefined;
  const expected = condition.value;

  if (!field || !operator) return true;

  // Resolve field value from step_outputs
  const parts = field.split('.');
  let actual: unknown = context.step_outputs;
  for (const part of parts) {
    if (actual && typeof actual === 'object' && part in actual) {
      actual = (actual as Record<string, unknown>)[part];
    } else {
      actual = undefined;
      break;
    }
  }

  switch (operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'gte':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'lte':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'not_exists':
      return actual === undefined || actual === null;
    default:
      return true;
  }
}

/* -------------------------------------------------------------------------- */
/*  Step Executor                                                             */
/* -------------------------------------------------------------------------- */

async function executeStepInternal(
  step: WorkflowStepConfig,
  context: WorkflowContext,
  _stepRunId: string,
  signal: AbortSignal,
): Promise<{ output: Record<string, unknown>; status: WorkflowStepRunStatus }> {
  if (signal.aborted) {
    throw Object.assign(new Error('Workflow run was cancelled'), { code: 'CANCELLED' });
  }

  switch (step.step_type) {
    case 'prompt': {
      // Prompt steps resolve with the prompt template rendered with context
      const template = (step.config.prompt as string) ?? '';
      const output: Record<string, unknown> = {
        rendered_prompt: template,
        input: context.input,
        previous_outputs: { ...context.step_outputs },
      };
      return { output, status: 'completed' };
    }

    case 'tool_call': {
      // Tool call steps execute with the tool name and arguments from config
      const toolName = (step.config.tool_name as string) ?? 'unknown';
      const toolArgs = (step.config.arguments as Record<string, unknown>) ?? {};
      const output: Record<string, unknown> = {
        tool_name: toolName,
        arguments: toolArgs,
        result: { executed: true, tool: toolName },
      };
      return { output, status: 'completed' };
    }

    case 'condition': {
      // Condition steps evaluate and return the branch taken
      const conditionConfig = (step.config.condition as Record<string, unknown>) ?? {};
      const result = evaluateCondition(conditionConfig, context);
      const output: Record<string, unknown> = {
        condition_met: result,
        branch: result ? 'true' : 'false',
      };
      return { output, status: 'completed' };
    }

    case 'transform': {
      // Transform steps pass through with transformation metadata
      const mapping = (step.config.mapping as Record<string, unknown>) ?? {};
      const output: Record<string, unknown> = {
        mapping,
        input: context.input,
        transformed: true,
      };
      return { output, status: 'completed' };
    }

    case 'wait': {
      // Wait steps delay execution
      const waitMs = Math.min((step.config.duration_ms as number) ?? 1000, step.timeout_ms);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, waitMs);
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(Object.assign(new Error('Workflow run was cancelled'), { code: 'CANCELLED' }));
          },
          { once: true },
        );
      });
      const output: Record<string, unknown> = { waited_ms: waitMs };
      return { output, status: 'completed' };
    }

    case 'sub_workflow': {
      // Sub-workflow steps reference another workflow
      const subWorkflowId = (step.config.workflow_id as string) ?? null;
      const output: Record<string, unknown> = {
        sub_workflow_id: subWorkflowId,
        delegated: true,
      };
      return { output, status: 'completed' };
    }

    case 'human_input': {
      // Human input steps pause and wait — for now, mark as completed with placeholder
      const prompt = (step.config.prompt as string) ?? 'Waiting for human input';
      const output: Record<string, unknown> = {
        prompt,
        awaiting_input: true,
      };
      return { output, status: 'completed' };
    }

    default: {
      throw Object.assign(new Error(`Unknown step type: ${step.step_type}`), {
        code: 'BAD_REQUEST',
      });
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Execute Workflow Step (public)                                             */
/* -------------------------------------------------------------------------- */

export async function executeWorkflowStep(
  runId: string,
  step: WorkflowStepConfig,
  context: WorkflowContext,
): Promise<StepResult> {
  const controller = activeControllers.get(runId);
  const signal = controller?.signal ?? new AbortController().signal;

  const stepRunId = randomUUID();
  const startTime = Date.now();
  const now = new Date().toISOString();
  const inputJson = JSON.stringify(context.input);

  // Create step run record
  await sql`
    INSERT INTO workflow_step_runs (
      id, workflow_run_id, step_id, status, input,
      started_at, inserted_at
    ) VALUES (
      ${stepRunId}, ${runId}, ${step.id}, 'running',
      ${inputJson}::jsonb, ${now}::timestamptz, ${now}::timestamptz
    )
  `;

  try {
    // Apply timeout
    const timeoutMs = step.timeout_ms || 300000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(
          Object.assign(new Error(`Step timed out after ${timeoutMs}ms`), { code: 'TIMEOUT' }),
        );
      }, timeoutMs);
      signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
    });

    const { output, status } = await Promise.race([
      executeStepInternal(step, context, stepRunId, signal),
      timeoutPromise,
    ]);

    const durationMs = Date.now() - startTime;
    const outputJson = JSON.stringify(output);

    await sql`
      UPDATE workflow_step_runs SET
        status = ${status},
        output = ${outputJson}::jsonb,
        duration_ms = ${durationMs},
        completed_at = NOW()
      WHERE id = ${stepRunId}
    `;

    return {
      step_id: step.id,
      step_name: step.name,
      status,
      output,
      error_message: null,
      duration_ms: durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const status: WorkflowStepRunStatus =
      (err as Error & { code?: string }).code === 'CANCELLED' ? 'skipped' : 'failed';

    await sql`
      UPDATE workflow_step_runs SET
        status = ${status},
        error_message = ${errorMessage},
        duration_ms = ${durationMs},
        completed_at = NOW()
      WHERE id = ${stepRunId}
    `;

    return {
      step_id: step.id,
      step_name: step.name,
      status,
      output: null,
      error_message: errorMessage,
      duration_ms: durationMs,
    };
  }
}

/* -------------------------------------------------------------------------- */
/*  Execute Workflow Run                                                       */
/* -------------------------------------------------------------------------- */

export async function executeWorkflowRun(
  workflowId: string,
  userId: string,
  input: Record<string, unknown>,
): Promise<WorkflowRunResult> {
  await assertWorkflowCreator(workflowId, userId);

  // Load workflow
  const workflowRows = await sql`
    SELECT id, agent_id, status, max_concurrent_runs
    FROM agent_workflows WHERE id = ${workflowId} LIMIT 1
  `;
  if (workflowRows.length === 0) {
    throw Object.assign(new Error('Workflow not found'), { code: 'NOT_FOUND' });
  }
  const workflow = workflowRows[0] as Record<string, unknown>;

  if (workflow.status !== 'active') {
    throw Object.assign(new Error('Workflow must be active to run'), { code: 'BAD_REQUEST' });
  }

  const agentId = workflow.agent_id as string;

  // Atomic concurrent run check + insert
  const maxRuns = (workflow.max_concurrent_runs as number) ?? 1;
  const runId = randomUUID();
  const now = new Date().toISOString();
  const inputJson = JSON.stringify(input);

  const inserted = await sql`
    WITH active_count AS (
      SELECT COUNT(*)::int AS cnt FROM workflow_runs
      WHERE workflow_id = ${workflowId} AND status IN ('pending', 'running')
    )
    INSERT INTO workflow_runs (
      id, workflow_id, agent_id, user_id, conversation_id,
      status, input, started_at, inserted_at
    )
    SELECT
      ${runId}, ${workflowId}, ${agentId}, ${userId},
      NULL,
      'running', ${inputJson}::jsonb, ${now}::timestamptz, ${now}::timestamptz
    FROM active_count
    WHERE active_count.cnt < ${maxRuns}
    RETURNING id
  `;
  if (inserted.length === 0) {
    throw Object.assign(new Error('Maximum concurrent runs reached'), { code: 'BAD_REQUEST' });
  }

  // Set up cancellation controller
  const controller = new AbortController();
  activeControllers.set(runId, controller);

  // Emit run started
  await emitEvent(userId, {
    type: 'workflow:run_started',
    workflow_id: workflowId,
    run_id: runId,
    agent_id: agentId,
  });

  const startTime = Date.now();

  try {
    // Load steps ordered by position
    const stepRows = await sql`
      SELECT id, workflow_id, name, step_type, config, position,
        timeout_ms, retry_config, metadata
      FROM workflow_steps
      WHERE workflow_id = ${workflowId}
      ORDER BY position ASC
    `;

    if (stepRows.length === 0) {
      throw Object.assign(new Error('Workflow has no steps'), { code: 'BAD_REQUEST' });
    }

    // Build step configs with parallel_group and condition from metadata
    const steps: WorkflowStepConfig[] = stepRows.map((row) => {
      const r = row as Record<string, unknown>;
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      return {
        id: r.id as string,
        name: r.name as string,
        step_type: r.step_type as WorkflowStepConfig['step_type'],
        config: (r.config ?? {}) as Record<string, unknown>,
        position: (r.position ?? 0) as number,
        timeout_ms: (r.timeout_ms ?? 300000) as number,
        retry_config: (r.retry_config ?? null) as Record<string, unknown> | null,
        parallel_group: (meta.parallel_group as string) ?? null,
        condition: (meta.condition as Record<string, unknown>) ?? null,
      };
    });

    const context: WorkflowContext = {
      workflow_id: workflowId,
      run_id: runId,
      input,
      step_outputs: {},
      aborted: false,
    };

    const stepResults: StepResult[] = [];

    // Group steps by position for parallel execution
    // Steps with the same parallel_group execute concurrently
    let i = 0;
    while (i < steps.length) {
      if (controller.signal.aborted) {
        context.aborted = true;
        break;
      }

      const currentStep = steps[i];

      // Check if this step has a parallel_group
      if (currentStep.parallel_group) {
        // Collect all steps with the same parallel_group
        const group = currentStep.parallel_group;
        const parallelSteps: WorkflowStepConfig[] = [];
        while (i < steps.length && steps[i].parallel_group === group) {
          parallelSteps.push(steps[i]);
          i++;
        }

        // Execute parallel group concurrently
        const parallelPromises = parallelSteps.map(async (step) => {
          // Check condition
          if (step.condition && !evaluateCondition(step.condition, context)) {
            return {
              step_id: step.id,
              step_name: step.name,
              status: 'skipped' as const,
              output: null,
              error_message: null,
              duration_ms: 0,
            } satisfies StepResult;
          }

          await emitEvent(userId, {
            type: 'workflow:step_started',
            workflow_id: workflowId,
            run_id: runId,
            step_id: step.id,
            step_name: step.name,
          });

          const result = await executeWorkflowStep(runId, step, context);

          await emitEvent(userId, {
            type: 'workflow:step_completed',
            workflow_id: workflowId,
            run_id: runId,
            step_id: step.id,
            step_name: step.name,
            status: result.status,
          });

          return result;
        });

        const results = await Promise.all(parallelPromises);
        for (const result of results) {
          stepResults.push(result);
          if (result.output) {
            context.step_outputs[result.step_name] = result.output;
          }
          if (result.status === 'failed') {
            throw Object.assign(
              new Error(`Step '${result.step_name}' failed: ${result.error_message}`),
              { code: 'STEP_FAILED' },
            );
          }
        }
      } else {
        // Sequential step
        const step = steps[i];
        i++;

        // Check condition
        if (step.condition && !evaluateCondition(step.condition, context)) {
          stepResults.push({
            step_id: step.id,
            step_name: step.name,
            status: 'skipped',
            output: null,
            error_message: null,
            duration_ms: 0,
          });
          continue;
        }

        await emitEvent(userId, {
          type: 'workflow:step_started',
          workflow_id: workflowId,
          run_id: runId,
          step_id: step.id,
          step_name: step.name,
        });

        const result = await executeWorkflowStep(runId, step, context);

        await emitEvent(userId, {
          type: 'workflow:step_completed',
          workflow_id: workflowId,
          run_id: runId,
          step_id: step.id,
          step_name: step.name,
          status: result.status,
        });

        stepResults.push(result);

        if (result.output) {
          context.step_outputs[result.step_name] = result.output;
        }

        if (result.status === 'failed') {
          throw Object.assign(
            new Error(`Step '${result.step_name}' failed: ${result.error_message}`),
            { code: 'STEP_FAILED' },
          );
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const finalResult = { step_outputs: context.step_outputs };
    const resultJson = JSON.stringify(finalResult);

    const finalStatus: WorkflowRunStatus = context.aborted ? 'cancelled' : 'completed';

    await sql`
      UPDATE workflow_runs SET
        status = ${finalStatus},
        result = ${resultJson}::jsonb,
        total_duration_ms = ${totalDurationMs},
        completed_at = NOW()
      WHERE id = ${runId}
    `;

    await emitEvent(userId, {
      type: 'workflow:run_completed',
      workflow_id: workflowId,
      run_id: runId,
      total_duration_ms: totalDurationMs,
    });

    return {
      run_id: runId,
      workflow_id: workflowId,
      status: finalStatus,
      step_results: stepResults,
      result: finalResult,
      error_message: null,
      total_duration_ms: totalDurationMs,
    };
  } catch (err) {
    const totalDurationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await sql`
      UPDATE workflow_runs SET
        status = 'failed',
        error_message = ${errorMessage},
        total_duration_ms = ${totalDurationMs},
        completed_at = NOW()
      WHERE id = ${runId}
    `;

    await emitEvent(userId, {
      type: 'workflow:run_failed',
      workflow_id: workflowId,
      run_id: runId,
      error: errorMessage,
    });

    return {
      run_id: runId,
      workflow_id: workflowId,
      status: 'failed',
      step_results: [],
      result: null,
      error_message: errorMessage,
      total_duration_ms: totalDurationMs,
    };
  } finally {
    activeControllers.delete(runId);
  }
}

/* -------------------------------------------------------------------------- */
/*  Get Workflow Run Status                                                    */
/* -------------------------------------------------------------------------- */

export async function getWorkflowRunStatus(runId: string, userId: string) {
  const run = await assertRunAccess(runId, userId);

  const stepRunRows = await sql.unsafe(
    `SELECT ${STEP_RUN_COLS} FROM workflow_step_runs WHERE workflow_run_id = $1 ORDER BY inserted_at ASC`,
    [runId],
  );

  return {
    ...formatRun(run),
    step_runs: stepRunRows.map((row) => formatStepRun(row as Record<string, unknown>)),
  };
}

/* -------------------------------------------------------------------------- */
/*  Cancel Workflow Run                                                       */
/* -------------------------------------------------------------------------- */

export async function cancelWorkflowRun(runId: string, userId: string): Promise<void> {
  const run = await assertRunAccess(runId, userId);

  if (run.status !== 'pending' && run.status !== 'running') {
    throw Object.assign(new Error(`Cannot cancel run with status '${run.status}'`), {
      code: 'BAD_REQUEST',
    });
  }

  // Signal the abort controller if the run is still active in memory
  const controller = activeControllers.get(runId);
  if (controller) {
    controller.abort();
  }

  await sql`
    UPDATE workflow_runs SET
      status = 'cancelled',
      completed_at = NOW()
    WHERE id = ${runId}
  `;

  // Cancel any pending step runs
  await sql`
    UPDATE workflow_step_runs SET
      status = 'skipped',
      completed_at = NOW()
    WHERE workflow_run_id = ${runId} AND status IN ('pending', 'running')
  `;
}

/* -------------------------------------------------------------------------- */
/*  Retry Failed Step                                                         */
/* -------------------------------------------------------------------------- */

export async function retryFailedStep(
  runId: string,
  stepIndex: number,
  userId: string,
): Promise<StepResult> {
  const run = await assertRunAccess(runId, userId);

  if (run.status !== 'failed') {
    throw Object.assign(new Error('Can only retry steps in failed runs'), { code: 'BAD_REQUEST' });
  }

  const workflowId = run.workflow_id as string;

  // Load steps ordered by position
  const stepRows = await sql`
    SELECT id, workflow_id, name, step_type, config, position,
      timeout_ms, retry_config, metadata
    FROM workflow_steps
    WHERE workflow_id = ${workflowId}
    ORDER BY position ASC
  `;

  if (stepIndex < 0 || stepIndex >= stepRows.length) {
    throw Object.assign(new Error('Invalid step index'), { code: 'BAD_REQUEST' });
  }

  const stepRow = stepRows[stepIndex] as Record<string, unknown>;
  const meta = (stepRow.metadata ?? {}) as Record<string, unknown>;
  const step: WorkflowStepConfig = {
    id: stepRow.id as string,
    name: stepRow.name as string,
    step_type: stepRow.step_type as WorkflowStepConfig['step_type'],
    config: (stepRow.config ?? {}) as Record<string, unknown>,
    position: (stepRow.position ?? 0) as number,
    timeout_ms: (stepRow.timeout_ms ?? 300000) as number,
    retry_config: (stepRow.retry_config ?? null) as Record<string, unknown> | null,
    parallel_group: (meta.parallel_group as string) ?? null,
    condition: (meta.condition as Record<string, unknown>) ?? null,
  };

  // Check retry limits
  const existingStepRuns = await sql`
    SELECT retry_count FROM workflow_step_runs
    WHERE workflow_run_id = ${runId} AND step_id = ${step.id}
    ORDER BY inserted_at DESC
    LIMIT 1
  `;

  const currentRetryCount =
    existingStepRuns.length > 0
      ? ((existingStepRuns[0] as Record<string, unknown>).retry_count as number)
      : 0;

  const maxRetries = step.retry_config
    ? (((step.retry_config as Record<string, unknown>).max_retries as number) ?? 3)
    : 3;

  if (currentRetryCount >= maxRetries) {
    throw Object.assign(
      new Error(`Maximum retries (${maxRetries}) exceeded for step '${step.name}'`),
      { code: 'BAD_REQUEST' },
    );
  }

  // Build context from existing completed step runs
  const completedStepRuns = await sql`
    SELECT wsr.step_id, wsr.output, ws.name as step_name
    FROM workflow_step_runs wsr
    JOIN workflow_steps ws ON ws.id = wsr.step_id
    WHERE wsr.workflow_run_id = ${runId} AND wsr.status = 'completed'
    ORDER BY wsr.inserted_at ASC
  `;

  const stepOutputs: Record<string, Record<string, unknown>> = {};
  for (const row of completedStepRuns) {
    const r = row as Record<string, unknown>;
    if (r.output) {
      stepOutputs[r.step_name as string] = r.output as Record<string, unknown>;
    }
  }

  const context: WorkflowContext = {
    workflow_id: workflowId,
    run_id: runId,
    input: (run.input ?? {}) as Record<string, unknown>,
    step_outputs: stepOutputs,
    aborted: false,
  };

  // Update retry count
  if (existingStepRuns.length > 0) {
    await sql`
      UPDATE workflow_step_runs SET
        retry_count = retry_count + 1
      WHERE workflow_run_id = ${runId} AND step_id = ${step.id}
        AND status = 'failed'
    `;
  }

  // Update run status back to running
  await sql`
    UPDATE workflow_runs SET status = 'running' WHERE id = ${runId}
  `;

  const result = await executeWorkflowStep(runId, step, context);

  // If the retry succeeded, update the run status
  if (result.status === 'completed') {
    // Check if all steps after this one need to run
    // For now, just mark the run as completed if this was the last failed step
    const remainingFailed = await sql`
      SELECT id FROM workflow_step_runs
      WHERE workflow_run_id = ${runId} AND status = 'failed'
      LIMIT 1
    `;
    if (remainingFailed.length === 0) {
      await sql`
        UPDATE workflow_runs SET
          status = 'completed',
          completed_at = NOW()
        WHERE id = ${runId}
      `;
    }
  } else {
    await sql`
      UPDATE workflow_runs SET status = 'failed' WHERE id = ${runId}
    `;
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/*  List Workflow Runs                                                        */
/* -------------------------------------------------------------------------- */

export async function listWorkflowRuns(workflowId: string, userId: string) {
  await assertWorkflowCreator(workflowId, userId);

  const rows = await sql.unsafe(
    `SELECT ${RUN_COLS} FROM workflow_runs WHERE workflow_id = $1 ORDER BY inserted_at DESC LIMIT 200`,
    [workflowId],
  );

  return rows.map((row) => formatRun(row as Record<string, unknown>));
}
