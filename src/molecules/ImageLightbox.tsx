import { Modal } from './Modal';

interface ImageLightboxProps {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export const ImageLightbox = ({
  imageUrl,
  title = 'Vista ampliada',
  onClose,
}: ImageLightboxProps) => (
  <Modal isOpen={Boolean(imageUrl)} onClose={onClose} title={title} size="xl">
    {imageUrl && (
      <div className="flex flex-col items-center gap-4">
        <img
          src={imageUrl}
          alt=""
          className="max-h-[75vh] w-full object-contain rounded-lg bg-gray-50"
        />
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#cf1b22] hover:underline"
        >
          Abrir en nueva pestaña
        </a>
      </div>
    )}
  </Modal>
);
