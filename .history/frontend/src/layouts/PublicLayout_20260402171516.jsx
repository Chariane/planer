import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import './PublicLayout.css';

const PublicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([
    { id: 1, text: "Bienvenue sur K-PLANER ! 👋", sender: "received", time: "10:30" }
  ]);
  const [newMessage, setNewMessage] = React.useState("");
  const [notifications, setNotifications] = React.useState(3);
  const [user, setUser] = React.useState({
    name: "Jean Dupont",
    role: "Chef de projet",
    avatar: "JD"
  });

  const menuItems = [
    { path: "/dashboard", name: "Tableau de bord", icon: "📊" },
    { path: "/projects", name: "Projets", icon: "📁" },
    { path: "/tasks", name: "Tâches", icon: "✅" },
    { path: "/calendar", name: "Calendrier", icon: "📅" },
    { path: "/time", name: "Temps de travail", icon: "⏰" },
    { path: "/files", name: "Fichiers", icon: "📎" },
    { path: "/reports", name: "Rapports", icon: "📈" },
    { path: "/settings", name: "Paramètres", icon: "⚙️" }
  ];

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: messages.length + 1,
        text: newMessage,
        sender: "sent",
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMsg]);
      setNewMessage("");

      // Simuler une réponse automatique
      setTimeout(() => {
        const responseMsg = {
          id: messages.length + 2,
          text: "Merci pour votre message ! L'équipe K-PLANER vous répondra dans les plus brefs délais. 💪",
          sender: "received",
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, responseMsg]);
      }, 1000);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">K-PLANER</div>
          <div className="logo-sub">Gestion de projets & temps de travail</div>
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {isSidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="nav-menu">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {isSidebarOpen && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
        {/* Top Header */}
        <header className="top-header">
          <div className="header-search">
            <span>🔍</span>
            <input type="text" placeholder="Rechercher un projet, une tâche..." />
          </div>
          <div className="header-actions">
            <div className="notification-badge" onClick={() => setNotifications(0)}>
              <span>🔔</span>
              {notifications > 0 && <span className="badge">{notifications}</span>}
            </div>
            <div className="user-profile" onClick={() => navigate('/profile')}>
              <div className="user-avatar">{user.avatar}</div>
              {isSidebarOpen && (
                <div>
                  <div><strong>{user.name}</strong></div>
                  <div style={{ fontSize: '12px', color: 'var(--gray)' }}>{user.role}</div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-wrapper">
          <Outlet />
        </div>
      </main>

      {/* Chat Button */}
      <button className="chat-toggle" onClick={toggleChat}>
        💬
      </button>

      {/* Chat Container */}
      <div className={`chat-container ${isChatOpen ? 'open' : ''}`}>
        <div className="chat-header" onClick={toggleChat}>
          <span>💬 K-Chat - Communication en temps réel</span>
          <span>{isChatOpen ? '−' : '+'}</span>
        </div>
        {isChatOpen && (
          <>
            <div className="chat-messages">
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.sender}`}>
                  <div className="message-bubble">{message.text}</div>
                  <div style={{ fontSize: '11px', color: '#999' }}>{message.time}</div>
                </div>
              ))}
            </div>
            <div className="chat-input">
              <input
                type="text"
                placeholder="Tapez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button className="btn-primary" onClick={handleSendMessage}>
                Envoyer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PublicLayout;