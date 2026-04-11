import { actions } from "astro:actions";
import { type InfiniteData, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient } from "@/query_client";
import type { PostData } from "./Feed";

export default function NewPost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { mutate, isPending } = useMutation(
    {
      mutationFn: actions.createPost.orThrow,
      onMutate: async (newPost, context) => {
        await context.client.cancelQueries({ queryKey: ["posts"] });

        const previousPosts = context.client.getQueryData(["posts"]);

        console.log(previousPosts);

        const post: PostData = {
          author: "You",
          content: newPost.content,
          id: Date.now(),
          likes: 0,
          liked: false,
          title: newPost.title,
          createdAt: new Date(),
          updatedAt: new Date(),
          ghost: true,
        };

        // optimistically add the post to the first page
        context.client.setQueryData(
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
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      },
    },
    queryClient,
  );

  return (
    <form
      className={`flex flex-col items-center gap-2 ${isPending && "opacity-50"}`}
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
        placeholder="Title"
        autoComplete="off"
        value={title}
        disabled={isPending}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        name="content"
        placeholder="Content"
        autoComplete="off"
        value={content}
        disabled={isPending}
        onChange={(e) => setContent(e.target.value)}
      />
      <button
        type="submit"
        disabled={isPending || !title.trim() || !content.trim()}
        className={`w-fit cursor-pointer rounded bg-gray-300 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700`}
      >
        Create Post
      </button>
    </form>
  );
}
