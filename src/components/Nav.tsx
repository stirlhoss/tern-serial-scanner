import { useMatch } from "@solidjs/router";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { useSession } from "~/lib/Context";

const MOBILE_MEDIA = "(max-width: 640px)";
const COLLAPSE_THRESHOLD = 24;

const handleLogout = () => {
  fetch("/api/logout", { method: "POST" }).finally(() => {
    window.location.href = "/login";
  });
};

export default function Nav() {
  const { signedIn } = useSession();
  const isHome = useMatch(() => "/");
  const isProfile = useMatch(() => "/profile");

  const [collapsed, setCollapsed] = createSignal(false);

  let mq: MediaQueryList | undefined;

  function toggleCollapsed(next: boolean) {
    if (document.startViewTransition) {
      document.startViewTransition(() => setCollapsed(next));
    } else {
      // No View Transitions API -> just snap (older browsers / Firefox flag off)
      setCollapsed(next);
    }
  }

  function handleScroll() {
    // Only collapse on mobile; desktop keeps the full-height nav.
    if (!mq?.matches) return;
    const shouldCollapse = window.scrollY > COLLAPSE_THRESHOLD;
    if (shouldCollapse !== collapsed()) {
      toggleCollapsed(shouldCollapse);
    }
  }

  function handleMediaChange() {
    // Switching back to desktop resets to the expanded nav.
    if (!mq?.matches) setCollapsed(false);
  }

  onMount(() => {
    mq = window.matchMedia(MOBILE_MEDIA);
    mq.addEventListener("change", handleMediaChange);
    window.addEventListener("scroll", handleScroll, { passive: true });
  });

  onCleanup(() => {
    mq?.removeEventListener("change", handleMediaChange);
    window.removeEventListener("scroll", handleScroll);
  });

  return (
    <nav class="nav-shell fixed top-0 left-0 w-full bg-gray-900 shadow-md z-50">
      <ul
        class={`container mx-auto flex items-center px-3 ${
          collapsed() ? "py-2" : "py-3"
        }`}
      >
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
          <h1
            class={`text-white uppercase tracking-wide ${
              collapsed() ? "text-base" : "text-2xl"
            }`}
          >
            Tern Service Tag Scanner
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
