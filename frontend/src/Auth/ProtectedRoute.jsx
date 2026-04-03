import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { UserContext } from "../Context/UserContext";
import { CircularProgress, Box, Typography } from "@mui/material";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useContext(UserContext);

  // Si l'état de l'utilisateur est encore en cours de chargement, afficher un loader
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <CircularProgress size={60} sx={{ color: '#ff6600' }} />
        <Typography variant="h6" sx={{ mt: 3, color: '#264A67' }}>
          Vérification de la connexion...
        </Typography>
      </Box>
    );
  }

  // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si des rôles sont spécifiés et que l'utilisateur n'a pas le bon rôle, rediriger
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Si l'utilisateur est connecté, rendre les enfants de la route ou l'Outlet
  return children ? children : <Outlet />;
};

export default ProtectedRoute;
