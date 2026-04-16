import { actions } from "astro:actions";
import { type InfiniteData, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient } from "@/queryClient";
import { getUser } from "@/userStore";
import type { PostData } from "./Feed";

type Props = {
  id: PostData["id"];
  author: PostData["author"];
  liked: boolean;
  likes: number;
};

export default function PostBar({
  id,
  liked,
  likes,
  author,
}: Pick<Props, "id" | "liked" | "likes" | "author">) {
  const user = getUser();

  const deletePost = useMutation(
    {
      mutationFn: actions.deletePost.orThrow,
      onMutate: async ({ postId }) => {
        await queryClient.cancelQueries({ queryKey: ["posts"] });
        const previousPosts = queryClient.getQueryData(["posts"]);

        queryClient.setQueryData(
          ["posts"],
          (
            old: InfiniteData<{ posts: PostData[]; nextCursor?: Date | null }>,
          ) => {
            if (!old) return old;

            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                posts: page.posts.filter((post) => post.id !== postId),
              })),
            };
          },
        );

        return { previousPosts };
      },
      onError: (_, _1, onMutateResult) => {
        queryClient.setQueryData(
          ["posts"],
          () => onMutateResult?.previousPosts,
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      },
    },
    queryClient,
  );

  const likePost = useMutation(
    {
      mutationFn: actions.likePost.orThrow,
      onMutate: async ({ postId, liked }) => {
        await queryClient.cancelQueries({ queryKey: ["posts"] });

        setIsLiked(liked);
        setLikeCount((count) => count + (liked ? 1 : -1));

        const previousPosts = queryClient.getQueryData(["posts"]);

        return { previousPosts, postId, liked };
      },
      onSuccess: (data) => {
        setIsLiked(data.isLiked);
        setLikeCount(data.likes);
      },
      onError: (_, _1, onMutateResult) => {
        setIsLiked(liked);
        setLikeCount(likes);
        queryClient.setQueryData(
          ["posts"],
          () => onMutateResult?.previousPosts,
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      },
    },
    queryClient,
  );

  const [isLiked, setIsLiked] = useState(liked);
  const [likeCount, setLikeCount] = useState(likes);

  return (
    <div className="flex items-center justify-between">
      <div>
        <button
          type="button"
          disabled={likePost.isPending}
          className="cursor-pointer rounded bg-gray-200 p-0.5 px-1 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
          onClick={() => likePost.mutate({ postId: id, liked: !isLiked })}
        >
          {isLiked ? <span>Descurtir</span> : <strong>Curtir</strong>}
        </button>
        <span className="ml-2 text-sm text-gray-500">
          {likeCount} {likeCount === 1 ? "like" : "likes"}
        </span>
      </div>

      {(user?.name === author || user?.role === "admin") && (
        <button
          type="button"
          disabled={deletePost.isPending}
          className="cursor-pointer rounded bg-gray-200 p-0.5 px-1 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
          onClick={() => deletePost.mutate({ postId: id })}
        >
          Delete
        </button>
      )}
    </div>
  );
}
