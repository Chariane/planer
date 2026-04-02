import React from 'react';

const Header = () => {
  return (
    <header className="header">
      <nav className="container">
        <div className="logo">
          <span>K-PLANER</span>
        </div>
        <ul className="nav-links">
          <li><a href="#">Fonctionnalités</a></li>
          <li><a href="#">Tarifs</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
        <div className="nav-buttons">
          <button className="login-btn">Se connecter</button>
          <button className="signup-btn">S'inscrire</button>
        </div>
      </nav>
    </header>
  );
};

export default Header;