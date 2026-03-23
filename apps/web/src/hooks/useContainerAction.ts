import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";

type Action = "start" | "stop" | "restart";

export const useContainerAction = () => {
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: Action }) => {
      const res = await api.containers[":id"][action].$post({
        param: { id },
      });

      return res.json();
    },
  });
};
