import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { asList, endpoints, http } from '@/src/api/client';
import type { BackendNotification, TenderMarket } from '@/src/types/api';

export function useUnreadNotifications() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const data = (await http.get('/notifications/unread/')).data;
      const rows = asList<BackendNotification>(data);
      return typeof data?.count === 'number' ? data.count : rows.filter((n) => !n.is_read && !n.read_at).length;
    },
    refetchInterval: 60_000,
  });
}

export type MarketFilters = { search?: string; categorie?: string; ordering?: string };

/** Paginated /marches/ (DRF PageNumberPagination, 20 per page). */
export function useMarkets(filters: MarketFilters) {
  return useInfiniteQuery({
    queryKey: ['markets', filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string | number> = { page: pageParam };
      if (filters.search) params.search = filters.search;
      if (filters.categorie) params.categorie = filters.categorie;
      if (filters.ordering) params.ordering = filters.ordering;
      const data = (await http.get(endpoints.markets, { params })).data;
      return { rows: asList<TenderMarket>(data), next: data?.next ? pageParam + 1 : undefined, count: typeof data?.count === 'number' ? data.count : undefined };
    },
    getNextPageParam: (last) => last.next,
  });
}

export function useFavorites() {
  return useQuery({ queryKey: ['favorites'], queryFn: async () => asList<any>((await http.get(endpoints.features.favorites)).data) });
}

export const favoriteMarketId = (f: any) => String(f?.marche?.id ?? f?.marche ?? f?.market ?? f?.marche_id ?? '');
