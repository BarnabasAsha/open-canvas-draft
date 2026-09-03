import { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router";
import { RedirectIfAuthed, RequireAuth } from "./auth/RequireAuth";
import { authClient } from "./lib/authClient";
import { AuthPage } from "./pages/AuthPage/AuthPage";
import { DashboardLayout } from "./pages/DashboardLayout/DashboardLayout";
import { PrivacyPage } from "./pages/PrivacyPage/PrivacyPage";
import { ProjectsPage } from "./pages/ProjectsPage/ProjectsPage";
import { TermsPage } from "./pages/TermsPage/TermsPage";
import { CanvasEditorPage } from "./pages/CanvasEditorPage";
import { setNavigate } from "./webmcp/navigate";
import { initProjectManagementTools } from "./webmcp/registerProjectTools";

// create_project/list_projects/open_project operate independent of any
// specific open project (unlike CanvasEditorPage's own canvas-editing
// tools — see webmcp/registerTools.ts), and ProjectsPage/CanvasEditorPage
// are separate top-level routes with no shared layout mounted for both, so
// App itself is the one place alive for the whole session either way.
export default function App() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const userId = session?.user.id;

  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    return initProjectManagementTools();
  }, [userId]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <AuthPage mode="login" />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <AuthPage mode="signup" />
          </RedirectIfAuthed>
        }
      />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<ProjectsPage />} />
      </Route>
      <Route
        path="/design/:projectId"
        element={
          <RequireAuth>
            <CanvasEditorPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
