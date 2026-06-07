import { normalizePriority, PRIORITY_LABELS, PRIORITY_STYLES } from '../constants/taskPriority';

interface PriorityBadgeProps {
  priority?: string | null;
  size?: 'sm' | 'md';
}

export const PriorityBadge = ({ priority, size = 'md' }: PriorityBadgeProps) => {
  const normalized = normalizePriority(priority);
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${PRIORITY_STYLES[normalized]} ${sizeClass}`}
    >
      {PRIORITY_LABELS[normalized]}
    </span>
  );
};
