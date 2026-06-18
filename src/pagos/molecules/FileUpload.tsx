import React, { useRef, useState } from 'react';
import { Upload, X, File, ExternalLink } from 'lucide-react';
import { Button } from '../../atoms/Button';

export interface ExistingUploadedFile {
  name: string;
  url: string;
}

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSize?: number;
  onFileSelect: (file: File | null) => void;
  onExistingFileRemove?: () => void;
  error?: string;
  currentFile?: File | null;
  existingFile?: ExistingUploadedFile | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label = 'Cargar Documento',
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 10 * 1024 * 1024,
  onFileSelect,
  onExistingFileRemove,
  error,
  currentFile,
  existingFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File) => {
    setLocalError('');

    if (file.size > maxSize) {
      setLocalError(`El tamaño del archivo debe ser menor a ${maxSize / (1024 * 1024)}MB`);
      return false;
    }

    return true;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setLocalError('');

    if (!file) {
      onFileSelect(null);
      return;
    }

    if (validateFile(file)) {
      onFileSelect(file);
    } else {
      onFileSelect(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];

    if (!file) {
      setLocalError('No se pudo obtener el archivo');
      return;
    }

    if (validateFile(file)) {
      onFileSelect(file);
    } else {
      onFileSelect(null);
    }
  };

  const handleRemoveCurrent = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveExisting = () => {
    onExistingFileRemove?.();
  };

  const displayError = error || localError;
  const showNewFile = Boolean(currentFile);
  const showExistingFile = !showNewFile && Boolean(existingFile?.url);

  let dropZoneClassName = 'border-gray-300 hover:border-[#cf1b22] hover:bg-[#f8dfe1]';
  if (displayError) {
    dropZoneClassName = 'border-red-300 bg-red-50';
  } else if (isDragging) {
    dropZoneClassName = 'border-[#cf1b22] bg-[#fdebec]';
  }

  const openFilePicker = () => fileInputRef.current?.click();

  const handleDropZoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFilePicker();
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {showNewFile && currentFile ? (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3 min-w-0">
            <File className="w-5 h-5 text-[#cf1b22] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{currentFile.name}</p>
              <p className="text-xs text-gray-500">
                {(currentFile.size / 1024).toFixed(2)} KB · Nuevo archivo
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveCurrent}
            aria-label="Eliminar archivo nuevo"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : showExistingFile && existingFile ? (
        <div className="flex items-center justify-between p-4 bg-[#fdebec] rounded-lg border border-[#cf1b22]/20">
          <div className="flex items-center space-x-3 min-w-0">
            <File className="w-5 h-5 text-[#cf1b22] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {existingFile.name || 'Documento adjunto'}
              </p>
              <p className="text-xs text-gray-500">Documento cargado previamente</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            <a
              href={existingFile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-[#cf1b22] hover:bg-white rounded-lg transition-colors"
              title="Ver documento"
              aria-label="Ver documento"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openFilePicker}
              aria-label="Reemplazar documento"
            >
              <Upload className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveExisting}
              aria-label="Eliminar documento"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={openFilePicker}
          onKeyDown={handleDropZoneKeyDown}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dropZoneClassName}`}
        >
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            Haz clic para cargar o arrastra y suelta
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, JPG, PNG hasta {maxSize / (1024 * 1024)}MB
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-label="Entrada de archivo"
      />

      {displayError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
};
