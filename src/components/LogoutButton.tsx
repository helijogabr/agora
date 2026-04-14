import { actions } from "astro:actions";

export default function LogoutButton() {
  const handleLogout = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = await actions.logout();

    if (result.data?.success) {
      window.location.href = "/login";
    }
  };

  return (
    <form onSubmit={handleLogout}>
      <button
        type="submit"
        className="rounded px-2 py-1 hover:bg-gray-300 dark:hover:bg-gray-700"
      >
        Sair
      </button>
    </form>
  );
}
