import React, { useState } from "react";
import { RotateCw } from "lucide-react";

export default function RefreshButton({ onRefresh, disabled }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClick = async () => {
    if (disabled || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isRefreshing}
      title="Refresh appointments"
      className="btn btn-small flex items-center gap-2"
    >
      <RotateCw
        className={`w-4 h-4 transition-transform duration-500 ${isRefreshing ? "animate-spin" : ""}`}
      />
    </button>
  );
}