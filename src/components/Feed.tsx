import { actions } from "astro:actions";
import { useInfiniteQuery } from "@tanstack/react-query";
import { queryClient } from "@/query_client";
import Post from "./Post";

export type PostData = Awaited<
  ReturnType<typeof actions.getPosts.orThrow>
>["posts"][number];

export default function Feed({
  posts,
  nextCursor,
}: {
  posts: PostData[];
  nextCursor: Date | undefined;
}) {
  const { data, hasNextPage, fetchNextPage } = useInfiniteQuery(
    {
      queryKey: ["posts"],
      queryFn: ({ pageParam: cursor }) =>
        actions.getPosts.orThrow({
          cursor,
          limit: 2,
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

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          queryClient.invalidateQueries({ queryKey: ["posts"] });
        }}
      >
        Refresh
      </button>
      <div className="flex flex-col gap-4">
        {data?.pages.map((page, i) => (
          <ul
            key={data.pageParams[i]?.toString() ?? i}
            className="m-0 flex flex-col gap-2"
          >
            {page.posts.map((post) => (
              <Post
                key={`${post.id}-${post.liked}-${post.likes}`}
                {...post}
                createdAt={post.createdAt.toISOString()}
                updatedAt={post.updatedAt.toISOString()}
                liked={!!post.liked}
              />
            ))}
          </ul>
        ))}
      </div>

      <button type="button" onClick={() => hasNextPage && fetchNextPage()}>
        Load More
      </button>
    </div>
  );
}
