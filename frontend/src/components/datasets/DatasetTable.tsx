import { useFeatures } from '../../hooks/useDatasets';

interface Props {
  datasetId: string;
}

export function DatasetTable({ datasetId }: Props) {
  const { data: features, isLoading } = useFeatures(datasetId);

  if (isLoading) return <p className="text-gray-500 text-sm">Loading features...</p>;
  if (!features || features.length === 0) return <p className="text-gray-500 text-sm">No features yet.</p>;

  const propertyKeys = Object.keys(features[0]?.properties || {});

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2">ID</th>
            {propertyKeys.map((key) => (
              <th key={key} className="text-left p-2">{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((f: any, i: number) => (
            <tr key={f.id || i} className="border-t hover:bg-gray-50">
              <td className="p-2 font-mono text-xs">{f.id?.slice(0, 8)}</td>
              {propertyKeys.map((key) => (
                <td key={key} className="p-2">{String(f.properties[key] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
