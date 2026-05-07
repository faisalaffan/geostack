interface Props {
  feature: any;
  onClose: () => void;
}

export function PopupCard({ feature, onClose }: Props) {
  const props = feature?.properties || {};

  return (
    <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 z-10 max-w-sm">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-sm">{props.name || 'Feature Detail'}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
      </div>
      <dl className="text-xs space-y-1">
        {Object.entries(props).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-4">
            <dt className="text-gray-500">{key}</dt>
            <dd className="font-mono">{String(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
