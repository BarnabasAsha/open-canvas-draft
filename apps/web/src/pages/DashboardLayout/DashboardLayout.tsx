import { Outlet, useNavigate } from "react-router";
import { authClient } from "../../lib/authClient";
import { setThemePreference } from "../../store/themeStore";
import { useTheme } from "../../store/useTheme";
import { AvatarButton } from "../../ui/AvatarButton/AvatarButton";
import styles from "./DashboardLayout.module.css";

// No sidebar yet — the avatar menu's "Projects" entry is the only way
// back to the projects list from inside a project, standing in for real
// navigation until there's enough surface area to need one.
export function DashboardLayout() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();
  const theme = useTheme();

  async function handleLogout(): Promise<void> {
    await authClient.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.topbar}>
        <span className="wordmark">OPENCANVAS</span>
        <AvatarButton
          name={session?.user.name ?? ""}
          email={session?.user.email ?? ""}
          image={session?.user.image}
          theme={theme}
          onThemeChange={setThemePreference}
          onProjects={() => navigate("/")}
          onLogout={handleLogout}
        />
      </div>
      <div className={styles.body}>
        <Outlet />
      </div>
    </div>
  );
}
