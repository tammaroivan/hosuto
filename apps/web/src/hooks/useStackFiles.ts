import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { api } from "../lib/api";

type FileTreeSuccess = InferResponseType<(typeof api.files)[":stackName"]["$get"], 200>;

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
