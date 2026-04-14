import { actions } from "astro:actions";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { queryClient } from "@/queryClient";
import { getUser } from "@/userStore";
import Post from "./Post";

export type PostData = Awaited<
  ReturnType<typeof actions.getPosts.orThrow>
>["posts"][number] & { ghost?: boolean };

export default function Feed({
  posts,
  nextCursor,
}: {
  posts: PostData[];
  nextCursor: Date | undefined;
}) {
  const { data, hasNextPage, fetchNextPage, isFetching, isLoading } =
    useInfiniteQuery(
      {
        queryKey: ["posts"],
        queryFn: ({ pageParam: cursor }) =>
          actions.getPosts.orThrow({
            cursor,
            limit: 2,
          }),
        select: (data) => ({
          pages: data.pages.map((page) => ({
            posts: page.posts.map((post) => ({
              ...post,
              createdAt: new Date(post.createdAt).toLocaleString(
                getUser()?.locale,
              ),
              updatedAt: new Date(post.updatedAt).toLocaleString(
                getUser()?.locale,
              ),
            })),
            nextCursor: page.nextCursor,
          })),
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
      <div className="flex flex-col gap-2">
        <ul ref={animate} className="flex flex-col gap-2">
          {data?.pages
            .flatMap((page) => page.posts)
            .map((post) => (
              <li key={post.id}>
                <Post
                  {...post}
                  createdAt={post.createdAt}
                  updatedAt={post.updatedAt}
                  liked={!!post.liked}
                />
              </li>
            ))}
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
