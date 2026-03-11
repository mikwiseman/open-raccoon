import type { TriggerCondition, TriggerConditionGroup } from '@wai-agents/shared';

/** Keys that must never be traversed to prevent prototype pollution reads. */
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Resolve a dot-notation path against a nested object.
 * e.g. getNestedValue({ a: { b: 'c' } }, 'a.b') => 'c'
 *
 * Returns `undefined` when the path cannot be fully resolved.
 * Blocks prototype-chain keys to prevent information-leak traversal.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split('.')) {
    if (BLOCKED_KEYS.has(key)) return undefined;
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/**
 * Evaluate a single condition against a payload.
 *
 * IMPORTANT: `eq` and `neq` treat missing/null values as non-matchable rather
 * than coercing them to the strings "undefined" / "null". This prevents a
 * condition `{ field: 'x', op: 'eq', value: 'undefined' }` from accidentally
 * matching when the field is absent.
 */
function evalSingle(payload: Record<string, unknown>, condition: TriggerCondition): boolean {
  const value = getNestedValue(payload, condition.field);

  switch (condition.op) {
    case 'exists':
      return value !== undefined && value !== null;

    case 'eq':
      // Missing or null values never equal any string
      if (value === undefined || value === null) return false;
      return String(value) === condition.value;

    case 'neq':
      // Missing or null values are considered "not equal" to any string
      if (value === undefined || value === null) return true;
      return String(value) !== condition.value;

    case 'contains': {
      if (typeof value !== 'string' || condition.value === undefined) return false;
      return value.includes(condition.value);
    }
  }
}

/**
 * Evaluate a condition group (all/any combinators) against a payload.
 * If the group is empty (no `all` and no `any`), returns true (pass-through).
 */
export function evaluateCondition(
  payload: Record<string, unknown>,
  condition: TriggerConditionGroup,
): boolean {
  const hasAll = condition.all !== undefined && condition.all.length > 0;
  const hasAny = condition.any !== undefined && condition.any.length > 0;

  // Empty condition group passes by default
  if (!hasAll && !hasAny) return true;

  // All conditions must pass
  if (hasAll) {
    const allPass = condition.all?.every((c) => evalSingle(payload, c));
    if (!allPass) return false;
  }

  // At least one condition must pass
  if (hasAny) {
    const anyPass = condition.any?.some((c) => evalSingle(payload, c));
    if (!anyPass) return false;
  }

  return true;
}
