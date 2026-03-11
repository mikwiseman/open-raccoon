'use client';

export type ProposalBlockData = {
  type: 'proposal';
  title: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  proposalId?: string;
  onApprove?: () => void;
  onReject?: () => void;
};

const STATUS_LABELS: Record<ProposalBlockData['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_CLASSES: Record<ProposalBlockData['status'], string> = {
  pending: 'cb-proposal-status-pending',
  approved: 'cb-proposal-status-approved',
  rejected: 'cb-proposal-status-rejected',
};

export function ProposalBlock({ block }: { block: ProposalBlockData }) {
  return (
    <div className="cb-proposal-block">
      <div className="cb-proposal-header">
        <span className="cb-proposal-title">{block.title}</span>
        <span className={`cb-proposal-badge ${STATUS_CLASSES[block.status]}`}>
          {STATUS_LABELS[block.status]}
        </span>
      </div>
      {block.description && <p className="cb-proposal-description">{block.description}</p>}
      {block.status === 'pending' && (block.onApprove || block.onReject) && (
        <div className="cb-proposal-actions">
          {block.onApprove && (
            <button type="button" className="cb-proposal-approve-btn" onClick={block.onApprove}>
              Approve
            </button>
          )}
          {block.onReject && (
            <button type="button" className="cb-proposal-reject-btn" onClick={block.onReject}>
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}
