import { describe, expect, it } from 'vitest';
import type {
  AgentEventStatus,
  AgentVisibility,
  AutonomyLevel,
  BridgeMethod,
  BridgePlatform,
  BridgeStatus,
  ChannelDirection,
  ConversationType,
  ExecutionMode,
  FeedItemType,
  FeedReferenceType,
  IntegrationAuthMethod,
  IntegrationStatus,
  MemberRole,
  MemoryType,
  MessageType,
  PageVisibility,
  ParticipantType,
  ScheduleType,
  SenderType,
  SoulBlockLabel,
  ToolApprovalDecision,
  ToolApprovalScope,
  UserRole,
  UserStatus,
} from '../types/models.js';

/* ================================================================
 * ParticipantType
 * ================================================================ */

describe('ParticipantType — union type verification', () => {
  it('accepts user and agent', () => {
    const types: ParticipantType[] = ['user', 'agent'];
    expect(types).toHaveLength(2);
  });

  it('user is a valid ParticipantType', () => {
    const pt: ParticipantType = 'user';
    expect(pt).toBe('user');
  });

  it('agent is a valid ParticipantType', () => {
    const pt: ParticipantType = 'agent';
    expect(pt).toBe('agent');
  });
});

/* ================================================================
 * SenderType
 * ================================================================ */

describe('SenderType — union type verification', () => {
  it('has exactly 4 members', () => {
    const types: SenderType[] = ['human', 'agent', 'bridge', 'system'];
    expect(types).toHaveLength(4);
  });

  it('human is a valid SenderType', () => {
    const st: SenderType = 'human';
    expect(st).toBe('human');
  });

  it('bridge is a valid SenderType', () => {
    const st: SenderType = 'bridge';
    expect(st).toBe('bridge');
  });

  it('system is a valid SenderType', () => {
    const st: SenderType = 'system';
    expect(st).toBe('system');
  });
});

/* ================================================================
 * ConversationType
 * ================================================================ */

describe('ConversationType — union type verification', () => {
  it('has exactly 4 members', () => {
    const types: ConversationType[] = ['dm', 'group', 'agent', 'bridge'];
    expect(types).toHaveLength(4);
  });

  it('dm is a valid conversation type', () => {
    const ct: ConversationType = 'dm';
    expect(ct).toBe('dm');
  });
});

/* ================================================================
 * MessageType
 * ================================================================ */

describe('MessageType — union type verification', () => {
  it('has exactly 6 members', () => {
    const types: MessageType[] = ['text', 'media', 'code', 'embed', 'system', 'agent_status'];
    expect(types).toHaveLength(6);
  });

  it('agent_status is a valid MessageType', () => {
    const mt: MessageType = 'agent_status';
    expect(mt).toBe('agent_status');
  });
});

/* ================================================================
 * UserStatus & UserRole
 * ================================================================ */

describe('UserStatus — union type verification', () => {
  it('has exactly 3 members', () => {
    const statuses: UserStatus[] = ['active', 'suspended', 'deleted'];
    expect(statuses).toHaveLength(3);
  });

  it('active is valid', () => {
    const s: UserStatus = 'active';
    expect(s).toBe('active');
  });

  it('suspended is valid', () => {
    const s: UserStatus = 'suspended';
    expect(s).toBe('suspended');
  });

  it('deleted is valid', () => {
    const s: UserStatus = 'deleted';
    expect(s).toBe('deleted');
  });
});

describe('UserRole — union type verification', () => {
  it('has exactly 3 members', () => {
    const roles: UserRole[] = ['user', 'admin', 'moderator'];
    expect(roles).toHaveLength(3);
  });

  it('admin is a valid role', () => {
    const r: UserRole = 'admin';
    expect(r).toBe('admin');
  });

  it('moderator is a valid role', () => {
    const r: UserRole = 'moderator';
    expect(r).toBe('moderator');
  });
});

/* ================================================================
 * AgentVisibility & MemberRole
 * ================================================================ */

describe('AgentVisibility — union type verification', () => {
  it('has exactly 3 members', () => {
    const vis: AgentVisibility[] = ['public', 'unlisted', 'private'];
    expect(vis).toHaveLength(3);
  });
});

describe('MemberRole — union type verification', () => {
  it('has exactly 3 members', () => {
    const roles: MemberRole[] = ['owner', 'admin', 'member'];
    expect(roles).toHaveLength(3);
  });

  it('owner is a valid member role', () => {
    const r: MemberRole = 'owner';
    expect(r).toBe('owner');
  });
});

/* ================================================================
 * AutonomyLevel
 * ================================================================ */

describe('AutonomyLevel — union type verification', () => {
  it('has exactly 4 members', () => {
    const levels: AutonomyLevel[] = ['ask_always', 'ask_first_time', 'ask_if_unsure', 'autonomous'];
    expect(levels).toHaveLength(4);
  });

  it('autonomous is a valid level', () => {
    const l: AutonomyLevel = 'autonomous';
    expect(l).toBe('autonomous');
  });
});

/* ================================================================
 * ExecutionMode
 * ================================================================ */

