interface Layer {
  id: string;
  label: string;
  visible: boolean;
}

interface Props {
  layers: Layer[];
  onToggle: (id: string) => void;
}

export function LayerControl({ layers, onToggle }: Props) {
  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-3 z-10 min-w-[180px]">
      <h3 className="text-sm font-semibold mb-2">Layers</h3>
      {layers.map((layer) => (
        <label key={layer.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
          <input
            type="checkbox"
            checked={layer.visible}
            onChange={() => onToggle(layer.id)}
            className="rounded"
          />
          {layer.label}
        </label>
      ))}
    </div>
  );
}
