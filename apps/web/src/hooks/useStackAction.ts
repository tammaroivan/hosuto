import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";

type StackAction = "up" | "down" | "restart" | "pull" | "build" | "build-up" | "update";

const ACTION_LABELS: Record<StackAction, string> = {
  up: "Starting",
  down: "Stopping",
  restart: "Restarting",
  pull: "Pulling",
  build: "Building",
  "build-up": "Building & starting",
  update: "Updating",
};

export const useStackAction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, action }: { name: string; action: StackAction }) => {
      const res = await api.stacks[":name"][action].$post({
        param: { name },
      });

      return { name, action, data: await res.json() };
    },
    onSuccess: ({ name, action }) => {
      toast.success(`${ACTION_LABELS[action]} ${name}...`);
      queryClient.invalidateQueries({ queryKey: ["stacks"] });
    },
    onError: (_error, { name, action }) => {
      toast.error(`Failed to ${action} ${name}`);
    },
  });
};