describe('ExecutionMode — union type verification', () => {
  it('has exactly 3 members', () => {
    const modes: ExecutionMode[] = ['raw', 'claude_sdk', 'openai_sdk'];
    expect(modes).toHaveLength(3);
  });
});

/* ================================================================
 * SoulBlockLabel & MemoryType
 * ================================================================ */

describe('SoulBlockLabel — union type verification', () => {
  it('has exactly 4 members', () => {
    const labels: SoulBlockLabel[] = ['identity', 'rules', 'priorities', 'preferences'];
    expect(labels).toHaveLength(4);
  });
});

describe('MemoryType — union type verification', () => {
  it('has exactly 9 members', () => {
    const types: MemoryType[] = [
      'observation',
      'reflection',
      'fact',
      'preference',
      'context',
      'relationship',
      'episodic',
      'semantic',
      'procedural',
    ];
    expect(types).toHaveLength(9);
  });
});

/* ================================================================
 * ScheduleType & AgentEventStatus
 * ================================================================ */

describe('ScheduleType — union type verification', () => {
  it('has exactly 3 members', () => {
    const types: ScheduleType[] = ['cron', 'interval', 'once'];
    expect(types).toHaveLength(3);
  });
});

describe('AgentEventStatus — union type verification', () => {
  it('has exactly 4 members', () => {
    const statuses: AgentEventStatus[] = ['running', 'completed', 'failed', 'timeout'];
    expect(statuses).toHaveLength(4);
  });

  it('timeout is a valid status', () => {
    const s: AgentEventStatus = 'timeout';
    expect(s).toBe('timeout');
  });
});

/* ================================================================
 * ToolApprovalScope & ToolApprovalDecision
 * ================================================================ */

describe('ToolApprovalScope — union type verification', () => {
  it('has exactly 3 members', () => {
    const scopes: ToolApprovalScope[] = [
      'allow_once',
      'allow_for_session',
      'always_for_agent_tool',
    ];
    expect(scopes).toHaveLength(3);
  });
});

describe('ToolApprovalDecision — union type verification', () => {
  it('has exactly 4 members', () => {
    const decisions: ToolApprovalDecision[] = ['approved', 'denied', 'revoked', 'pending'];
    expect(decisions).toHaveLength(4);
  });

  it('pending is valid', () => {
    const d: ToolApprovalDecision = 'pending';
    expect(d).toBe('pending');
  });

  it('revoked is valid', () => {
    const d: ToolApprovalDecision = 'revoked';
    expect(d).toBe('revoked');
  });
});

/* ================================================================
 * BridgePlatform, BridgeMethod, BridgeStatus
 * ================================================================ */

describe('BridgePlatform — union type verification', () => {
  it('has exactly 4 members', () => {
    const platforms: BridgePlatform[] = ['telegram', 'whatsapp', 'signal', 'discord'];
    expect(platforms).toHaveLength(4);
  });
});

describe('BridgeMethod — union type verification', () => {
  it('has exactly 3 members', () => {
    const methods: BridgeMethod[] = ['user_level', 'bot', 'cloud_api'];
    expect(methods).toHaveLength(3);
  });
});

describe('BridgeStatus — union type verification', () => {
  it('has exactly 4 members', () => {
    const statuses: BridgeStatus[] = ['connected', 'reconnecting', 'disconnected', 'error'];
    expect(statuses).toHaveLength(4);
  });

  it('error is a valid status', () => {
    const s: BridgeStatus = 'error';
    expect(s).toBe('error');
  });
});

/* ================================================================
 * FeedItemType & FeedReferenceType
 * ================================================================ */

describe('FeedItemType — union type verification', () => {
  it('has exactly 5 members', () => {
    const types: FeedItemType[] = [
      'agent_showcase',
      'page_showcase',
      'tool_showcase',
      'remix',
      'creation',
    ];
    expect(types).toHaveLength(5);
  });
});

describe('FeedReferenceType — union type verification', () => {
  it('has exactly 3 members', () => {
    const types: FeedReferenceType[] = ['agent', 'page', 'tool'];
    expect(types).toHaveLength(3);
  });
});

/* ================================================================
 * IntegrationAuthMethod & IntegrationStatus
 * ================================================================ */

describe('IntegrationAuthMethod — union type verification', () => {
  it('has exactly 4 members', () => {
    const methods: IntegrationAuthMethod[] = ['oauth2', 'oauth2_pkce', 'bot_token', 'api_key'];
    expect(methods).toHaveLength(4);
  });
});

describe('IntegrationStatus — union type verification', () => {
  it('has exactly 3 members', () => {
    const statuses: IntegrationStatus[] = ['active', 'expired', 'revoked'];
    expect(statuses).toHaveLength(3);
  });
});

/* ================================================================
 * ChannelDirection & PageVisibility
 * ================================================================ */

describe('ChannelDirection — union type verification', () => {
  it('has exactly 3 members', () => {
    const directions: ChannelDirection[] = ['inbound', 'outbound', 'both'];
    expect(directions).toHaveLength(3);
  });
});

describe('PageVisibility — union type verification', () => {
  it('has exactly 3 members', () => {
    const vis: PageVisibility[] = ['public', 'unlisted', 'private'];
    expect(vis).toHaveLength(3);
  });
});
