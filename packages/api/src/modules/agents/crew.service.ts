import { randomUUID } from 'node:crypto';
import { sql } from '../../db/connection.js';
import { toISO } from '../../lib/utils.js';
import type { CreateCrewInput, UpdateCrewInput } from './crew.schema.js';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatCrew(row: Record<string, unknown>) {
  return {
    id: row.id,
    creator_id: row.creator_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    visibility: row.visibility,
    steps: row.steps,
    category: row.category,
    usage_count: row.usage_count,
    rating_sum: row.rating_sum,
    rating_count: row.rating_count,
    metadata: row.metadata,
    created_at: toISO(row.inserted_at),
    updated_at: toISO(row.updated_at),
  };
}

async function assertCreator(crewId: string, userId: string): Promise<void> {
  const rows = await sql`
    SELECT id FROM agent_crews WHERE id = ${crewId} AND creator_id = ${userId} LIMIT 1
  `;
  if (rows.length === 0) {
    throw Object.assign(new Error('Crew not found or access denied'), { code: 'NOT_FOUND' });
  }
}

export async function listCrews(userId: string) {
  const rows = await sql`
    SELECT id, creator_id, name, slug, description, visibility, steps, category,
           usage_count, rating_sum, rating_count, metadata, inserted_at, updated_at
    FROM agent_crews
    WHERE creator_id = ${userId}
    ORDER BY inserted_at DESC
    LIMIT 200
  `;
  return rows.map((row) => formatCrew(row as Record<string, unknown>));
}

export async function createCrew(userId: string, input: CreateCrewInput) {
  // Validate step count
  if (input.steps.length < 1 || input.steps.length > 5) {
    throw Object.assign(new Error('Crew must have between 1 and 5 steps'), {
      code: 'BAD_REQUEST',
    });
  }

  // Validate all agent IDs exist
  const agentIds = input.steps.map((s) => s.agentId);
  const agentRows = await sql`
    SELECT id FROM agents WHERE id = ANY(${agentIds})
  `;
  const foundIds = new Set(
    (agentRows as Array<Record<string, unknown>>).map((r) => r.id as string),
  );
  for (const id of agentIds) {
    if (!foundIds.has(id)) {
      throw Object.assign(new Error(`Agent ${id} not found`), { code: 'BAD_REQUEST' });
    }
  }

  const baseSlug = slugify(input.name);
  let slug = baseSlug;

  // Ensure slug uniqueness (cap at 10000 to prevent unbounded loops)
  const existing =
    await sql`SELECT slug FROM agent_crews WHERE slug LIKE ${`${baseSlug}%`} ORDER BY slug`;
  if (existing.length > 0) {
    const existingSlugs = new Set(
      (existing as Array<Record<string, unknown>>).map((r) => r.slug as string),
    );
    if (existingSlugs.has(slug)) {
      let counter = 2;
      while (existingSlugs.has(`${baseSlug}-${counter}`) && counter < 10000) {
        counter++;
      }
      slug = `${baseSlug}-${counter}`;
    }
  }

  const crewId = randomUUID();
  const now = new Date().toISOString();
  const stepsJson = JSON.stringify(input.steps);

  await sql`
    INSERT INTO agent_crews (
      id, creator_id, name, slug, description, visibility, steps, category, metadata, inserted_at, updated_at
    ) VALUES (
      ${crewId}, ${userId}, ${input.name}, ${slug},
      ${input.description ?? null}, ${input.visibility ?? 'private'},
      ${stepsJson}::jsonb, ${input.category ?? null},
      '{}', ${now}, ${now}
    )
  `;

  const rows = await sql`
    SELECT id, creator_id, name, slug, description, visibility, steps, category,
           usage_count, rating_sum, rating_count, metadata, inserted_at, updated_at
    FROM agent_crews WHERE id = ${crewId}
  `;

  return formatCrew(rows[0] as Record<string, unknown>);
}

export async function getCrew(crewId: string, userId: string) {
  const rows = await sql`
    SELECT id, creator_id, name, slug, description, visibility, steps, category,
           usage_count, rating_sum, rating_count, metadata, inserted_at, updated_at
    FROM agent_crews
    WHERE id = ${crewId} AND creator_id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw Object.assign(new Error('Crew not found'), { code: 'NOT_FOUND' });
  }

  return formatCrew(rows[0] as Record<string, unknown>);
}

export async function updateCrew(crewId: string, userId: string, updates: UpdateCrewInput) {
  await assertCreator(crewId, userId);

  // If steps are being updated, validate
  if (updates.steps !== undefined) {
    if (updates.steps.length < 1 || updates.steps.length > 5) {
      throw Object.assign(new Error('Crew must have between 1 and 5 steps'), {
        code: 'BAD_REQUEST',
      });
    }
    const agentIds = updates.steps.map((s) => s.agentId);
    const agentRows = await sql`
      SELECT id FROM agents WHERE id = ANY(${agentIds})
    `;
    const foundIds = new Set(
      (agentRows as Array<Record<string, unknown>>).map((r) => r.id as string),
    );
    for (const id of agentIds) {
      if (!foundIds.has(id)) {
        throw Object.assign(new Error(`Agent ${id} not found`), { code: 'BAD_REQUEST' });
      }
    }
  }

  const name = updates.name !== undefined ? updates.name : null;
  const description = updates.description !== undefined ? updates.description : null;
  const stepsJson = updates.steps !== undefined ? JSON.stringify(updates.steps) : null;
  const visibility = updates.visibility !== undefined ? updates.visibility : null;
  const category = updates.category !== undefined ? updates.category : null;

  const rows = await sql`
    UPDATE agent_crews SET
      name        = CASE WHEN ${name !== null} THEN ${name} ELSE name END,
      description = CASE WHEN ${description !== null} THEN ${description} ELSE description END,
      steps       = CASE WHEN ${stepsJson !== null} THEN ${stepsJson}::jsonb ELSE steps END,
      visibility  = CASE WHEN ${visibility !== null} THEN ${visibility} ELSE visibility END,
      category    = CASE WHEN ${category !== null} THEN ${category} ELSE category END,
      updated_at  = NOW()
    WHERE id = ${crewId}
    RETURNING id, creator_id, name, slug, description, visibility, steps, category,
              usage_count, rating_sum, rating_count, metadata, inserted_at, updated_at
  `;

  if (rows.length === 0) {
    throw Object.assign(new Error('Crew not found'), { code: 'NOT_FOUND' });
  }

  return formatCrew(rows[0] as Record<string, unknown>);
}

export async function deleteCrew(crewId: string, userId: string) {
  await assertCreator(crewId, userId);
  await sql`DELETE FROM agent_crews WHERE id = ${crewId}`;
}
