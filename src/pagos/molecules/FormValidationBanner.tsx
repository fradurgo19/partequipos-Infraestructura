import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormValidationBannerProps {
  title: string;
  messages: string[];
  className?: string;
}

export const FormValidationBanner: React.FC<FormValidationBannerProps> = ({
  title,
  messages,
  className = '',
}) => {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 shadow-sm ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-700">{title}</p>
          <p className="mt-1 text-sm text-red-600">
            Revise los campos marcados en rojo o corrija lo siguiente:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
