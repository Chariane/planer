import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";

// --- Import des icônes Lucide React ---
import { Menu, Home, Star, DollarSign, Mail, LogIn, UserPlus, Languages, X } from 'lucide-react';

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white flex flex-col">
            {/* HEADER */}
            <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 shadow-lg">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    {/* Logo */}
                    <Link to="/" className="text-2xl font-bold text-white hover:text-blue-200 transition">
                        K-PLANER
                    </Link>

                    {/* Navigation desktop */}
                    <nav className="hidden md:flex space-x-6">
                        {navigation.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition ${
                                    location.pathname === item.path
                                        ? 'bg-white/20 text-white font-semibold'
                                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {item.icon}
                                <span>{getText(item.fr, item.en)}</span>
                            </Link>
                        ))}
                    </nav>

                    {/* Auth buttons desktop */}
                    <div className="hidden md:flex space-x-4">
                        <Link
                            to="/login"
                            className="flex items-center space-x-2 px-4 py-2 border border-white/30 rounded-md text-white hover:bg-white/10 transition"
                        >
                            <LogIn size={18} />
                            <span>{getText('Connexion', 'Login')}</span>
                        </Link>
                        <Link
                            to="/register"
                            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-white transition"
                        >
                            <UserPlus size={18} />
                            <span>{getText('Inscription', 'Register')}</span>
                        </Link>
                    </div>

                    {/* Language toggle */}
                    <button
                        onClick={() => setCurrentLang(currentLang === 'fr' ? 'en' : 'fr')}
                        className="p-2 text-white hover:bg-white/10 rounded-md transition"
                        title={getText('Changer de langue', 'Change language')}
                    >
                        <Languages size={20} />
                    </button>

                    {/* Menu mobile toggle */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-2 text-white hover:bg-white/10 rounded-md transition"
                    >
                        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className="md:hidden bg-black/50 backdrop-blur-sm">
                        <div className="container mx-auto px-4 py-4 space-y-2">
                            {navigation.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-md transition ${
                                        location.pathname === item.path
                                            ? 'bg-white/20 text-white'
                                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {item.icon}
                                    <span>{getText(item.fr, item.en)}</span>
                                </Link>
                            ))}
                            <div className="border-t border-white/20 my-4"></div>
                            {authLinks.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition"
                                >
                                    {item.icon}
                                    <span>{getText(item.fr, item.en)}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {/* MAIN CONTENT */}
            <main className="flex-grow bg-gray-50 text-gray-900">
                <div className="container mx-auto px-4 py-8">
                    {children || <Outlet />}
                </div>
            </main>

            {/* FOOTER */}
            <footer className="bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-white py-8">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">K-PLANER</h3>
                            <p className="text-gray-300 mb-4">
                                {getText('Plateforme de gestion de projets et de temps de travail avec collaboration en temps réel.', 'Project and time management platform with real-time collaboration.')}
                            </p>
                            <div className="flex space-x-4">
                                <a href="#" className="text-gray-300 hover:text-white">📘</a>
                                <a href="#" className="text-gray-300 hover:text-white">🐦</a>
                                <a href="#" className="text-gray-300 hover:text-white">💼</a>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-lg font-semibold mb-4">{getText('Liens rapides', 'Quick links')}</h4>
                            <div className="space-y-2">
                                <Link to="/features" className="block text-gray-300 hover:text-white">{getText('Fonctionnalités', 'Features')}</Link>
                                <Link to="/pricing" className="block text-gray-300 hover:text-white">{getText('Tarifs', 'Pricing')}</Link>
                                <Link to="/contact" className="block text-gray-300 hover:text-white">{getText('Contact', 'Contact')}</Link>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-lg font-semibold mb-4">{getText('Support', 'Support')}</h4>
                            <div className="space-y-2">
                                <Link to="/help" className="block text-gray-300 hover:text-white">{getText('Aide', 'Help')}</Link>
                                <Link to="/faq" className="block text-gray-300 hover:text-white">FAQ</Link>
                                <Link to="/terms" className="block text-gray-300 hover:text-white">{getText('Conditions', 'Terms')}</Link>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-lg font-semibold mb-4">{getText('Contact', 'Contact')}</h4>
                            <div className="space-y-2 text-gray-300">
                                <p>📧 contact@k-planer.com</p>
                                <p>📞 +33 1 23 45 67 89</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                        <p className="text-gray-300">
                            © {new Date().getFullYear()} K-PLANER. {getText('Tous droits réservés.', 'All rights reserved.')}
                        </p>
                        <div className="flex space-x-4 mt-4 md:mt-0">
                            <span className="text-gray-300">🔒</span>
                            <span className="text-gray-300">🛡️</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
