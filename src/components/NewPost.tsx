import { actions } from "astro:actions";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { queryClient } from "@/query_client";

export default function NewPost() {
  const addPost = useMutation(
    {
      mutationFn: actions.createPost.orThrow,
      onSuccess: (_, _1, _2, context) => {
        context.client.invalidateQueries({ queryKey: ["posts"] });

        setTitle("");
        setContent("");
      },
    },
    queryClient,
  );

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const isPending = addPost.isPending;

  return (
    <form
      className={`flex flex-col gap-2 ${isPending && "opacity-50"}`}
      aria-disabled={isPending}
      onSubmit={(e) => {
        e.preventDefault();
        addPost.mutate({ title, content });
      }}
    >
      <input
        type="text"
        name="title"
        placeholder="Title"
        value={title}
        disabled={isPending}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        name="content"
        placeholder="Content"
        value={content}
        disabled={isPending}
        onChange={(e) => setContent(e.target.value)}
      />
      <button type="submit" disabled={isPending}>
        Create Post
      </button>
    </form>
  );
}
