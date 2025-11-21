interface CapacityIndicatorProps {
  current: number;
  max: number;
  label?: string;
}

export function CapacityIndicator({ current, max, label }: CapacityIndicatorProps) {
  const safeMax = max > 0 ? max : 1;
  const percentage = Math.round((current / safeMax) * 100);

  const getColor = () => {
    if (percentage < 70) return "bg-green-500";
    if (percentage < 90) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTextColor = () => {
    if (percentage < 70) return "text-green-700";
    if (percentage < 90) return "text-yellow-700";
    return "text-red-700";
  };

  return (
    <div>
      {label && (
        <div className="text-sm text-dark-600 mb-2 flex justify-between">
          <span>{label}</span>
          <span className={`font-semibold ${getTextColor()}`}>
            {current}/{max} ({percentage}%)
          </span>
        </div>
      )}

      <div className="w-full h-3 bg-dark-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
