import type { PostData } from "./Feed";
import PostBar from "./PostBar";

interface Props extends Omit<PostData, "createdAt" | "updatedAt" | "author"> {
  createdAt: string;
  updatedAt: string;
  author: string;
}

function PostContent({
  title,
  author,
  createdAt,
  updatedAt,
  content,
}: Pick<Props, "title" | "author" | "createdAt" | "updatedAt" | "content">) {
  return (
    <>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-gray-500">
        Por <strong>{author}</strong> em {createdAt}
        {updatedAt !== createdAt && ` (editado em ${updatedAt})`}
      </p>
      <p className="my-2">{content}</p>
    </>
  );
}

export default function Post({
  ghost,
  likesCount,
  liked,
  author,
  id,
  createdAt,
  updatedAt,
  content,
  title,
}: Props) {
  return (
    <div
      className={`rounded bg-gray-300 p-4 dark:bg-gray-800 ${ghost ? "opacity-50" : ""}`}
    >
      <PostContent
        author={author}
        createdAt={createdAt}
        updatedAt={updatedAt}
        content={content}
        title={title}
      />
      <PostBar likesCount={likesCount} liked={liked} author={author} id={id} />
    </div>
  );
}
