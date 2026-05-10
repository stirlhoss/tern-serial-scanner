// @refresh reload
import { type RouteDefinition, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { querySession } from "./lib";
import Session from "./lib/Context";
import Nav from "./components/Nav";
import "./app.css";

export const route: RouteDefinition = {
  preload: ({ location }) => querySession(location.pathname),
};

export default function App() {
  return (
    <Router
      root={(props) => (
        <Session>
          <Suspense fallback={<div class="fixed top-0 left-0 w-full bg-gray-900 shadow-md z-50 p-3 text-white text-center">Loading...</div>}>
            <Nav />
          </Suspense>
          <Suspense>
            {props.children}
          </Suspense>
        </Session>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
