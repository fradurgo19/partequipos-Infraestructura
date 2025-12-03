import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = false, className = '', ...props }, ref) => {
    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <div className={widthStyle}>
        {label && (
          <label className="block text-sm font-medium text-[#50504f] mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cf1b22] focus:border-transparent transition-all ${widthStyle} ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
