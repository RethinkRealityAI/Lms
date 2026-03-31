'use client';

interface ColorSwatchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorSwatch({ label, value, onChange }: ColorSwatchProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <label className="text-xs text-gray-600 flex-1">{label}</label>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-mono">{value}</span>
        <div className="relative">
          <div
            className="w-7 h-7 rounded-md border border-gray-200 cursor-pointer shadow-sm"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title={`Pick ${label}`}
          />
        </div>
      </div>
    </div>
  );
}
