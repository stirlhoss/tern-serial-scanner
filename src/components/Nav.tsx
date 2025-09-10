import { useMatch, useNavigate } from "@solidjs/router";
import { Show } from "solid-js";
import { useSession } from "~/lib/Context";

export default function Nav() {
  const { signedIn } = useSession();
  const isHome = useMatch(() => "/");
  const navigate = useNavigate();

  const handleLogout = () => {
    // Use a standard link instead of action to avoid redirect loops
    fetch("/api/logout", { method: "POST" }).finally(() => {
      // Force a full page reload to clear client state
      window.location.href = "/login";
    });
  };

  return (
    <nav class="fixed top-0 left-0 w-full bg-sky-800 shadow-md z-50">
      <ul class="container mx-auto flex items-center p-3">
        <li
          class={`mx-2 sm:mx-6 border-b-2 text-white ${
            isHome()
              ? "border-sky-400"
              : "border-transparent hover:border-sky-500"
          }`}
        >
          <a href="/">Home</a>
        </li>
        <li class="ml-auto px-2 sm:px-6 text-white">
          <Show when={signedIn()} fallback={<a href="/login">Login</a>}>
            <button
              onclick={handleLogout}
              class="cursor-pointer hover:underline"
            >
              Logout
            </button>
          </Show>
        </li>
      </ul>
    </nav>
  );
}
