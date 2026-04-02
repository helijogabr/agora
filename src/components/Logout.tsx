import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";

export default function Logout() {
  async function logout() {
    const { error } = await actions.logout();

    if (!error) {
      navigate("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="cursor-pointer rounded border border-gray-300 px-2 py-1 text-sm font-medium text-gray-7000"
    >
      Logout
    </button>
  )
}

