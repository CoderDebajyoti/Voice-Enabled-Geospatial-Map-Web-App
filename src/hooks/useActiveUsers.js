import { useState, useEffect } from 'react';

/**
 * Hook to manage live active user count.
 * Provides realistic demo fluctuations and is structured for direct WebSocket integration.
 */
export const useActiveUsers = (initialCount = 28) => {
  const [activeUsers, setActiveUsers] = useState(initialCount);

  useEffect(() => {
    // WebSocket / Backend integration point:
    // const socket = new WebSocket(import.meta.env.VITE_WS_URL || 'wss://api.geovoice.app/users');
    // socket.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   if (data.activeUsers) setActiveUsers(data.activeUsers);
    // };

    // Realistic demo fluctuation interval (every 8-15 seconds)
    const interval = setInterval(() => {
      setActiveUsers((prev) => {
        // Subtle drift between 18 and 42 users
        const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        const next = prev + delta;
        if (next < 18) return 19;
        if (next > 45) return 43;
        return next;
      });
    }, 10000);

    return () => {
      clearInterval(interval);
      // socket.close();
    };
  }, []);

  return activeUsers;
};
