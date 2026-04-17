import { useState } from "react";
import NewPost from "./NewPost";

export default function LateralMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="w-full rounded bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        onClick={() => setIsOpen(true)}
      >
        Criar Post
      </button>

      <button
        type="button"
        aria-label="Fechar menu lateral"
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? "pointer-events-auto bg-black/35 opacity-100" : "pointer-events-none bg-black/0 opacity-0"}`}
        onMouseDown={() => setIsOpen(false)}
      />

      <aside
        className={`fixed top-0 right-0 z-50 flex h-screen w-full max-w-xl flex-col border-l border-gray-300 bg-white p-4 shadow-2xl transition-transform duration-300 ease-out dark:border-gray-700 dark:bg-gray-900 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center gap-2 border-b border-gray-300 pb-3 dark:border-gray-700">
          <button
            type="button"
            aria-label="Fechar menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded text-gray-700 transition hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-800"
            onClick={() => setIsOpen(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <title>Fechar menu</title>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Criar Post
          </h2>
        </header>

        <div className="h-full overflow-y-auto px-2 pr-1">
          <NewPost onPostCreated={() => setIsOpen(false)} />
        </div>
      </aside>
    </>
  );
}
