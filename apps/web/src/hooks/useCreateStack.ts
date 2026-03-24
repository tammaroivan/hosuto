import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "../lib/api";

export const useCreateStack = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.stacks.$post({
        json: { name },
      });

      if (!res.ok) {
        const body = (await res.json()) as { error: string };
        throw new Error(body.error);
      }

      return res.json();
    },
    onSuccess: (_data, name) => {
      queryClient.invalidateQueries({ queryKey: ["stacks"] });
      navigate({ to: "/stacks/$stackName/edit", params: { stackName: name } });
    },
  });
};
