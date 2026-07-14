import { actions } from "astro:actions";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/queryClient";

export function usePostLocations() {
  const { data } = useQuery(
    {
      queryKey: ["postLocations"],
      queryFn: () => actions.getPostLocations.orThrow(),
      staleTime: 1000 * 60,
    },
    queryClient,
  );

  return data?.locations ?? [];
}
