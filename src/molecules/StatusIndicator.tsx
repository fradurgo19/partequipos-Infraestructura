import { TaskStatus } from '../types';

interface StatusIndicatorProps {
  status: TaskStatus;
  showLabel?: boolean;
}

export const StatusIndicator = ({ status, showLabel = true }: StatusIndicatorProps) => {
  const statusConfig = {
    pending: { icon: '🔴', label: 'Pending', color: 'text-yellow-600' },
    in_progress: { icon: '🟠', label: 'In Progress', color: 'text-blue-600' },
    completed: { icon: '🟢', label: 'Completed', color: 'text-green-600' },
    cancelled: { icon: '⚫', label: 'Cancelled', color: 'text-gray-600' },
  };

  const config = statusConfig[status];

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-lg">{config.icon}</span>
      {showLabel && (
        <span className={`font-medium ${config.color}`}>{config.label}</span>
      )}
    </div>
  );
};
