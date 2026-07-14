import { useEffect, useState } from "react";
import type { PostLocation } from "./Feed";

type PostsMapViewComponent = typeof import("./PostsMapView").default;

function MapPlaceholder() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-white/40 p-4 text-center dark:bg-black/20">
      <span className="font-bold text-[#1e4937] dark:text-[#50be91]">
        Carregando mapa...
      </span>
    </div>
  );
}

export default function PostsMap({
  posts,
  userLocation,
  onSelectPost,
}: {
  posts: PostLocation[];
  userLocation: [number, number] | null;
  onSelectPost?: (postId: number) => void;
}) {
  const [PostsMapView, setPostsMapView] = useState<PostsMapViewComponent | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    import("./PostsMapView").then((mod) => {
      if (!cancelled) setPostsMapView(() => mod.default);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-56 w-full overflow-hidden rounded-xl border-2 border-[#50be91] md:h-[36rem]">
      {PostsMapView ? (
        <PostsMapView
          posts={posts}
          userLocation={userLocation}
          onSelectPost={onSelectPost}
        />
      ) : (
        <MapPlaceholder />
      )}
    </div>
  );
}
