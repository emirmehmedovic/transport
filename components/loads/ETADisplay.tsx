"use client";

import { useEffect, useState } from "react";
import { Clock, TrendingUp, MapPin, AlertCircle } from "lucide-react";

interface ETAData {
  pickup?: {
    distanceKm: number;
    estimatedSpeed: number;
    etaMinutes: number;
    etaDate: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  delivery?: {
    distanceKm: number;
    estimatedSpeed: number;
    etaMinutes: number;
    etaDate: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  currentPhase: 'TO_PICKUP' | 'TO_DELIVERY' | 'DELIVERED';
}

interface ETADisplayProps {
  loadId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export default function ETADisplay({
  loadId,
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute
}: ETADisplayProps) {
  const [eta, setEta] = useState<ETAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchETA = async () => {
    try {
      const response = await fetch(`/api/loads/${loadId}/eta`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch ETA');
      }
      const data = await response.json();
      setEta(data.eta);
      setError("");
    } catch (err: any) {
      console.error('Error fetching ETA:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchETA();

    if (autoRefresh) {
      const interval = setInterval(fetchETA, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [loadId, autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-dark-200">
        <p className="text-dark-400 text-sm">Učitavanje ETA...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
        <div className="flex items-center gap-2 text-yellow-700">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!eta) {
    return null;
  }

  if (eta.currentPhase === 'DELIVERED') {
    return (
      <div className="bg-green-50 rounded-xl p-4 border border-green-200">
        <p className="text-green-700 font-semibold">✓ Load dostavljen</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}min`;
  };

  const getConfidenceBadge = (confidence: 'HIGH' | 'MEDIUM' | 'LOW') => {
    const colors = {
      HIGH: 'bg-green-100 text-green-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      LOW: 'bg-red-100 text-red-700',
    };
    const labels = {
      HIGH: 'Visoka preciznost',
      MEDIUM: 'Srednja preciznost',
      LOW: 'Niska preciznost',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[confidence]}`}>
        {labels[confidence]}
      </span>
    );
  };

  const activeData = eta.currentPhase === 'TO_PICKUP' ? eta.pickup : eta.delivery;

  if (!activeData) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-dark-200 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {eta.currentPhase === 'TO_PICKUP' ? '📍 ETA do Pickupa' : '🚚 ETA do Deliverya'}
        </h3>
        {getConfidenceBadge(activeData.confidence)}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* ETA Time */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-dark-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>Očekivano vrijeme</span>
          </div>
          <p className="text-2xl font-bold text-primary-600">
            {formatDate(activeData.etaDate)}
          </p>
          <p className="text-sm text-dark-400">
            (za {formatDuration(activeData.etaMinutes)})
          </p>
        </div>

        {/* Distance */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-dark-400 text-sm">
            <MapPin className="w-4 h-4" />
            <span>Preostala distanca</span>
          </div>
          <p className="text-2xl font-bold">
            {activeData.distanceKm} km
          </p>
        </div>

        {/* Estimated Speed */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-dark-400 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Prosječna brzina</span>
          </div>
          <p className="text-xl font-semibold">
            {activeData.estimatedSpeed} km/h
          </p>
          <p className="text-xs text-dark-400">
            Bazirana na historijskim podacima
          </p>
        </div>

        {/* Confidence Info */}
        <div className="space-y-1">
          <p className="text-dark-400 text-sm">Preciznost</p>
          <p className="text-sm">
            {activeData.confidence === 'HIGH' &&
              'Zasnovano na nedavnim i historijskim podacima'}
            {activeData.confidence === 'MEDIUM' &&
              'Zasnovano uglavnom na historijskim podacima'}
            {activeData.confidence === 'LOW' &&
              'Samo historijski podaci, bez nedavnih'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="pt-4 border-t border-dark-100">
        <div className="flex justify-between text-xs text-dark-400 mb-2">
          <span>Trenutna lokacija</span>
          <span>{eta.currentPhase === 'TO_PICKUP' ? 'Pickup' : 'Delivery'}</span>
        </div>
        <div className="h-2 bg-dark-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
            style={{ width: '40%' }} // This could be calculated based on distance covered
          />
        </div>
      </div>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <p className="text-xs text-dark-400 text-center pt-2">
          ⟳ Automatsko osvježavanje svakih {refreshInterval / 1000}s
        </p>
      )}
    </div>
  );
}
