import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, fullWidth = false, className = '', ...props }, ref) => {
    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <div className={widthStyle}>
        {label && (
          <label className="block text-sm font-medium text-[#50504f] mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cf1b22] focus:border-transparent transition-all ${widthStyle} ${error ? 'border-red-500' : ''} ${className}`}
          rows={4}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
