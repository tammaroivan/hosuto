import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";

type Action = "start" | "stop" | "restart";

const ACTION_LABELS: Record<Action, string> = {
  start: "Starting",
  stop: "Stopping",
  restart: "Restarting",
};

export const useContainerAction = () => {
  return useMutation({
    mutationFn: async ({ id, name, action }: { id: string; name: string; action: Action }) => {
      const res = await api.containers[":id"][action].$post({
        param: { id },
      });

      return { name, action, data: await res.json() };
    },
    onSuccess: ({ name, action }) => {
      toast.success(`${ACTION_LABELS[action]} ${name}`);
    },
    onError: (_error, { name, action }) => {
      toast.error(`Failed to ${action} ${name}`);
    },
  });
};
