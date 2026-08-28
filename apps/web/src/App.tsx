import { Route, Routes } from "react-router";
import { RedirectIfAuthed, RequireAuth } from "./auth/RequireAuth";
import { AuthPage } from "./pages/AuthPage/AuthPage";
import { DashboardLayout } from "./pages/DashboardLayout/DashboardLayout";
import { ProjectsPage } from "./pages/ProjectsPage/ProjectsPage";
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
