import { useState, useRef, useId } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '../atoms/Button';
import { uploadFiles } from '../services/supabaseStorage';
import { isImageFile } from '../services/imageCompression';

interface FileUploadProps {
  bucket?: string;
  folder?: string;
  multiple?: boolean;
  accept?: string;
  /** Solo aplica si compressImages es false */
  maxSize?: number;
  compressImages?: boolean;
  onUploadComplete?: (urls: string[]) => void;
  existingFiles?: string[];
  onRemove?: (url: string) => void;
  uploadLabel?: string;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.readAsDataURL(file);
  });

const buildImagePreviews = (files: File[]): Promise<string[]> => {
  const imageFiles = files.filter((file) => isImageFile(file) || file.type.startsWith('image/'));
  return Promise.all(imageFiles.map(readFileAsDataUrl));
};

const getButtonText = (uploading: boolean, uploadLabel: string | undefined, multiple: boolean): string => {
  if (uploading) return 'Subiendo...';
  if (uploadLabel) return uploadLabel;
  return multiple ? 'Seleccionar archivos' : 'Subir archivo';
};

const getHintText = (compressImages: boolean, maxSize: number, multiple: boolean): string => {
  if (compressImages) {
    return 'Puedes seleccionar varias fotos; se optimizan automáticamente antes de subir.';
  }
  const multiHint = multiple ? ' · Varios archivos permitidos' : '';
  return `Tamaño máximo: ${maxSize} MB${multiHint}`;
};

const isImageUrl = (url: string): boolean => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

export const FileUpload = ({
  bucket = 'general',
  folder = 'uploads',
  multiple = false,
  accept = '*/*',
  maxSize = 10,
  compressImages = false,
  onUploadComplete,
  existingFiles = [],
  onRemove,
  uploadLabel,
}: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!compressImages) {
      const oversizedFiles = files.filter((file) => file.size > maxSize * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        alert(`Algunos archivos superan el tamaño máximo de ${maxSize} MB`);
        return;
      }
    }

    const imagePreviews = await buildImagePreviews(files);
    setPreviews(imagePreviews);

    setUploading(true);
    try {
      const urls = await uploadFiles(bucket, files, folder, { compressImages });
      if (urls.length === 0) {
        alert('No se pudieron subir los archivos. Inténtalo de nuevo.');
        return;
      }
      if (urls.length < files.length) {
        alert(`Se subieron ${urls.length} de ${files.length} archivos.`);
      }
      onUploadComplete?.(urls);
      setPreviews([]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error al subir archivos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePreview = (previewUrl: string) => {
    setPreviews((prev) => prev.filter((p) => p !== previewUrl));
  };

  const handleRemove = (url: string) => {
    onRemove?.(url);
  };

  const buttonText = getButtonText(uploading, uploadLabel, multiple);
  const hintText = getHintText(compressImages, maxSize, multiple);

  return (
    <div className="space-y-4">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          id={inputId}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          className="cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
        <p className="text-xs text-gray-500 mt-1">{hintText}</p>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {previews.map((preview) => (
            <div key={preview} className="relative group">
              <img
                src={preview}
                alt=""
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => handleRemovePreview(preview)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Archivos subidos:</p>
          <div className="grid grid-cols-4 gap-4">
            {existingFiles.map((url) => (
              <div key={url} className="relative group">
                {isImageUrl(url) ? (
                  <img
                    src={url}
                    alt=""
                    className="w-full h-32 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemove(url)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
