import { createContext, useContext, type ParentProps } from "solid-js";
import {
  type AccessorWithLatest,
  useLocation,
  createAsync,
} from "@solidjs/router";
import { querySession } from ".";
import type { Session } from "./server";

const Context = createContext<{
  session: AccessorWithLatest<Session | null | undefined>;
  signedIn: () => boolean;
}>();

export default function Session(props: ParentProps) {
  const location = useLocation();
  const session = createAsync(() => querySession(location.pathname), {
    deferStream: true,
  });
  const signedIn = () => Boolean(session()?.id);

  return (
    <Context.Provider value={{ session, signedIn }}>
      {props.children}
    </Context.Provider>
  );
}

export function useSession() {
  const context = useContext(Context);
  if (!context)
    throw new Error("useSession must be used within Session context");
  return context;
}
