import { useState } from "react";
import { Link } from "react-router";
import { authClient } from "../../lib/authClient";
import { GoogleIcon } from "../../ui/GoogleIcon";
import styles from "./AuthPage.module.css";

interface AuthPageProps {
  mode: "login" | "signup";
}

// Google doesn't distinguish new vs. existing accounts at the button level
// (it's the same OAuth consent flow either way) — so /login and /signup
// share this one component, differing only in copy and the cross-link.
// callbackURL always points at "/"; RequireAuth is what actually decides
// whether that's reachable.
export function AuthPage({ mode }: AuthPageProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleGoogleSignIn(): Promise<void> {
    setIsPending(true);
    // Must be absolute: authClient's baseURL points at the API, so a
    // relative "/" resolves against the API's own origin instead of the
    // frontend's.
    await authClient.signIn.social({ provider: "google", callbackURL: `${window.location.origin}/` });
  }

  return (
    <div className={styles.screen}>
      <div className={`wordmark ${styles.wordmarkPlacement}`}>OPENCANVAS</div>
      <div className={styles.content}>
        <div className={styles.heading}>
          {mode === "login" ? (
            <h1>Welcome back</h1>
          ) : (
            <h1>
              Start with a sentence.
              <br />
              Finish by hand.
            </h1>
          )}
          <p className={styles.intro}>
            {mode === "login" ? "Your canvases are where you left them." : "Your first canvas takes about ten seconds."}
          </p>
        </div>
        <button type="button" className={styles.googleButton} onClick={handleGoogleSignIn} disabled={isPending}>
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>
      </div>
      <div className={styles.footer}>
        <span>
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link to="/signup" className={styles.footerEmphasis}>
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link to="/login" className={styles.footerEmphasis}>
                Log in
              </Link>
            </>
          )}
        </span>
        <Link to="/terms" className={styles.footerStatic}>
          Terms
        </Link>
        <Link to="/privacy" className={styles.footerStatic}>
          Privacy
        </Link>
      </div>
    </div>
  );
}
