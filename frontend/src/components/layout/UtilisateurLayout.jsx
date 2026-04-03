import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../../styles/UtilisateurLayout.css';

// Composant pour la carte de bienvenue
export const WelcomeCard = ({ user, stats }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div className="welcome-card">
      <div className="welcome-content">
        <div className="welcome-text">
          <h2>{getGreeting()}, {user.prenoms} !</h2>
          <p>Bienvenue sur votre espace de travail. Voici un résumé de votre activité.</p>
        </div>
        <div className="welcome-stats">
          <div className="stat-item">
            <div className="stat-value">{stats.projetsActifs}</div>
            <div className="stat-label">Projets actifs</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-value">{stats.tachesEnCours}</div>
            <div className="stat-label">Tâches en cours</div>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <div className="stat-value">{stats.heuresTravaillees}h</div>
            <div className="stat-label">Heures travaillées</div>
          </div>
        </div>
      </div>
      <div className="welcome-avatar">
        <div className="avatar-large">{user.avatar}</div>
      </div>
    </div>
  );
};

// Composant pour les statistiques rapides
export const QuickStats = ({ stats }) => {
  const statItems = [
    { icon: '📊', label: 'Projets', value: stats.projets, color: '#4361ee' },
    { icon: '✅', label: 'Tâches terminées', value: stats.tachesTerminees, color: '#06d6a0' },
    { icon: '⏰', label: 'En retard', value: stats.tachesEnRetard, color: '#ef476f' },
    { icon: '👥', label: 'Collaborateurs', value: stats.collaborateurs, color: '#7209b7' }
  ];

  return (
    <div className="quick-stats">
      {statItems.map((stat, index) => (
        <div key={index} className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: stat.color }}>
            {stat.icon}
          </div>
          <div className="stat-info">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Composant pour les projets récents
export const RecentProjects = ({ projects, onViewProject }) => {
  return (
    <div className="recent-projects">
      <div className="section-header">
        <h3>Projets récents</h3>
        <Link to="/utilisateur/projets" className="view-all">Voir tout →</Link>
      </div>
      <div className="projects-list">
        {projects.map(project => (
          <div key={project.id} className="project-item" onClick={() => onViewProject(project.id)}>
            <div className="project-info">
              <div className="project-name">{project.nom}</div>
              <div className="project-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${project.progression}%` }}></div>
                </div>
                <span className="progress-text">{project.progression}%</span>
              </div>
            </div>
            <div className="project-status">
              <span className={`status-badge ${project.statut.toLowerCase()}`}>
                {project.statut}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant pour les tâches prioritaires
export const PriorityTasks = ({ tasks, onToggleTask, onViewTask }) => {
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Haute': return '#ef476f';
      case 'Moyenne': return '#ff9e00';
      default: return '#06d6a0';
    }
  };

  return (
    <div className="priority-tasks">
      <div className="section-header">
        <h3>Tâches prioritaires</h3>
        <Link to="/utilisateur/taches" className="view-all">Voir tout →</Link>
      </div>
      <div className="tasks-list">
        {tasks.map(task => (
          <div key={task.id} className="task-item">
            <div className="task-checkbox">
              <input 
                type="checkbox" 
                checked={task.completed}
                onChange={() => onToggleTask(task.id)}
              />
            </div>
            <div className="task-content" onClick={() => onViewTask(task.id)}>
              <div className={`task-title ${task.completed ? 'completed' : ''}`}>
                {task.titre}
              </div>
              <div className="task-meta">
                <span className="task-project">{task.projet}</span>
                <span className="task-date">📅 {task.dateEcheance}</span>
              </div>
            </div>
            <div className="task-priority" style={{ backgroundColor: getPriorityColor(task.priorite) }}>
              {task.priorite}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant pour le calendrier
export const MiniCalendar = ({ events, onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const changeMonth = (delta) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const hasEvent = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.some(e => e.date === dateStr);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedDate === dateStr;
      const hasEventToday = hasEvent(day);
      
      days.push(
        <div 
          key={day} 
          className={`calendar-day ${isSelected ? 'selected' : ''} ${hasEventToday ? 'has-event' : ''}`}
          onClick={() => {
            setSelectedDate(dateStr);
            onDateSelect(dateStr);
          }}
        >
          {day}
          {hasEventToday && <div className="event-dot"></div>}
        </div>
      );
    }

    return days;
  };

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="mini-calendar">
      <div className="calendar-header">
        <button onClick={() => changeMonth(-1)} className="calendar-nav">←</button>
        <h4>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h4>
        <button onClick={() => changeMonth(1)} className="calendar-nav">→</button>
      </div>
      <div className="calendar-weekdays">
        {dayNames.map(day => <div key={day} className="weekday">{day}</div>)}
      </div>
      <div className="calendar-days">
        {renderCalendar()}
      </div>
    </div>
  );
};

// Composant pour les activités récentes
export const RecentActivities = ({ activities }) => {
  const getActivityIcon = (type) => {
    switch(type) {
      case 'task': return '✅';
      case 'project': return '📁';
      case 'comment': return '💬';
      case 'file': return '📎';
      default: return '📌';
    }
  };

  return (
    <div className="recent-activities">
      <div className="section-header">
        <h3>Activités récentes</h3>
      </div>
      <div className="activities-list">
        {activities.map(activity => (
          <div key={activity.id} className="activity-item">
            <div className="activity-icon">{getActivityIcon(activity.type)}</div>
            <div className="activity-content">
              <p>{activity.description}</p>
              <span className="activity-time">{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant pour les badges et achievements
export const BadgesSection = ({ badges }) => {
  return (
    <div className="badges-section">
      <div className="section-header">
        <h3>Mes badges</h3>
        <Link to="/utilisateur/badges" className="view-all">Voir tout →</Link>
      </div>
      <div className="badges-list">
        {badges.map(badge => (
          <div key={badge.id} className="badge-item">
            <div className="badge-icon" style={{ backgroundColor: badge.color }}>
              {badge.icon}
            </div>
            <div className="badge-info">
              <div className="badge-name">{badge.nom}</div>
              <div className="badge-date">Obtenu le {badge.dateObtention}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant pour les rapports rapides
export const QuickReports = ({ reports, onGenerate }) => {
  const reportTypes = [
    { id: 'weekly', name: 'Rapport hebdomadaire', icon: '📊' },
    { id: 'monthly', name: 'Rapport mensuel', icon: '📈' },
    { id: 'project', name: 'Rapport projet', icon: '📁' },
    { id: 'time', name: 'Rapport temps', icon: '⏰' }
  ];

  return (
    <div className="quick-reports">
      <div className="section-header">
        <h3>Rapports rapides</h3>
      </div>
      <div className="reports-list">
        {reportTypes.map(report => (
          <button 
            key={report.id} 
            className="report-button"
            onClick={() => onGenerate(report.id)}
          >
            <span>{report.icon}</span>
            {report.name}
          </button>
        ))}
      </div>
    </div>
  );
};

// Composant pour l'intégration K-Chat
export const KChatIntegration = ({ messages, onSendMessage }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage('');
    }
  };

  return (
    <div className={`kchat-integration ${isOpen ? 'open' : ''}`}>
      <div className="kchat-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="kchat-title">
          <span>💬</span>
          <span>K-Chat</span>
        </div>
        <button className="kchat-toggle">{isOpen ? '−' : '+'}</button>
      </div>
      {isOpen && (
        <>
          <div className="kchat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div className="message-bubble">{msg.text}</div>
                <div className="message-time">{msg.time}</div>
              </div>
            ))}
          </div>
          <div className="kchat-input">
            <input 
              type="text" 
              placeholder="Écrivez votre message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend}>Envoyer</button>
          </div>
        </>
      )}
    </div>
  );
};