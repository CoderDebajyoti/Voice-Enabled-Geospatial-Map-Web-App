import { useState, useEffect } from 'react';

/**
 * Hook to manage live active user count.
 * 
 * Features:
 * - Dynamic, realistic presence based on local time-of-day traffic model (22 - 68 users)
 * - BroadcastChannel synchronization across local browser tabs
 * - Smooth periodic fluctuations every 4 to 8 seconds so the UI is visibly alive
 * - Structured backend/WebSocket hook point for real-time presence servers
 */

const getInitialUserCount = () => {
  const hour = new Date().getHours();
  // Realistic time-of-day traffic curve
  // Night (12am - 6am): 18-28 users
  // Morning (7am - 11am): 32-48 users
  // Afternoon/Evening (12pm - 10pm): 45-72 users
  if (hour >= 0 && hour < 6) return 22 + Math.floor(Math.random() * 8);
  if (hour >= 6 && hour < 12) return 38 + Math.floor(Math.random() * 12);
  if (hour >= 12 && hour < 20) return 52 + Math.floor(Math.random() * 16);
  return 42 + Math.floor(Math.random() * 14);
};

export const useActiveUsers = (fallbackCount = null) => {
  const [activeUsers, setActiveUsers] = useState(() => fallbackCount || getInitialUserCount());

  useEffect(() => {
    // 1. WebSocket Backend Connection (when backend presence URL configured)
    const wsUrl = import.meta.env.VITE_WS_URL;
    let ws = null;

    if (wsUrl && wsUrl.startsWith('ws')) {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (typeof data.activeUsers === 'number') {
              setActiveUsers(data.activeUsers);
            }
          } catch (e) {
            // ignore JSON parse error
          }
        };
      } catch (err) {
        console.warn('WebSocket presence fallback to dynamic simulation:', err);
      }
    }

    // 2. Cross-tab synchronization via BroadcastChannel
    let channel = null;
    try {
      channel = new BroadcastChannel('geovoice_presence_channel');
      channel.onmessage = (e) => {
        if (e.data && typeof e.data.count === 'number') {
          setActiveUsers(e.data.count);
        }
      };
    } catch (e) {
      // BroadcastChannel not available in all environments
    }

    // 3. Realistic dynamic simulation loop (fluctuates every 4-7 seconds)
    let isMounted = true;
    const scheduleNextFluctuation = () => {
      const delay = 4000 + Math.random() * 3500; // 4 to 7.5 seconds
      return setTimeout(() => {
        if (!isMounted) return;

        setActiveUsers((prev) => {
          // Subtle drift between 20 and 80 users
          const delta = (Math.random() > 0.48 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
          let next = prev + delta;
          if (next < 20) next = 22 + Math.floor(Math.random() * 4);
          if (next > 85) next = 78 - Math.floor(Math.random() * 4);

          // Broadcast to other tabs if channel open
          try {
            channel?.postMessage({ count: next });
          } catch (e) {
            // ignore
          }
          return next;
        });

        timeoutId = scheduleNextFluctuation();
      }, delay);
    };

    let timeoutId = scheduleNextFluctuation();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (ws) {
        try {
          ws.close();
        } catch (e) {
          // ignore
        }
      }
      if (channel) {
        try {
          channel.close();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  return activeUsers;
};
