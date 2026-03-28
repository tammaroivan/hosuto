import { useQuery } from "@tanstack/react-query";
import type { AggregatedStats } from "@hosuto/shared";
import { api } from "../lib/api";

export const useContainerStats = () => {
  const { data } = useQuery({
    queryKey: ["container-stats"],
    queryFn: async () => {
      const res = await api.containers.stats.$get();
      if (!res.ok) {
        return null;
      }

      return res.json() as Promise<AggregatedStats>;
    },
    refetchInterval: 30000,
    retry: 1,
  });

  return data ?? null;
};
