import { useState, useRef, type FormEvent } from 'react';
import { useUploadFile } from '../../hooks/useDatasets';

interface Props {
  datasetId: string;
  onDone: () => void;
}

export function DatasetUpload({ datasetId, onDone }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const upload = useUploadFile();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      await upload.mutateAsync({ datasetId, file });
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      onDone();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6">
      <p className="text-sm text-gray-600 mb-3">
        Upload a shapefile (.zip), GeoJSON, or GeoTIFF
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.json,.geojson,.tif,.tiff,.gpkg"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-3 text-sm"
      />
      <button
        type="submit"
        disabled={!file || upload.isPending}
        className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
      >
        {upload.isPending ? 'Uploading...' : 'Upload & Process'}
      </button>
      {upload.isError && (
        <p className="text-red-600 text-sm mt-2">Upload failed. Try again.</p>
      )}
      {upload.isSuccess && (
        <p className="text-green-600 text-sm mt-2">File processed successfully!</p>
      )}
    </form>
  );
}
