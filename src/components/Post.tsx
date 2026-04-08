import { actions } from "astro:actions";
import { useMutation } from "@tanstack/react-query";
import { memo, useState } from "react";
import { queryClient } from "@/query_client";
import type { PostData } from "./Feed";

interface Props extends Omit<PostData, "createdAt" | "updatedAt"> {
  createdAt: string | Date;
  updatedAt: string | Date;
}

function Post({
  id,
  title,
  content,
  author,
  liked,
  likes,
  createdAt,
  updatedAt,
}: Props) {
  const [isLiked, setIsLiked] = useState(liked);
  const [likeCount, setLikeCount] = useState(likes);

  const [prevLiked, setPrevLiked] = useState(isLiked);
  const [prevLikes, setPrevLikes] = useState(likeCount);

  if (prevLiked !== liked) {
    setPrevLiked(liked);
    setIsLiked(liked);
    setLikeCount(likes);
  }

  if (prevLikes !== likes) {
    setPrevLikes(likes);
    setLikeCount(likes);
  }

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
        queryClient.setQueryData(["posts"], onMutateResult?.previousPosts);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      },
    },
    queryClient,
  );

  return (
    <div className="rounded border p-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-gray-500">
        By {author} on {new Date(createdAt).toLocaleString()}
        {updatedAt !== createdAt &&
          ` (edited on ${new Date(updatedAt).toLocaleString()})`}
      </p>
      <p className="mt-2">{content}</p>
      <button
        type="button"
        onClick={() => likePost.mutate({ postId: id, liked: !isLiked })}
        className={`${likePost.isPending && "cursor-not-allowed opacity-50"}`}
      >
        {isLiked ? "Unlike" : "Like"} ({likeCount})
      </button>
    </div>
  );
}

export default memo(Post);
