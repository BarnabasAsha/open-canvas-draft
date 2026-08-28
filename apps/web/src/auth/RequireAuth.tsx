import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { authClient } from "../lib/authClient";

// The one place "does this request need to go to /login instead" is
// decided — signIn.social()'s callbackURL just points back at "/" for
// both login and signup, and this sorts out where you actually land,
// based purely on session state.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) return null;

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// The inverse, for /login and /signup — an already-authed session has no
// reason to see the auth screens again.
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  if (session) {
    return <Navigate to="/" replace />;
  }

  return children;
}
