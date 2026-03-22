import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useStacks() {
  return useQuery({
    queryKey: ["stacks"],
    queryFn: async () => {
      const res = await api.stacks.$get();
      return res.json();
    },
  });
}
