import { useMatch } from "@solidjs/router";
import { Show } from "solid-js";
import { useSession } from "~/lib/Context";

const handleLogout = () => {
  fetch("/api/logout", { method: "POST" }).finally(() => {
    window.location.href = "/login";
  });
};

export default function Nav() {
  const { signedIn } = useSession();
  const isHome = useMatch(() => "/");
  const isProfile = useMatch(() => "/profile");

  return (
    <nav class="fixed top-0 left-0 w-full bg-gray-900 shadow-md z-50">
      <ul class="container mx-auto flex items-center p-3">
        <div class="flex items-center flex-1">
          <li
            class={`mx-2 sm:mx-6 border-b-2 text-white ${
              isHome()
                ? "border-gray-300"
                : "border-transparent hover:border-gray-400"
            }`}
          >
            <a href="/">Home</a>
          </li>
          <Show when={signedIn()}>
            <li
              class={`mx-2 sm:mx-6 border-b-2 text-white ${
                isProfile()
                  ? "border-gray-300"
                  : "border-transparent hover:border-gray-400"
              }`}
            >
              <a href="/profile">Profile</a>
            </li>
          </Show>
        </div>

        <div class="flex-1 flex justify-center">
          <h1 class="text-white text-2xl uppercase tracking-wide">
            Tern Serial Scanner
          </h1>
        </div>

        <div class="flex-1 flex justify-end px-2 sm:px-6 text-white">
          <Show when={signedIn()} fallback={<a href="/login">Login</a>}>
            <button
              onclick={handleLogout}
              class="cursor-pointer hover:underline"
            >
              Logout
            </button>
          </Show>
        </div>
      </ul>
    </nav>
  );
}
