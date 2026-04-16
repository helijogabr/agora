import { actions } from "astro:actions";
import { type InfiniteData, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient } from "@/queryClient";
import { getUser } from "@/userStore";
import type { PostData } from "./Feed";

export default function NewPost() {
  const user = getUser();

  const { mutate, isPending } = useMutation(
    {
      mutationFn: actions.createPost.orThrow,
      onMutate: async (newPost) => {
        await queryClient.cancelQueries({ queryKey: ["posts"] });

        const previousPosts = queryClient.getQueryData(["posts"]);
        const now = new Date();

        const post: PostData = {
          author: user?.name || "Unknown",
          content: newPost.content,
          id: now.getTime(),
          likes: 0,
          liked: false,
          title: newPost.title,
          createdAt: now,
          updatedAt: now,
          ghost: true,
        };

        // optimistically add the post to the first page
        queryClient.setQueryData(
          ["posts"],
          (
            old: InfiniteData<{ posts: PostData[]; nextCursor?: Date | null }>,
          ) => {
            if (!old) {
              return {
                pages: [{ posts: [post], nextCursor: null }],
                pageParams: [null],
              };
            }

            const updatedFirstPagePosts = [
              post,
              ...(old.pages[0]?.posts ?? []),
            ];

            return {
              ...old,
              pages: [
                {
                  ...(old.pages[0] ?? { nextCursor: null }),
                  posts: updatedFirstPagePosts,
                },
                ...(old?.pages?.slice(1) ?? []),
              ],
              pageParams: old.pageParams ?? [null],
            };
          },
        );

        return { previousPosts, newPost: post };
      },
      onSuccess: () => {
        setTitle("");
        setContent("");
      },
      onError: (_, _1, onMutateResult) => {
        if (onMutateResult?.previousPosts) {
          queryClient.setQueryData(
            ["posts"],
            () => onMutateResult?.previousPosts,
          );
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      },
    },
    queryClient,
  );

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  return (
    <form
      className={`flex flex-col items-center gap-2 ${isPending ? "opacity-50" : ""}`}
      aria-disabled={isPending}
      onSubmit={(e) => {
        e.preventDefault();

        if (isPending || !title.trim() || !content.trim()) return;
        mutate({ title: title.trim(), content: content.trim() });
      }}
    >
      <input
        type="text"
        name="title"
        placeholder="Título"
        autoComplete="off"
        disabled={isPending}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        name="content"
        placeholder="Conteúdo"
        autoComplete="off"
        disabled={isPending}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button
        type="submit"
        disabled={isPending || !title.trim() || !content.trim()}
        className={`w-fit cursor-pointer rounded bg-gray-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700`}
      >
        Criar Postagem
      </button>
    </form>
  );
}
