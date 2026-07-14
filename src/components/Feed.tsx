import { actions } from "astro:actions";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { haversineDistanceKm } from "@/geo";
import { usePostMetadata } from "@/hooks/usePostMetadata";
import { queryClient } from "@/queryClient";
import { getUser } from "@/userStore";
import FeedFilters from "./FeedFilters";
import Post from "./Post";

export type PostData = Awaited<
  ReturnType<typeof actions.getPosts.orThrow>
>["posts"][number] & { ghost?: boolean };

export type PostLocation = Awaited<
  ReturnType<typeof actions.getPostLocations.orThrow>
>["locations"][number];

type PostsPage = Awaited<ReturnType<typeof actions.getPosts.orThrow>>;

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
  userLocation,
  selectedPostId,
}: {
  posts: PostData[];
  nextCursor: Date | undefined;
  userLocation?: [number, number] | null;
  selectedPostId?: number | null;
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

  const queryKey = useMemo(
    () => [
      "posts",
      filters.city,
      filters.postTypeIds.join(","),
      filters.tagIds.join(","),
      filters.startDate,
      filters.endDate,
    ],
    [filters],
  );

  const {
    data,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isLoading,
  } = useInfiniteQuery(
    hasFilters
      ? {
          queryKey,
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
          queryKey,
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
  const itemRefs = useRef(new Map<number, HTMLLIElement>());

  const allPosts = useMemo(
    () => data?.pages.flatMap((page) => page.posts) ?? [],
    [data],
  );

  // The map can link to a post that hasn't been paginated into the feed yet —
  // fetch it on demand and splice it into the first page so it can be shown/highlighted.
  useEffect(() => {
    if (selectedPostId == null) return;
    if (allPosts.some((post) => post.id === selectedPostId)) return;

    let cancelled = false;

    actions.getPost
      .orThrow({ postId: selectedPostId })
      .then((result) => {
        if (cancelled) return;

        queryClient.setQueryData<InfiniteData<PostsPage, Date | null>>(queryKey, (old) => {
          const firstPage = old?.pages[0];
          if (!old || !firstPage) return old;
          if (firstPage.posts.some((post) => post.id === result.post.id)) {
            return old;
          }

          return {
            ...old,
            pages: [
              { ...firstPage, posts: [result.post, ...firstPage.posts] },
              ...old.pages.slice(1),
            ],
          };
        });
      })
      .catch(() => {
        // Post may have been deleted or is otherwise unavailable; ignore.
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPostId, allPosts, queryKey]);

  const sortedPosts = useMemo(() => {
    const byDistance = userLocation
      ? allPosts
          .map((post) => ({
            post,
            distance:
              typeof post.latitude === "number" &&
              typeof post.longitude === "number"
                ? haversineDistanceKm(userLocation, [
                    post.latitude,
                    post.longitude,
                  ])
                : Number.POSITIVE_INFINITY,
          }))
          .sort((a, b) => a.distance - b.distance)
          .map(({ post }) => post)
      : allPosts;

    if (selectedPostId == null) return byDistance;

    const selectedIndex = byDistance.findIndex(
      (post) => post.id === selectedPostId,
    );
    if (selectedIndex <= 0) return byDistance;

    const reordered = [...byDistance];
    const [selected] = reordered.splice(selectedIndex, 1);
    if (selected) reordered.unshift(selected);
    return reordered;
  }, [allPosts, userLocation, selectedPostId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: allPosts retriggers the scroll once a post fetched on demand actually renders.
  useEffect(() => {
    if (selectedPostId == null) return;
    itemRefs.current
      .get(selectedPostId)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedPostId, allPosts]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full flex-col gap-2">
        <FeedFilters
          postTypes={postTypes}
          tags={tags}
          onApply={setFilters}
        />
        <ul ref={animate} className="flex flex-col gap-2">
          {sortedPosts.map((post) => {
            const locale = getUser()?.locale;
            return (
              <li
                key={post.id}
                data-post-id={post.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(post.id, el);
                  else itemRefs.current.delete(post.id);
                }}
              >
                <Post
                  {...post}
                  createdAt={new Date(post.createdAt).toLocaleString(locale)}
                  updatedAt={new Date(post.updatedAt).toLocaleString(locale)}
                  liked={!!post.liked}
                  highlighted={post.id === selectedPostId}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        className="h-12 w-52 cursor-pointer rounded-4xl bg-[#50be91] font-bold text-[#1e4937] transition hover:bg-[#50be90d3] disabled:cursor-not-allowed disabled:opacity-50"
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
