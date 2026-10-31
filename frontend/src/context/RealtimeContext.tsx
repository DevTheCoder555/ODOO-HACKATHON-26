import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';

export interface RealtimeEvent {
  type: string;
  timestamp: string;
  payload: any;
}

interface RealtimeContextType {
  isConnected: boolean;
  isOnline: boolean;
  isUsingCachedData: boolean;
  events: RealtimeEvent[];
  currency: string;
  setCurrency: (currency: string) => void;
  rates: Record<string, number>;
  symbols: Record<string, string>;
  ratesSource: string;
  lastUpdated: string;
  formatCurrency: (amountUsd: number | string | undefined | null) => string;
  triggerBankSimulation: () => Promise<any>;
  activeNotification: RealtimeEvent | null;
  dismissNotification: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isUsingCachedData, setIsUsingCachedData] = useState<boolean>(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [activeNotification, setActiveNotification] = useState<RealtimeEvent | null>(null);
  
  // Dynamic currency states
  const [currency, setCurrencyState] = useState<string>('USD');
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1.0 });
  const [symbols, setSymbols] = useState<Record<string, string>>({
    USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', INR: '₹', JPY: '¥', CHF: 'CHF'
  });
  const [ratesSource, setRatesSource] = useState<string>('Live Rates API');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);

  // Load saved currency preference
  useEffect(() => {
    const saved = localStorage.getItem('brightloop_currency');
    if (saved) setCurrencyState(saved);
  }, []);

  const setCurrency = (c: string) => {
    setCurrencyState(c);
    localStorage.setItem('brightloop_currency', c);
  };

  // Fetch dynamic forex rates on mount
  useEffect(() => {
    api.getLiveForexRates()
      .then((data) => {
        if (data.rates) setRates(data.rates);
        if (data.symbols) setSymbols(data.symbols);
        if (data.source) setRatesSource(data.source);
        if (data.last_updated) setLastUpdated(data.last_updated);
      })
      .catch((err) => {
        console.warn('Using baseline fallback exchange rates:', err);
      });
  }, []);

  // Format currency dynamically based on live rate
  const formatCurrency = useCallback((amountUsd: number | string | undefined | null): string => {
    if (amountUsd === undefined || amountUsd === null) return `${symbols[currency] || '$'}0.00`;
    const num = typeof amountUsd === 'string' ? parseFloat(amountUsd) : amountUsd;
    if (isNaN(num)) return `${symbols[currency] || '$'}0.00`;

    const rate = rates[currency] || 1.0;
    const converted = num * rate;
    const symbol = symbols[currency] || currency;

    return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currency, rates, symbols]);

  // Connect to backend WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    // Support custom WS URL via env, local dev port 8000, and standard proxy/SPA host
    let wsUrl: string;
    if (import.meta.env.VITE_WS_URL) {
      wsUrl = import.meta.env.VITE_WS_URL;
    } else {
      const isLocalVite = window.location.port === '3000';
      const wsHost = isLocalVite ? 'localhost:8000' : window.location.host;
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${wsProtocol}//${wsHost}/ws/events`;
    }

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        // Start ping heartbeat
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const parsed: RealtimeEvent = JSON.parse(event.data);
          if (parsed.type !== 'CONNECTION_ESTABLISHED') {
            setEvents((prev) => [parsed, ...prev.slice(0, 49)]);
            setActiveNotification(parsed);

            // Auto-dismiss notification toast after 6s
            setTimeout(() => {
              setActiveNotification((curr) => (curr === parsed ? null : curr));
            }, 6000);

            // Broadcast window custom event for reactive tab updates
            window.dispatchEvent(new CustomEvent('brightloop_realtime_event', { detail: parsed }));
          }
        } catch (e) {
          // Non-JSON message
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Attempt reconnect in 3 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch (e) {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    }
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [connectWebSocket]);

  const triggerBankSimulation = async () => {
    return api.simulateBankDeposit();
  };

  const dismissNotification = () => {
    setActiveNotification(null);
  };

  // Online / Offline network listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsUsingCachedData(false);
      connectWebSocket();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsConnected(false);
    };

    const handleOfflineEvent = () => {
      setIsUsingCachedData(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('brightloop_offline_event', handleOfflineEvent);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('brightloop_offline_event', handleOfflineEvent);
    };
  }, []);

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        isOnline,
        isUsingCachedData,
        events,
        currency,
        setCurrency,
        rates,
        symbols,
        ratesSource,
        lastUpdated,
        formatCurrency,
        triggerBankSimulation,
        activeNotification,
        dismissNotification,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
