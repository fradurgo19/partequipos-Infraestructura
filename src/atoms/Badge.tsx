import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'default';
  size?: 'sm' | 'md';
}

export const Badge = ({ children, variant = 'default', size = 'md' }: BadgeProps) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variantStyles = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    default: 'bg-gray-100 text-gray-800',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const icons = {
    pending: '🔴',
    in_progress: '🟠',
    completed: '🟢',
    cancelled: '⚫',
    default: '',
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {icons[variant] && <span className="mr-1">{icons[variant]}</span>}
      {children}
    </span>
  );
};
