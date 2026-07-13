import { actions } from "astro:actions";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { usePostMetadata } from "@/hooks/usePostMetadata";
import { queryClient } from "@/queryClient";
import { getUser } from "@/userStore";
import FeedFilters from "./FeedFilters";
import Post from "./Post";

export type PostData = Awaited<
  ReturnType<typeof actions.getPosts.orThrow>
>["posts"][number] & { ghost?: boolean };

type FeedFilterPayload = {
  city: string;
  postTypeIds: number[];
  tagIds: number[];
  startDate: string;
  endDate: string;
};

export default function Feed({
  posts,
  nextCursor,
}: {
  posts: PostData[];
  nextCursor: Date | undefined;
}) {
  const { postTypes, tags } = usePostMetadata();

  const [filters, setFilters] = useState<FeedFilterPayload>({
    city: "",
    postTypeIds: [],
    tagIds: [],
    startDate: "",
    endDate: "",
  });

  const hasFilters =
    filters.city ||
    filters.postTypeIds.length ||
    filters.tagIds.length ||
    filters.startDate ||
    filters.endDate;

  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isLoading,
  } = useInfiniteQuery(
    hasFilters
      ? {
          queryKey: [
            "posts",
            filters.city,
            filters.postTypeIds.join(","),
            filters.tagIds.join(","),
            filters.startDate,
            filters.endDate,
          ],
          queryFn: ({ pageParam: cursor }) =>
            actions.getPosts.orThrow({
              cursor,
              limit: 2,
              ...filters,
            }),
          initialPageParam: null as Date | null,
          staleTime: 1000 * 60,
          getNextPageParam: (lastPage, _) => lastPage.nextCursor,
        }
      : {
          queryKey: [
            "posts",
            filters.city,
            filters.postTypeIds.join(","),
            filters.tagIds.join(","),
            filters.startDate,
            filters.endDate,
          ],
          queryFn: ({ pageParam: cursor }) =>
            actions.getPosts.orThrow({
              cursor,
              limit: 2,
              ...filters,
            }),
          initialPageParam: null as Date | null,
          initialData: {
            pages: [{ posts, nextCursor }],
            pageParams: [null as Date | null],
          },
          staleTime: 1000 * 60,
          getNextPageParam: (lastPage, _) => lastPage.nextCursor,
        },
    queryClient,
  );
  const [animate] = useAutoAnimate();

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-2xl flex-col gap-2">
        <FeedFilters
          postTypes={postTypes}
          tags={tags}
          onApply={setFilters}
        />
        <ul ref={animate} className="flex flex-col gap-2">
          {data?.pages
            .flatMap((page) => page.posts)
            .map((post) => {
              const locale = getUser()?.locale;
              return (
                <li key={post.id}>
                  <Post
                    {...post}
                    createdAt={new Date(post.createdAt).toLocaleString(locale)}
                    updatedAt={new Date(post.updatedAt).toLocaleString(locale)}
                    liked={!!post.liked}
                  />
                </li>
              );
            })}
        </ul>
      </div>

      <button
        type="button"
        className="cursor-pointer rounded bg-gray-400 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800"
        disabled={!hasNextPage || isLoading || isFetching}
        onClick={() => hasNextPage && fetchNextPage()}
      >
        {isLoading || isFetching
          ? "Carregando..."
          : hasNextPage
            ? "Carregar mais posts"
            : "Não tem mais posts para carregar"}
      </button>
    </div>
  );
}
