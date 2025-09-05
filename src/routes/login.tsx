import useOAuthLogin from "../oauth/client";

export default function Login() {
  return (
    <main class="flex items-center justify-center min-h-screen bg-gray-50 text-gray-700 p-4">
      <div class="w-full max-w-md space-y-8 text-center">
        <h1 class="text-6xl text-sky-700 font-thin uppercase">Sign in</h1>
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
          class="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-colors duration-200"
        >
          NetSuite
        </a>
      </div>
    </div>
  );
}
