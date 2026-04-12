import { memo } from "react";
import type { PostData } from "./Feed";
import PostBar from "./PostBar";

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
  ghost,
}: Props) {
  return (
    <div
      className={`rounded bg-gray-300 p-4 dark:bg-gray-800 ${ghost ? "opacity-50" : ""}`}
    >
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-gray-500">
        Por <strong>{author}</strong> em {new Date(createdAt).toLocaleString()}
        {updatedAt !== createdAt &&
          ` (edited on ${new Date(updatedAt).toLocaleString()})`}
      </p>
      <p className="my-2">{content}</p>

      <PostBar
        key={`${id}-${likes}-${liked}`}
        id={id}
        liked={liked}
        likes={likes}
        author={author}
      />
    </div>
  );
}

export default memo(Post);
