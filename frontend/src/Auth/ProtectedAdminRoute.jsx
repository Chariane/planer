import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { UserContext } from "../Context/UserContext";
import { CircularProgress, Box, Typography } from "@mui/material";

const ProtectedAdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useContext(UserContext);

  // Affiche un loader si l'utilisateur est en cours de chargement
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <CircularProgress size={60} sx={{ color: '#ff6600' }} />
        <Typography variant="h6" sx={{ mt: 3, color: '#264A67' }}>
          Vérification des autorisations administrateur...
        </Typography>
      </Box>
    );
  }

  // Si l'utilisateur n'est pas connecté ou n'est pas admin, redirige vers l'accueil
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Si l'utilisateur est admin, affiche le contenu
  return children ? children : <Outlet />;
};

export default ProtectedAdminRoute;
