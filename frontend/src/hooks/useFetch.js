import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';

/**
 * Minimal data hook. Returns { data, loading, error, refetch, setData }.
 * `select` lets a caller pluck a nested field from the response.
 */
export function useFetch(url, { params, select, skip } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const paramsKey = JSON.stringify(params || {});
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    if (skip) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url, { params });
      const payload = select ? select(res.data) : res.data;
      if (mounted.current) setData(payload);
    } catch (e) {
      if (mounted.current) setError(e);
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, paramsKey, skip]);

  useEffect(() => {
    mounted.current = true;
    refetch();
    return () => {
      mounted.current = false;
    };
  }, [refetch]);

  return { data, loading, error, refetch, setData };
}
