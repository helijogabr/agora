import type { PostData } from "./Feed";
import PostBar from "./PostBar";
import { useState } from "react";

interface Props extends Omit<PostData, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

function formatAddress({
  zipCode,
  city,
  district,
  street,
  number,
}: Pick<Props, "zipCode" | "city" | "district" | "street" | "number">) {
  if (!zipCode && !city && !district && !street && !number) return null;

  const cityAndDistrict = [city, district].filter(Boolean).join(", ");
  const streetAndNumber = [street, number].filter(Boolean).join(" ");

  return [zipCode, cityAndDistrict, streetAndNumber]
    .filter(Boolean)
    .join(" - ");
}

function PostContent({
  category,
  title,
  author,
  createdAt,
  updatedAt,
  content,
  tags,
  zipCode,
  city,
  district,
  street,
  number,
}: Pick<
  Props,
  | "category"
  | "title"
  | "author"
  | "createdAt"
  | "updatedAt"
  | "content"
  | "tags"
  | "zipCode"
  | "city"
  | "district"
  | "street"
  | "number"
>) {
  const address = formatAddress({ zipCode, city, district, street, number });

  return (
    <>
      <span className="mb-2 inline-flex rounded-full border border-gray-400 px-2 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-500 dark:text-gray-200">
        {category}
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-gray-500">
        Por <strong>{author}</strong> em {createdAt}
        {updatedAt !== createdAt && ` (editado em ${updatedAt})`}
      </p>
      <p className="my-2">{content}</p>
      {address && <p className="text-sm text-gray-500">{address}</p>}
      {tags.length > 0 && (
        <p className="mb-1 text-sm text-gray-500">
          {tags.map((tag) => `#${tag}`).join(" ")}
        </p>
      )}
    </>
  );
}

type PostImage = Props["images"][number];

function PostImagesCarousel({ images }: { images: PostImage[] }) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(() => new Set());

  if (images.length === 0) return null;

  return (
    <div className="my-3">
      <ul
        className="flex snap-x gap-2 overflow-x-auto pb-2"
        aria-label="Imagens da publicação"
      >
        {images.map((image) => {
          const isLoaded = loadedImages.has(image.id);

          return (
            <li key={image.id} className="min-w-[14rem] max-w-[18rem]">
              <figure className="relative aspect-[4/3] snap-start overflow-hidden rounded border border-gray-400 bg-gray-200 dark:border-gray-600 dark:bg-gray-700">
                {!isLoaded && (
                  <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />
                )}
                <img
                  src={image.src}
                  alt={image.originalName}
                  loading="lazy"
                  className={`h-full w-full object-cover transition-opacity duration-200 ${
                    isLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => {
                    setLoadedImages((previous) => {
                      const next = new Set(previous);
                      next.add(image.id);
                      return next;
                    });
                  }}
                />
              </figure>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Post({
  ghost,
  likes,
  liked,
  author,
  id,
  category,
  tags,
  zipCode,
  city,
  district,
  street,
  number,
  createdAt,
  updatedAt,
  content,
  title,
  images,
}: Props) {
  return (
    <div
      className={`w-full max-w-2xl rounded bg-gray-300 p-4 dark:bg-gray-800 ${ghost ? "opacity-50" : ""}`}
    >
      <PostContent
        category={category}
        author={author}
        createdAt={createdAt}
        updatedAt={updatedAt}
        content={content}
        tags={tags}
        zipCode={zipCode}
        city={city}
        district={district}
        street={street}
        number={number}
        title={title}
      />
      <PostImagesCarousel images={images} />
      <PostBar likes={likes} liked={liked} author={author} id={id} />
    </div>
  );
}
