import { useNavigate } from 'react-router-dom';
import { useDatasets, type Dataset } from '../../hooks/useDatasets';
import { StatusBadge } from '../shared/StatusBadge';

interface Props {
  onCreateNew: () => void;
}

export function DatasetList({ onCreateNew }: Props) {
  const { data: datasets, isLoading } = useDatasets();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="text-gray-500">Loading datasets...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Datasets</h2>
        <button
          onClick={onCreateNew}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          + New Dataset
        </button>
      </div>

      {(!datasets || datasets.length === 0) ? (
        <p className="text-gray-500 text-sm">No datasets yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {datasets.map((ds: Dataset) => (
            <div
              key={ds.id}
              onClick={() => navigate(`/datasets/${ds.id}`)}
              className="bg-white border rounded-lg p-4 hover:border-blue-400 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{ds.name}</h3>
                  <p className="text-sm text-gray-500">
                    {ds.type} &middot; {ds.feature_count} features
                  </p>
                </div>
                <StatusBadge status={ds.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
