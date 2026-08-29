import { Link } from "react-router";
import styles from "./PrivacyPage.module.css";

// Static content, presentational — no data, no auth required (Google's own
// verification review needs to be able to load this while signed out).
export function PrivacyPage() {
  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <Link to="/login" className="wordmark">
          OPENCANVAS
        </Link>
      </div>
      <div className={styles.content}>
        <h1>Privacy Policy</h1>
        <p className={styles.updated}>Last updated August 2026</p>

        <p>
          OpenCanvas is a personal, independently-developed design tool project. This policy describes what
          information the app collects when you use it and how it's handled.
        </p>

        <h2>Information we collect</h2>
        <p>
          When you sign in with Google, we receive your name, email address, and profile picture from your Google
          account — that's the only way to create an account; there's no separate email/password sign-up.
        </p>
        <p>
          Beyond that, we store what you create while using the app: your projects, pages, and any images you
          upload into them.
        </p>

        <h2>How we use it</h2>
        <p>
          Solely to provide the app itself: identifying your account, saving and syncing your projects as you edit
          them, and displaying them back to you. We don't use your information for advertising, and we don't sell or
          rent it to anyone.
        </p>

        <h2>Third parties</h2>
        <p>A few external services are involved in running the app, each handling only what it needs to:</p>
        <ul>
          <li>
            <strong>Google</strong> — for signing in (OAuth).
          </li>
          <li>
            <strong>Cloudflare R2</strong> — stores images you upload into your projects.
          </li>
          <li>
            <strong>Our hosting provider</strong> — runs the application and its database (your account and project
            data).
          </li>
        </ul>

        <h2>Cookies</h2>
        <p>
          We use a single session cookie to keep you signed in. There's no analytics, tracking, or advertising
          cookies anywhere in the app.
        </p>

        <h2>Data retention & deletion</h2>
        <p>
          There's no self-service account/project deletion in the app yet. If you'd like your account or any of your
          data removed, email us (below) and we'll take care of it.
        </p>

        <h2>Security</h2>
        <p>
          All traffic to the app is served over HTTPS. Access to your data is limited to what's needed to run the
          service — this is a small, independently-run project, not a company with a dedicated security team, so
          please use your judgment about what you store here.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If this policy changes, we'll update the date at the top of this page. Continued use of the app after a
          change means you're okay with the update.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy, or a data request: <a href="mailto:barnabee58@gmail.com">barnabee58@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
