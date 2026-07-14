import { useState } from "react";
import { usePostLocations } from "@/hooks/usePostLocations";
import { useUserLocation } from "@/hooks/useUserLocation";
import type { PostData } from "./Feed";
import Feed from "./Feed";
import NewPost from "./NewPost";
import PostsMap from "./PostsMap";

function NewPostModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <button
        type="button"
        aria-label="Fechar modal"
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
      />

      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="pointer-events-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl bg-[#d3d3d3] p-6 shadow-2xl dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1e4937] dark:text-[#50be91]">
              Criar Postagem
            </h2>
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#1e4937] hover:bg-[#b3b3b362] dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <title>Fechar</title>
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          </div>

          <div className="flex justify-center">
            <NewPost onPostCreated={onClose} />
          </div>
        </div>
      </div>
    </>
  );
}

export default function HomeLayout({
  posts,
  nextCursor,
}: {
  posts: PostData[];
  nextCursor: Date | undefined;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const userLocation = useUserLocation();
  const postLocations = usePostLocations();

  return (
    <div className="flex w-full flex-col gap-6 md:grid md:grid-cols-[minmax(320px,1fr)_minmax(0,1.7fr)] md:items-start md:gap-16">
      <aside className="flex w-full flex-col gap-4 md:sticky md:top-6">
        <PostsMap
          posts={postLocations}
          userLocation={userLocation}
          onSelectPost={setSelectedPostId}
        />
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-12 w-full cursor-pointer rounded-4xl bg-[#50be91] font-bold text-[#1e4937] transition hover:bg-[#50be90d3]"
        >
          Criar Postagem
        </button>
      </aside>

      <div className="w-full min-w-0 rounded-3xl bg-[#d3d3d3] p-4 shadow-2xl md:p-6 dark:bg-gray-900">
        <Feed
          posts={posts}
          nextCursor={nextCursor}
          userLocation={userLocation}
          selectedPostId={selectedPostId}
        />
      </div>

      {isModalOpen && (
        <NewPostModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
