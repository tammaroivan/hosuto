import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await api.health.$get();
      return res.json();
    },
  });
}
