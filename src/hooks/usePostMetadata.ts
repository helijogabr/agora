import { actions } from "astro:actions";
import { useQueries } from "@tanstack/react-query";
import { queryClient } from "@/queryClient";

export function usePostMetadata() {
  const [typesQuery, tagsQuery] = useQueries(
    {
      queries: [
        {
          queryKey: ["postTypes"],
          queryFn: () => actions.getPostTypes.orThrow(),
          staleTime: 1000 * 60 * 10,
        },
        {
          queryKey: ["tags"],
          queryFn: () => actions.getTags.orThrow(),
          staleTime: 1000 * 60 * 10,
        },
      ],
    },
    queryClient,
  );

  return {
    postTypes: typesQuery.data?.postTypes ?? [],
    tags: tagsQuery.data?.tags ?? [],
    isLoading: typesQuery.isLoading || tagsQuery.isLoading,
    isError: typesQuery.isError || tagsQuery.isError,
  };
}
