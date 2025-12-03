import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '../atoms/Button';
import { uploadFiles } from '../services/supabaseStorage';

interface FileUploadProps {
  bucket?: string;
  folder?: string;
  multiple?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  onUploadComplete?: (urls: string[]) => void;
  existingFiles?: string[];
  onRemove?: (url: string) => void;
}

export const FileUpload = ({
  bucket = 'general',
  folder = 'uploads',
  multiple = false,
  accept = '*/*',
  maxSize = 10,
  onUploadComplete,
  existingFiles = [],
  onRemove,
}: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file size
    const oversizedFiles = files.filter((file) => file.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`Some files exceed the maximum size of ${maxSize}MB`);
      return;
    }

    // Create previews for images
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    const imagePreviews = await Promise.all(
      imageFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      })
    );
    setPreviews(imagePreviews);

    // Upload files
    setUploading(true);
    try {
      const urls = await uploadFiles(bucket, files, folder);
      if (onUploadComplete) {
        onUploadComplete(urls);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (url: string) => {
    if (onRemove) {
      onRemove(url);
    }
  };

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
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button
            type="button"
            variant="secondary"
            disabled={uploading}
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Max size: {maxSize}MB {multiple && '| Multiple files allowed'}
        </p>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => {
                  setPreviews(previews.filter((_, i) => i !== index));
                }}
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
          <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
          <div className="grid grid-cols-4 gap-4">
            {existingFiles.map((url, index) => (
              <div key={index} className="relative group">
                {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                {onRemove && (
                  <button
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

