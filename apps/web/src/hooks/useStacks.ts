import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export const useStacks = () => {
  return useQuery({
    queryKey: ["stacks"],
    queryFn: async () => {
      const res = await api.stacks.$get();

      if (!res.ok) {
        throw new Error(`Failed to fetch stacks: ${res.status}`);
      }

      return res.json();
    },
    retry: 2,
  });
};
