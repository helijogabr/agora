import { useState } from "react";

const themes = ["light", "dark"] as const;

function systemTheme() {
  if (import.meta.env.SSR) {
    return "light";
  }

  return (localStorage.getItem("theme") ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light")) === "dark"
    ? "dark"
    : "light";
}

export default function ThemeToggle({
  defaultTheme,
}: {
  defaultTheme?: "light" | "dark" | undefined;
}) {
  const [theme, setTheme] = useState<(typeof themes)[number]>(
    defaultTheme || systemTheme(),
  );

  const toggleTheme = () => {
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex] || systemTheme();

    const root = document.documentElement;
    root.dataset.theme = nextTheme;

    localStorage.setItem("theme", nextTheme === "dark" ? "dark" : "light");
    cookieStore.set({
      name: "theme",
      value: nextTheme === "dark" ? "dark" : "light",
      sameSite: "lax",
      path: "/",
    });

    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className="cursor-pointer rounded bg-gray-400 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800"
      onClick={toggleTheme}
      id="theme-toggle"
    >
      {theme === "light" ? "Claro" : "Escuro"}
    </button>
  );
}
