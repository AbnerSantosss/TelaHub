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
      className={`py-16 px-6 text-center border border-dashed border-borda-2 bg-papel rounded-2xl ${className || ''}`}
    >
      <Icon size={44} className="mx-auto mb-4 text-tinta-3" aria-hidden="true" />
      <p className="mb-6 text-base text-tinta-2">{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="brand">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
