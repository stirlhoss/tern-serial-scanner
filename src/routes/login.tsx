import useOAuthLogin from "../oauth/client";

export default function Login() {
  return (
    <main class="flex items-center justify-center min-h-screen bg-gray-100 text-gray-900 p-4">
      <div class="w-full max-w-md space-y-8 text-center">
        <h1 class="text-6xl text-gray-900 uppercase">Sign in</h1>
        <OAuth />
      </div>
    </main>
  );
}

function OAuth() {
  const login = useOAuthLogin();

  return (
    <div class="space-y-2">
      <p class="text-lg font-medium">Sign in with:</p>
      <div class="flex justify-center gap-4">
        <a
          href={login("netsuite")}
          rel="external"
          class="px-4 py-2 border-2 border-gray-900 rounded text-gray-900 hover:bg-gray-900 hover:text-white transition-colors duration-200"
        >
          NetSuite
        </a>
      </div>
    </div>
  );
}
