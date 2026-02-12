import { useEffect, useRef } from 'react';

/**
 * Custom hook for auto-refreshing data when tab is visible
 * @param {Function} callback - Function to call on refresh
 * @param {number} intervalMs - Refresh interval in milliseconds (default: 30000 = 30 seconds)
 * @param {boolean} enabled - Whether auto-refresh is enabled (default: true)
 */
const useAutoRefresh = (callback, intervalMs = 30000, enabled = true) => {
  const callbackRef = useRef(callback);
  const intervalRef = useRef(null);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Function to run the callback
    const runCallback = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
      }
    };

    // Set up interval
    intervalRef.current = setInterval(runCallback, intervalMs);

    // Also refresh when tab becomes visible after being hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, enabled]);
};

export default useAutoRefresh;
