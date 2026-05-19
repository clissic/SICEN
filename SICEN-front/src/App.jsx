import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { GestionUnidadesPage } from "./pages/GestionUnidadesPage.jsx";
import { SumarUnidadPage } from "./pages/SumarUnidadPage.jsx";
import { ModificarUnidadPage } from "./pages/ModificarUnidadPage.jsx";
import { BorrarUnidadPage } from "./pages/BorrarUnidadPage.jsx";
import { MiUnidadPage } from "./pages/MiUnidadPage.jsx";
import { MiUnidadDivisionPage } from "./pages/MiUnidadDivisionPage.jsx";
import { MiUnidadDivisionMenuItemPage } from "./pages/MiUnidadDivisionMenuItemPage.jsx";
import { MiUnidadAreaPage } from "./pages/MiUnidadAreaPage.jsx";
import { BuquesMenuPage } from "./pages/BuquesMenuPage.jsx";
import { NewShipPage } from "./pages/NewShipPage.jsx";
import { AllShipsPage } from "./pages/AllShipsPage.jsx";
import { ShipCertificatesPage } from "./pages/ShipCertificatesPage.jsx";
import { EditShipPage } from "./pages/EditShipPage.jsx";
import { GenteMarMenuPage } from "./pages/GenteMarMenuPage.jsx";
import { GenteMarPlaceholderPage } from "./pages/GenteMarPlaceholderPage.jsx";
import { NewSeafarerPage } from "./pages/NewSeafarerPage.jsx";
import { SeafarerConsultPage } from "./pages/SeafarerConsultPage.jsx";
import { SeafarerMetadataPage } from "./pages/SeafarerMetadataPage.jsx";
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
import { NotFoundPage } from "./pages/NotFoundPage.jsx";
import { EstadoRectorPuertosPage } from "./pages/EstadoRectorPuertosPage.jsx";
import { ManualUsuarioPage } from "./pages/ManualUsuarioPage.jsx";
import { UserTutorialRequiredPage } from "./pages/UserTutorialRequiredPage.jsx";

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
        path="/manual-usuario"
        element={
          <ProtectedRoute>
            <ManualUsuarioPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tutorial-requerido"
        element={
          <ProtectedRoute>
            <UserTutorialRequiredPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gestion-unidades"
        element={
          <ProtectedRoute>
            <GestionUnidadesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gestion-unidades/sumar"
        element={
          <ProtectedRoute admin>
            <SumarUnidadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gestion-unidades/modificar"
        element={
          <ProtectedRoute admin>
            <ModificarUnidadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gestion-unidades/borrar"
        element={
          <ProtectedRoute admin>
            <BorrarUnidadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mi-unidad"
        element={
          <ProtectedRoute>
            <MiUnidadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mi-unidad/areas/:areaSlug"
        element={
          <ProtectedRoute>
            <MiUnidadAreaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mi-unidad/:divisionSlug/:sectionSlug/:itemSlug"
        element={
          <ProtectedRoute>
            <MiUnidadDivisionMenuItemPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mi-unidad/:divisionSlug"
        element={
          <ProtectedRoute>
            <MiUnidadDivisionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-buques"
        element={
          <ProtectedRoute>
            <BuquesMenuPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-buques/nuevo"
        element={
          <ProtectedRoute>
            <NewShipPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-buques/todos"
        element={
          <ProtectedRoute>
            <AllShipsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-buques/certificados/:vesselId"
        element={
          <ProtectedRoute>
            <ShipCertificatesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-buques/editar/:vesselId"
        element={
          <ProtectedRoute>
            <EditShipPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-buques/editar"
        element={
          <ProtectedRoute>
            <AllShipsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-buques/eliminar"
        element={
          <ProtectedRoute admin>
            <AllShipsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-gente-mar"
        element={
          <ProtectedRoute>
            <GenteMarMenuPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-gente-mar/nuevo"
        element={
          <ProtectedRoute>
            <NewSeafarerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-gente-mar/todos"
        element={
          <ProtectedRoute>
            <SeafarerConsultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-gente-mar/editar"
        element={
          <ProtectedRoute>
            <SeafarerMetadataPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/base-gente-mar/eliminar"
        element={
          <ProtectedRoute admin>
            <GenteMarPlaceholderPage title="Eliminar — gente de mar" />
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
        path="/estado-rector-puertos"
        element={
          <ProtectedRoute>
            <EstadoRectorPuertosPage />
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
        path="/herramientas/mapas"
        element={
          <ProtectedRoute>
            <Navigate to="/herramientas" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/herramientas/meteorologia"
        element={
          <ProtectedRoute>
            <Navigate to="/herramientas" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/herramientas/otras"
        element={
          <ProtectedRoute>
            <Navigate to="/herramientas" replace />
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
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
