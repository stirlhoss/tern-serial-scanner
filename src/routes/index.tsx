import Form from "~/components/Form";

export default function Home() {
  return (
    <main class="flex items-center justify-center min-h-screen bg-gray-50 text-gray-700 p-4">
      <div class="w-full max-w-4xl text-center space-y-8">
        <h1 class="text-6xl text-sky-700 font-thin uppercase">
          Tern Serial Scanner
        </h1>
        <Form />
      </div>
    </main>
  );
}
