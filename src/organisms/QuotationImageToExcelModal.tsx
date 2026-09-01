import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Image as ImageIcon, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Modal } from '../molecules/Modal';
import { FileUpload } from '../molecules/FileUpload';
import { Quotation } from '../types';
import { supabase } from '../lib/supabase';
import {
  createEmptyTable,
  extractTextFromImage,
  normalizeTableRows,
  parseOcrTextToTable,
} from '../utils/quotationOcr';
import { downloadTableAsExcel } from '../utils/quotationExcel';

interface QuotationImageToExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onSaved?: () => void;
}

interface EditableRow {
  id: string;
  cells: string[];
}

let fallbackRowCounter = 0;

const createRowId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackRowCounter += 1;
  return `row-${fallbackRowCounter}`;
};

const toPlainRows = (rows: EditableRow[]): string[][] => rows.map((row) => [...row.cells]);

const toEditableRows = (value: unknown): EditableRow[] => {
  if (!Array.isArray(value)) {
    return createEmptyTable().map((cells) => ({ id: createRowId(), cells }));
  }

  const normalized = normalizeTableRows(
    value.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : [String(row)]))
  );

  return normalized.map((cells) => ({ id: createRowId(), cells }));
};

const updateCell = (rows: EditableRow[], rowId: string, colIndex: number, value: string): EditableRow[] =>
  rows.map((row) =>
    row.id === rowId
      ? { ...row, cells: row.cells.map((cell, cellIndex) => (cellIndex === colIndex ? value : cell)) }
      : row
  );

export const QuotationImageToExcelModal: React.FC<QuotationImageToExcelModalProps> = ({
  isOpen,
  onClose,
  quotation,
  onSaved,
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [rows, setRows] = useState<EditableRow[]>(() =>
    createEmptyTable().map((cells) => ({ id: createRowId(), cells }))
  );
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setImageUrl(quotation?.ocr_image_url ?? '');
    setRows(toEditableRows(quotation?.ocr_table_data));
    setProcessing(false);
    setProgress(0);
    setError('');
    setSaving(false);
  }, [isOpen, quotation]);

  const handleImageSelected = async (file: File) => {
    setError('');
    setProcessing(true);
    setProgress(0);

    try {
      const text = await extractTextFromImage(file, setProgress);
      const parsedRows = parseOcrTextToTable(text);
      setRows(parsedRows.map((cells) => ({ id: createRowId(), cells })));
    } catch (ocrError) {
      console.error('OCR error:', ocrError);
      setError('No se pudo extraer el texto de la imagen. Intente con una foto más nítida.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddRow = () => {
    setRows((current) => [
      ...current,
      { id: createRowId(), cells: Array.from({ length: current[0]?.cells.length ?? 1 }, () => '') },
    ]);
  };

  const handleAddColumn = () => {
    setRows((current) => current.map((row) => ({ ...row, cells: [...row.cells, ''] })));
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== rowId)));
  };

  const handleSave = async () => {
    if (!quotation) {
      setError('Seleccione una cotización para guardar la tabla.');
      return;
    }

    setSaving(true);
    setError('');

    const { error: saveError } = await supabase
      .from('quotations')
      .update({
        ocr_image_url: imageUrl || null,
        ocr_table_data: toPlainRows(rows),
      })
      .eq('id', quotation.id);

    setSaving(false);

    if (saveError) {
      console.error('Error saving OCR table:', saveError);
      setError('No se pudo guardar la tabla. Verifique que ejecutó el script SQL de cotizaciones OCR.');
      return;
    }

    onSaved?.();
    onClose();
  };

  const handleDownload = () => {
    const baseName = quotation?.title?.trim() || 'cotizacion';
    downloadTableAsExcel(toPlainRows(rows), `${baseName.replaceAll(/\s+/g, '_')}_imagen_a_excel`);
  };

  const columnCount = rows[0]?.cells.length ?? 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Convertidor imagen a Excel"
      size="xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Suba la imagen de la cotización. El sistema extraerá el texto, lo mostrará en una tabla editable
          y podrá guardarla o descargarla en Excel.
        </p>

        {quotation && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-[#50504f]">
            Cotización: <strong>{quotation.title}</strong>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#50504f] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#cf1b22]" aria-hidden />
              Imagen de cotización
            </h3>
            <FileUpload
              bucket="documents"
              folder="quotations/ocr"
              accept="image/*"
              multiple={false}
              compressImages
              onUploadComplete={(urls) => setImageUrl(urls[0] ?? '')}
              existingFiles={imageUrl ? [imageUrl] : []}
              onRemove={() => setImageUrl('')}
              onFileSelected={handleImageSelected}
            />
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#cf1b22] hover:underline"
              >
                Ver imagen original
              </a>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#50504f] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#cf1b22]" aria-hidden />
              Vista previa
            </h3>
            {processing ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#cf1b22] mx-auto mb-2" aria-hidden />
                <p className="text-sm text-gray-600">Extrayendo texto de la imagen… {progress}%</p>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Revise y corrija las celdas antes de guardar o descargar el Excel.
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleAddRow}>
            <Plus className="w-4 h-4 mr-1" />
            Fila
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddColumn}>
            <Plus className="w-4 h-4 mr-1" />
            Columna
          </Button>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-b-0">
                  {Array.from({ length: columnCount }, (_, colIndex) => (
                    <td key={`${row.id}-col-${colIndex}`} className="p-1 min-w-[140px]">
                      <Input
                        value={row.cells[colIndex] ?? ''}
                        onChange={(e) =>
                          setRows((current) => updateCell(current, row.id, colIndex, e.target.value))
                        }
                        fullWidth
                        className="text-xs py-1.5"
                      />
                    </td>
                  ))}
                  <td className="p-1 w-10">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Eliminar fila"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cerrar
          </Button>
          <Button type="button" variant="secondary" fullWidth onClick={handleDownload} disabled={processing}>
            <Download className="w-4 h-4 mr-2" />
            Descargar Excel
          </Button>
          <Button
            type="button"
            fullWidth
            onClick={handleSave}
            disabled={processing || saving || !quotation}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando…' : 'Guardar tabla'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
