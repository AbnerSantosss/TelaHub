import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, message, actionLabel, onAction, className }) => {
  return (
    <div
      className={`py-16 text-center border border-dashed rounded-2xl ${className || ''}`}
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <Icon size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
      <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="brand">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
