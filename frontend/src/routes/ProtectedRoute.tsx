import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAdminToken } from "../api/adminApi";

export const ProtectedRoute = () => {
  const location = useLocation();

  if (!getAdminToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export const PublicOnlyRoute = () => {
  if (getAdminToken()) return <Navigate to="/" replace />;
  return <Outlet />;
};
