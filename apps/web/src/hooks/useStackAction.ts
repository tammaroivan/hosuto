import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

type StackAction = "up" | "down" | "restart" | "pull" | "build" | "build-up";

export const useStackAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, action }: { name: string; action: StackAction }) => {
      const res = await api.stacks[":name"][action].$post({
        param: { name },
      });

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stacks"] });
    },
  });
};
