import { Show } from "solid-js";
import Form from "~/components/Form";
import { useSession } from "~/lib/Context";

export default function Home() {
  const { session, signedIn } = useSession();

  return (
    <main class="flex items-center justify-center min-h-screen bg-gray-100 text-gray-900 p-4 pt-20">
      <div class="w-full max-w-4xl text-center space-y-8">
        <Show when={signedIn()}>
          <div class="bg-white rounded-lg shadow-2xl border-2 border-gray-900 p-4 mb-6 inline-block">
            <div class="flex items-center justify-center space-x-4">
              <div class="text-left">
                <p class="text-sm text-gray-700">Welcome back,</p>
                <p class="font-semibold text-gray-900">
                  {session()?.name || session()?.email?.split("@")[0]}
                </p>
                <Show when={session()?.location}>
                  <p class="text-xs text-gray-700">
                    {session()?.location === 15
                      ? "2 - Olney"
                      : session()?.location === 16
                        ? "1 - West"
                        : `Location ${session()?.location}`}
                  </p>
                </Show>
              </div>
              <a
                href="/profile"
                class="px-3 py-1 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Edit Profile
              </a>
            </div>
          </div>
        </Show>
        <Form />
      </div>
    </main>
  );
}
