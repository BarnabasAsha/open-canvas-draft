import { Route, Routes } from "react-router";
import { RedirectIfAuthed, RequireAuth } from "./auth/RequireAuth";
import { AuthPage } from "./pages/AuthPage/AuthPage";
import { DashboardLayout } from "./pages/DashboardLayout/DashboardLayout";
import { PrivacyPage } from "./pages/PrivacyPage/PrivacyPage";
import { ProjectsPage } from "./pages/ProjectsPage/ProjectsPage";
import { TermsPage } from "./pages/TermsPage/TermsPage";
import { CanvasEditorPage } from "./pages/CanvasEditorPage";

export default function App() {
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
