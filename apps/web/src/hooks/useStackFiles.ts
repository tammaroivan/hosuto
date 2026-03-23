import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { api } from "../lib/api";

type FileTreeSuccess = InferResponseType<(typeof api.files)[":stackName"]["$get"], 200>;
type HistorySuccess = InferResponseType<
  (typeof api.files)[":stackName"]["history"][":path{.+}"]["$get"],
  200
>;

export const useStackFileTree = (stackName: string) => {
  return useQuery({
    queryKey: ["stack-files", stackName],
    queryFn: async () => {
      const res = await api.files[":stackName"].$get({
        param: { stackName },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch files: ${res.status}`);
      }

      return (await res.json()) as FileTreeSuccess;
    },
    staleTime: 30000,
  });
};

export const useFileHistory = (stackName: string, relativePath: string | null) => {
  return useQuery({
    queryKey: ["file-history", stackName, relativePath],
    queryFn: async () => {
      const res = await api.files[":stackName"]["history"][":path{.+}"].$get({
        param: { stackName, path: relativePath! },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch history");
      }

      return (await res.json()) as HistorySuccess;
    },
    enabled: !!relativePath,
  });
};
