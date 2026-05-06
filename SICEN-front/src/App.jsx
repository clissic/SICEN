import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { CarFinesMenuPage } from "./pages/CarFinesMenuPage.jsx";
import { CarFineFormPage } from "./pages/CarFineFormPage.jsx";
import { AllCarFinesPage } from "./pages/AllCarFinesPage.jsx";
import { UserFinesPage } from "./pages/UserFinesPage.jsx";
import { UpdatePasswordPage } from "./pages/UpdatePasswordPage.jsx";
import { UpdateDataPage } from "./pages/UpdateDataPage.jsx";
import { NewAccountPage } from "./pages/NewAccountPage.jsx";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.jsx";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.jsx";
import { ShipFinesMenuPage } from "./pages/ShipFinesMenuPage.jsx";
import { FinesManagementPage } from "./pages/FinesManagementPage.jsx";
import { UpdateCarFinePage } from "./pages/UpdateCarFinePage.jsx";
import { DeleteCarFinePage } from "./pages/DeleteCarFinePage.jsx";
import { ToolsMenuPage } from "./pages/ToolsMenuPage.jsx";
import { ToolEmbedPage } from "./pages/ToolEmbedPage.jsx";
import { UsersMenuPage } from "./pages/UsersMenuPage.jsx";
import { NewUserPage } from "./pages/NewUserPage.jsx";
import { AllUsersPage } from "./pages/AllUsersPage.jsx";
import { UpdateUserPage } from "./pages/UpdateUserPage.jsx";
import { DeleteUserPage } from "./pages/DeleteUserPage.jsx";

function Landing() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="p-5 text-center">Cargando…</div>;
  }
  if (user) {
    return <Navigate to="/home" replace />;
  }
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/signup"
        element={
          <ProtectedRoute admin>
            <SignupPage />
          </ProtectedRoute>
        }
      />
      <Route path="/solicitar-cuenta" element={<NewAccountPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/restablecer" element={<ResetPasswordPage />} />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mis-multas"
        element={
          <ProtectedRoute>
            <UserFinesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cambiar-clave"
        element={
          <ProtectedRoute>
            <UpdatePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/actualizar-datos"
        element={
          <ProtectedRoute>
            <UpdateDataPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/multas"
        element={
          <ProtectedRoute>
            <FinesManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/multas/buques"
        element={
          <ProtectedRoute>
            <ShipFinesMenuPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/multas/vehiculos"
        element={
          <ProtectedRoute>
            <CarFinesMenuPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/multas/vehiculos/nueva"
        element={
          <ProtectedRoute>
            <CarFineFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/multas/vehiculos/todas"
        element={
          <ProtectedRoute>
            <AllCarFinesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/multas/vehiculos/modificar"
        element={
          <ProtectedRoute>
            <UpdateCarFinePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/multas/vehiculos/eliminar"
        element={
          <ProtectedRoute>
            <DeleteCarFinePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/herramientas"
        element={
          <ProtectedRoute>
            <ToolsMenuPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/herramientas/:slug"
        element={
          <ProtectedRoute>
            <ToolEmbedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute admin>
            <UsersMenuPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios/nuevo"
        element={
          <ProtectedRoute admin>
            <NewUserPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios/todos"
        element={
          <ProtectedRoute admin>
            <AllUsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios/editar"
        element={
          <ProtectedRoute admin>
            <UpdateUserPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios/eliminar"
        element={
          <ProtectedRoute admin>
            <DeleteUserPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
