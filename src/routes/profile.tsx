import { createSignal, Show, createEffect } from "solid-js";
import { useSession } from "~/lib/Context";

export default function Profile() {
  const { session, signedIn } = useSession();
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const [message, setMessage] = createSignal<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [formData, setFormData] = createSignal({
    name: "",
    location: "",
  });

  // Initialize form with session data when available
  createEffect(() => {
    const sessionData = session();
    if (sessionData) {
      setFormData({
        name: sessionData.name || "",
        location: sessionData.location?.toString() || "",
      });
    }
  });

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const form = event.target as HTMLFormElement;
    const formDataObj = new FormData(form);

    const profileData = {
      name: formDataObj.get("name") as string,
      location: formDataObj.get("location") as string,
    };

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          text: result.message,
          type: "success",
        });

        // Update local form data with the returned user data
        if (result.user) {
          setFormData({
            name: result.user.name || "",
            location: result.user.location?.toString() || "",
          });
        }
      } else {
        setMessage({
          text: result.message,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Profile update error:", error);
      setMessage({
        text: "An unexpected error occurred. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Show
      when={signedIn()}
      fallback={
        <main class="flex items-center justify-center min-h-screen bg-gray-50 text-gray-700 p-4">
          <div class="text-center">
            <h1 class="text-3xl font-bold mb-4">Access Denied</h1>
            <p class="mb-4">You must be logged in to view this page.</p>
            <a
              href="/login"
              class="inline-block px-4 py-2 bg-sky-700 text-white rounded hover:bg-sky-800 transition-colors"
            >
              Sign In
            </a>
          </div>
        </main>
      }
    >
      <main class="flex items-center justify-center min-h-screen bg-gray-100 text-gray-900 p-4 pt-20">
        <div class="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-900 p-8">
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
              <svg
                class="w-10 h-10 text-gray-900"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                ></path>
              </svg>
            </div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
              Profile Settings
            </h1>
            <p class="text-gray-700">Manage your account information</p>
          </div>

          <Show when={message()}>
            <div
              class={`p-3 mb-4 rounded ${
                message()?.type === "success"
                  ? "bg-gray-100 text-gray-900 border-2 border-gray-900"
                  : "bg-gray-900 text-white border-2 border-gray-900"
              }`}
            >
              {message()?.text}
            </div>
          </Show>

          <form onSubmit={handleSubmit} class="space-y-6">
            <div class="relative">
              <label
                for="email"
                class="block text-sm font-semibold text-gray-900 mb-2"
              >
                <span class="flex items-center">
                  <svg
                    class="w-4 h-4 mr-2 text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    ></path>
                  </svg>
                  Email Address
                </span>
              </label>
              <div class="relative">
                <input
                  type="email"
                  id="email"
                  value={session()?.email || ""}
                  disabled
                  class="w-full px-4 py-3 border-2 border-gray-900 rounded-lg bg-gray-100 text-gray-900 cursor-not-allowed focus:outline-none"
                />
                <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg
                    class="w-5 h-5 text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    ></path>
                  </svg>
                </div>
              </div>
              <p class="text-xs text-gray-700 mt-1 italic">
                Your email address cannot be changed
              </p>
            </div>

            <div>
              <label
                for="name"
                class="block text-sm font-semibold text-gray-900 mb-2"
              >
                <span class="flex items-center">
                  <svg
                    class="w-4 h-4 mr-2 text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    ></path>
                  </svg>
                  Display Name
                </span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData().name}
                onInput={(e) =>
                  handleInputChange("name", e.currentTarget.value)
                }
                placeholder="Enter your display name"
                class="w-full px-4 py-3 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-900 transition-colors"
              />
            </div>

            <div>
              <label
                for="location"
                class="block text-sm font-semibold text-gray-900 mb-2"
              >
                <span class="flex items-center">
                  <svg
                    class="w-4 h-4 mr-2 text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    ></path>
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                  </svg>
                  Work Location
                </span>
              </label>
              <div class="relative">
                <select
                  id="location"
                  name="location"
                  value={formData().location}
                  onChange={(e) =>
                    handleInputChange("location", e.currentTarget.value)
                  }
                  class="w-full px-4 py-3 border-2 border-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-900 appearance-none bg-white transition-colors"
                >
                  <option value="">Select your work location</option>
                  <option value="15">2 - Olney</option>
                  <option value="16">1 - West</option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    class="w-5 h-5 text-gray-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>

            <div class="pt-4">
              <button
                type="submit"
                disabled={isSubmitting()}
                class="w-full px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmitting() ? (
                  <div class="flex items-center justify-center">
                    <div class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Saving Changes...
                  </div>
                ) : (
                  <div class="flex items-center justify-center">
                    <svg
                      class="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    Update Profile
                  </div>
                )}
              </button>
            </div>
          </form>

          <div class="mt-8 pt-6 border-t border-gray-200 text-center">
            <a
              href="/"
              class="inline-flex items-center text-gray-900 hover:text-gray-700 text-sm font-medium transition-colors"
            >
              <svg
                class="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                ></path>
              </svg>
              Back to Home
            </a>
          </div>
        </div>
      </main>
    </Show>
  );
}
