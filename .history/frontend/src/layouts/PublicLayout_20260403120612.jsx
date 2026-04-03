import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";

// --- Import des icônes Lucide React ---
import { Menu, Home, Star, DollarSign, Mail, LogIn, UserPlus, Languages } from 'lucide-react';

import {
    AppBar,
    Toolbar,
    IconButton,
    Box,
    Container,
    Typography,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
} from "@mui/material";

const PublicLayout = ({ children }) => {
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [currentLang, setCurrentLang] = useState('fr');

    const navigation = [
        { path: '/', name: 'Accueil', icon: <Home />, fr: 'Accueil', en: 'Home' },
        { path: '/features', name: 'Fonctionnalités', icon: <Star />, fr: 'Fonctionnalités', en: 'Features' },
        { path: '/pricing', name: 'Tarifs', icon: <DollarSign />, fr: 'Tarifs', en: 'Pricing' },
        { path: '/contact', name: 'Contact', icon: <Mail />, fr: 'Contact', en: 'Contact' },
    ];

    const authLinks = [
        { path: '/login', name: 'Connexion', icon: <LogIn />, fr: 'Connexion', en: 'Login' },
        { path: '/register', name: 'Inscription', icon: <UserPlus />, fr: 'Inscription', en: 'Register' },
    ];

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const getText = (frText, enText) => {
        return currentLang === 'fr' ? frText : enText;
    };

    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ my: 2, fontWeight: 'bold', background: 'linear-gradient(45deg, #1e3a8a 30%, #7c3aed 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                K-PLANER
            </Typography>
            <Divider />
            <List>
                {navigation.map((item) => (
                    <ListItem key={item.path} disablePadding>
                        <ListItemButton component={Link} to={item.path} sx={{ textAlign: 'center' }}>
                            <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={getText(item.fr, item.en)} />
                        </ListItemButton>
                    </ListItem>
                ))}
                <Divider />
                {authLinks.map((item) => (
                    <ListItem key={item.path} disablePadding>
                        <ListItemButton component={Link} to={item.path} sx={{ textAlign: 'center' }}>
                            <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={getText(item.fr, item.en)} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* HEADER */}
            <AppBar position="sticky" sx={{ background: 'linear-gradient(45deg, #1e3a8a 30%, #7c3aed 90%)', boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)' }}>
                <Toolbar sx={{ justifyContent: "space-between", py: 1 }}>
                    {/* Logo */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
                            <Typography
                                variant="h5"
                                component="div"
                                sx={{
                                    fontWeight: "bold",
                                    color: "#fff",
                                    letterSpacing: 1.5,
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                                    whiteSpace: 'nowrap',
                                    background: 'linear-gradient(45deg, #fff 30%, #e0e7ff 90%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}
                            >
                                K-PLANER
                            </Typography>
                        </Link>
                    </Box>

                    {/* Navigation desktop */}
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: "center" }}>
                        {navigation.map((item) => (
                            <Button
                                key={item.path}
                                component={Link}
                                to={item.path}
                                startIcon={item.icon}
                                sx={{
                                    color: "#fff",
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                                    fontWeight: location.pathname === item.path ? 'bold' : 'normal'
                                }}
                            >
                                {getText(item.fr, item.en)}
                            </Button>
                        ))}
                    </Box>

                    {/* Auth buttons desktop */}
                    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: "center" }}>
                        <Button
                            component={Link}
                            to="/login"
                            startIcon={<LoginIcon />}
                            variant="outlined"
                            sx={{ color: "#fff", borderColor: "#fff", '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
                        >
                            {getText('Connexion', 'Login')}
                        </Button>
                        <Button
                            component={Link}
                            to="/register"
                            startIcon={<PersonAddIcon />}
                            variant="contained"
                            sx={{ backgroundColor: "#7c3aed", '&:hover': { backgroundColor: "#5b21b6" } }}
                        >
                            {getText('Inscription', 'Register')}
                        </Button>
                    </Box>

                    {/* Language toggle */}
                    <IconButton
                        color="inherit"
                        onClick={() => setCurrentLang(currentLang === 'fr' ? 'en' : 'fr')}
                        title={getText('Changer de langue', 'Change language')}
                    >
                        <Languages />
                    </IconButton>

                    {/* Menu mobile */}
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <Menu />
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Drawer mobile */}
            <Box component="nav">
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240, background: 'linear-gradient(45deg, #1e3a8a 30%, #7c3aed 90%)', color: '#fff' },
                    }}
                >
                    {drawer}
                </Drawer>
            </Box>

            {/* MAIN CONTENT */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    py: 4,
                    backgroundColor: "#f8fafc",
                }}
            >
                <Container maxWidth="lg">
                    {children || <Outlet />}
                </Container>
            </Box>

            {/* FOOTER */}
            <Box
                component="footer"
                sx={{
                    background: 'linear-gradient(45deg, #1e3a8a 30%, #7c3aed 90%)',
                    color: "#fff",
                    py: 4,
                    mt: 'auto',
                }}
            >
                <Container maxWidth="lg">
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 4 }}>
                        <Box>
                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                K-PLANER
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 2 }}>
                                {getText('Plateforme de gestion de projets et de temps de travail avec collaboration en temps réel.', 'Project and time management platform with real-time collaboration.')}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <a href="#" style={{ color: '#fff' }}>📘</a>
                                <a href="#" style={{ color: '#fff' }}>🐦</a>
                                <a href="#" style={{ color: '#fff' }}>💼</a>
                            </Box>
                        </Box>

                        <Box>
                            <Typography variant="h6" gutterBottom>
                                {getText('Liens rapides', 'Quick links')}
                            </Typography>
                            <Link to="/features" style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>{getText('Fonctionnalités', 'Features')}</Link>
                            <Link to="/pricing" style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>{getText('Tarifs', 'Pricing')}</Link>
                            <Link to="/contact" style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>{getText('Contact', 'Contact')}</Link>
                        </Box>

                        <Box>
                            <Typography variant="h6" gutterBottom>
                                {getText('Support', 'Support')}
                            </Typography>
                            <Link to="/help" style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>{getText('Aide', 'Help')}</Link>
                            <Link to="/faq" style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>FAQ</Link>
                            <Link to="/terms" style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>{getText('Conditions', 'Terms')}</Link>
                        </Box>

                        <Box>
                            <Typography variant="h6" gutterBottom>
                                {getText('Contact', 'Contact')}
                            </Typography>
                            <Typography variant="body2">📧 contact@k-planer.com</Typography>
                            <Typography variant="body2">📞 +33 1 23 45 67 89</Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 3, backgroundColor: 'rgba(255,255,255,0.3)' }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: { xs: 'column', md: 'row' } }}>
                        <Typography variant="body2">
                            © {new Date().getFullYear()} K-PLANER. {getText('Tous droits réservés.', 'All rights reserved.')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: { xs: 2, md: 0 } }}>
                            <span>🔒</span>
                            <span>🛡️</span>
                        </Box>
                    </Box>
                </Container>
            </Box>
        </Box>
    );
};

export default PublicLayout;
