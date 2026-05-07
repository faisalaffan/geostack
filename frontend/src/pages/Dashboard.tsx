import { useState } from 'react';
import { DatasetList } from '../components/datasets/DatasetList';
import { useCreateDataset } from '../hooks/useDatasets';

export function Dashboard() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('point');
  const createDataset = useCreateDataset();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDataset.mutateAsync({ name, type });
      setName('');
      setShowCreate(false);
    } catch (err) {
      console.error('Create failed:', err);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {showCreate && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Create New Dataset</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Cell Towers Q1 2025"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="point">Point</option>
                <option value="line">Line</option>
                <option value="polygon">Polygon</option>
                <option value="raster">Raster</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createDataset.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="bg-gray-200 px-4 py-2 rounded text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <DatasetList onCreateNew={() => setShowCreate(true)} />
    </div>
  );
}
