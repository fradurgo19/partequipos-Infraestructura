import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../atoms/Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={`relative bg-white rounded-lg shadow-xl w-full ${sizeStyles[size]} max-h-[95vh] sm:max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
          <h2 className="text-lg sm:text-xl font-semibold text-[#50504f] pr-2">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
