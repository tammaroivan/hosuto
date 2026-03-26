import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { api } from "../lib/api";

type SettingsSuccess = InferResponseType<(typeof api.settings)["$get"], 200>;

export const useSettings = () => {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.settings.$get();

      if (!res.ok) {
        throw new Error("Failed to fetch settings");
      }

      return (await res.json()) as SettingsSuccess;
    },
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: { updateCheckInterval?: number }) => {
      const res = await api.settings.$put({
        json: settings,
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error((body as { error: string }).error);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
};
