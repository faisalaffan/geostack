import { useParams, useNavigate } from 'react-router-dom';
import { useDataset, useDeleteDataset } from '../hooks/useDatasets';
import { StatusBadge } from '../components/shared/StatusBadge';
import { DatasetUpload } from '../components/datasets/DatasetUpload';
import { DatasetTable } from '../components/datasets/DatasetTable';

export function DatasetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dataset, isLoading } = useDataset(id!);
  const deleteDataset = useDeleteDataset();

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (!dataset) return <p className="text-red-600">Dataset not found.</p>;

  const handleDelete = async () => {
    if (!confirm('Delete this dataset and all its data?')) return;
    await deleteDataset.mutateAsync(id!);
    navigate('/');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/')} className="text-sm text-blue-600 hover:underline mb-1">
            &larr; Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold">{dataset.name}</h1>
          <p className="text-sm text-gray-500">
            Type: {dataset.type} &middot; Features: {dataset.feature_count}
          </p>
          <StatusBadge status={dataset.status} />
        </div>
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
        >
          Delete Dataset
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Upload Data</h2>
        <DatasetUpload datasetId={id!} onDone={() => {}} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Features</h2>
        <button
          onClick={() => navigate(`/map?dataset=${id}`)}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 mb-4"
        >
          View on Map
        </button>
        <DatasetTable datasetId={id!} />
      </div>
    </div>
  );
}
