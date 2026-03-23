import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

type StackAction = "up" | "down" | "restart" | "pull";

export const useStackAction = () => {
  return useMutation({
    mutationFn: async ({ name, action }: { name: string; action: StackAction }) => {
      const res = await api.stacks[":name"][action].$post({
        param: { name },
      });

      return res.json();
    },
  });
};
