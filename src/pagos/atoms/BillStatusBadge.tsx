import { BillStatus } from '../types';

interface BillStatusBadgeProps {
  status: BillStatus;
  className?: string;
}

const statusStyles: Record<BillStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  paid: 'bg-blue-100 text-blue-800',
};

const statusLabels: Record<BillStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Aprobado',
  overdue: 'Vencido',
  paid: 'Pagada',
};

export const BillStatusBadge = ({ status, className = '' }: BillStatusBadgeProps) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]} ${className}`}
  >
    {statusLabels[status]}
  </span>
);
