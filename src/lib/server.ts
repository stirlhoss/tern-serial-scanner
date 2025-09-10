import { useSession } from "vinxi/http";
import { redirect } from "@solidjs/router";
import { createUser, findUserByEmail } from "./db";

export interface Session {
  id: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
}

export const getSession = () =>
  useSession<Session>({
    password: process.env.SESSION_SECRET!,
    cookie: {
      name: "tern_session",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  });

export const createSession = async (
  user: Omit<Session, "accessToken"> & Partial<Session>,
  redirectTo?: string,
) => {
  const validDest = redirectTo?.[0] === "/" && redirectTo[1] !== "/";
  const session = await getSession();
  await session.update(user);
  return redirect(validDest ? redirectTo : "/");
};

export const oauthSignIn = async (
  email: string,
  accessToken: string,
  refreshToken: string,
  redirectTo?: string,
) => {
  let user = await findUserByEmail(email);
  if (!user) user = await createUser(email);

  return createSession({ ...user, accessToken, refreshToken }, redirectTo);
};
