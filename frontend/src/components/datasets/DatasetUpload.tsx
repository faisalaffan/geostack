import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useUploadFile } from '../../hooks/useDatasets';

interface EtlProgress {
  step: string;
  percent: number;
}

interface Props {
  datasetId: string;
  onDone: () => void;
}

export function DatasetUpload({ datasetId, onDone }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [wsProgress, setWsProgress] = useState<EtlProgress | null>(null);
  const upload = useUploadFile();
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const connectProgress = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const wsUrl = API_BASE.replace(/^https?/, protocol);
    const ws = new WebSocket(`${wsUrl}/api/v1/ws/etl/${datasetId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as EtlProgress;
      setWsProgress(data);
      if (data.percent >= 100) {
        ws.close();
        onDone();
      }
    };

    ws.onerror = () => {
      console.error('WebSocket connection failed');
    };

    wsRef.current = ws;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setWsProgress({ step: 'starting', percent: 0 });
      connectProgress();
      await upload.mutateAsync({ datasetId, file });
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      console.error('Upload failed:', err);
      setWsProgress(null);
    }
  };

  const stepLabels: Record<string, string> = {
    starting: 'Starting...',
    uploading: 'Uploading to storage...',
    validating: 'Validating spatial data...',
    transforming: 'Processing & loading to database...',
    finalizing: 'Finalizing...',
    done: 'Complete!',
    error: 'Processing failed',
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
        disabled={!!wsProgress}
      />
      <button
        type="submit"
        disabled={!file || upload.isPending || !!wsProgress}
        className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
      >
        {upload.isPending || wsProgress ? 'Processing...' : 'Upload & Process'}
      </button>

      {wsProgress && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">{stepLabels[wsProgress.step] || wsProgress.step}</span>
            <span className="font-mono text-gray-500">{wsProgress.percent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                wsProgress.step === 'error' ? 'bg-red-500' : 'bg-blue-600'
              }`}
              style={{ width: `${wsProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {upload.isError && (
        <p className="text-red-600 text-sm mt-2">Upload failed. Try again.</p>
      )}
    </form>
  );
}
