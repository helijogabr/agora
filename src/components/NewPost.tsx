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
      <div className="flex flex-col items-center justify-center h-20 w-60">
        <button className="
        h-9/12 w-9/12
        bg-cyan-100
        text-md text-blue-700
        transition-all duration-200
        hover:cursor-pointer hover:bg-cyan-200 hover:border-cyan-400 hover:h-11/12 hover:w-11/12 hover:text-xl
        active:cursor-pointer border:h-10/12 active:w-10/12 active:text-lg
        border-2 border-cyan-300 rounded-2xl 
        "
        type="submit" disabled={isPending}>
          Create Post
        </button>
      </div>
    </form>
  );
}
