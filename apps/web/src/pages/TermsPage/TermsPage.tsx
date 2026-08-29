import { Link } from "react-router";
import styles from "./TermsPage.module.css";

// Static content, presentational — no data, no auth required (same reasoning
// as PrivacyPage: needs to be reachable while signed out).
export function TermsPage() {
  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <Link to="/login" className="wordmark">
          OPENCANVAS
        </Link>
      </div>
      <div className={styles.content}>
        <h1>Terms of Service</h1>
        <p className={styles.updated}>Last updated August 2026</p>

        <p>
          OpenCanvas is a personal, independently-developed design tool project. These terms cover the basics of
          using it. By signing in and using the app, you're agreeing to them.
        </p>

        <h2>The service</h2>
        <p>
          OpenCanvas lets you create and edit design projects — shapes, layouts, text, and images — and saves them to
          your account. It's an actively evolving, independently-run project, not a company with an SLA: features can
          change, and the service can have downtime or, in the worst case, be discontinued, with as much notice as
          reasonably possible.
        </p>

        <h2>Your account</h2>
        <p>
          You sign in with Google — there's no separate email/password account. You're responsible for anything that
          happens under your account, and for keeping access to the Google account it's tied to.
        </p>

        <h2>Your content</h2>
        <p>
          Whatever you create in OpenCanvas — projects, pages, uploaded images — is yours. We don't claim ownership
          over it, and we don't use it for anything beyond providing the app back to you (see the{" "}
          <Link to="/privacy">Privacy Policy</Link> for details on data handling).
        </p>
        <p>
          You're responsible for what you upload and create. Don't use OpenCanvas to store or share anything illegal,
          infringing, or harmful to others.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Use the app the way it's meant to be used: don't attempt to disrupt the service, access other users'
          accounts or data, or abuse it in ways that affect its availability for others.
        </p>

        <h2>No warranty</h2>
        <p>
          OpenCanvas is provided as-is, without warranties of any kind. This is a small, independently-run project —
          use it accordingly, and keep your own copies of anything you can't afford to lose.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          If these terms change, we'll update the date at the top of this page. Continued use of the app after a
          change means you're okay with the update.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these terms: <a href="mailto:barnabee58@gmail.com">barnabee58@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
