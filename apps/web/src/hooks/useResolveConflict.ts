import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";

/**
 * Removes the container(s) whose fixed name blocked a deploy, then retries the action that
 * failed. The retried action streams progress over the same WS channel as the original.
 */
export const useResolveConflict = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      containers,
      action,
      services,
    }: {
      name: string;
      containers: string[];
      action: string;
      services?: string[];
    }) => {
      const res = await api.stacks[":name"]["resolve-conflict"].$post({
        param: { name },
        json: { containers, action, services: services ?? [] },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error("error" in data ? data.error : "Failed to resolve conflict");
      }

      return { name };
    },
    onSuccess: ({ name }) => {
      toast.success(`Removing conflict and retrying ${name}...`);
      queryClient.invalidateQueries({ queryKey: ["stacks"] });
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : "Failed to resolve conflict");
    },
  });
};
