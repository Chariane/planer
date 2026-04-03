import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../../styles/AdminLayout.css';

// Composant pour les statistiques globales
export const AdminStatsCards = ({ stats, onRefresh }) => {
  const statCards = [
    { 
      title: 'Utilisateurs', 
      value: stats.totalUtilisateurs, 
      change: '+12%', 
      icon: '👥', 
      color: '#4361ee',
      trend: 'up'
    },
    { 
      title: 'Entreprises', 
      value: stats.totalEntreprises, 
      change: '+5%', 
      icon: '🏢', 
      color: '#7209b7',
      trend: 'up'
    },
    { 
      title: 'Projets', 
      value: stats.totalProjets, 
      change: '+8%', 
      icon: '📁', 
      color: '#06d6a0',
      trend: 'up'
    },
    { 
      title: 'Abonnements Premium', 
      value: stats.abonnementsActifs, 
      change: '+3', 
      icon: '💎', 
      color: '#ff9e00',
      trend: 'up'
    },
    { 
      title: 'Workspaces', 
      value: stats.totalWorkspaces, 
      change: '+15%', 
      icon: '🏗️', 
      color: '#ef476f',
      trend: 'up'
    },
    { 
      title: 'Revenus (mois)', 
      value: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(stats.revenusMois), 
      change: '+18%', 
      icon: '💰', 
      color: '#00b4d8',
      trend: 'up'
    }
  ];

  return (
    <div className="admin-stats-cards">
      {statCards.map((card, index) => (
        <div key={index} className="stat-card">
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: card.color }}>
              {card.icon}
            </div>
            <button className="stat-refresh" onClick={onRefresh}>⟳</button>
          </div>
          <div className="stat-body">
            <div className="stat-value">{card.value}</div>
            <div className="stat-title">{card.title}</div>
            <div className={`stat-change ${card.trend}`}>
              {card.change} vs mois dernier
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Composant pour le graphique d'activité
export const ActivityChart = ({ data, period, onPeriodChange }) => {
  const [hoveredBar, setHoveredBar] = useState(null);
  
  const maxValue = Math.max(...data.map(d => d.value));
  
  const periods = ['Journalier', 'Hebdomadaire', 'Mensuel', 'Annuel'];

  return (
    <div className="activity-chart">
      <div className="chart-header">
        <h3>Activité de la plateforme</h3>
        <div className="chart-periods">
          {periods.map(p => (
            <button 
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => onPeriodChange(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-container">
        <div className="chart-bars">
          {data.map((item, index) => (
            <div 
              key={index} 
              className="chart-bar-wrapper"
              onMouseEnter={() => setHoveredBar(index)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              <div 
                className="chart-bar"
                style={{ 
                  height: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: hoveredBar === index ? '#4361ee' : '#7209b7'
                }}
              >
                {hoveredBar === index && (
                  <div className="chart-tooltip">
                    {item.value} utilisateurs
                  </div>
                )}
              </div>
              <div className="chart-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Composant pour la liste des utilisateurs récents
export const RecentUsersTable = ({ users, onViewUser, onEditUser, onSuspendUser }) => {
  const getStatusBadge = (status) => {
    switch(status) {
      case 'Actif': return <span className="status-badge active">✓ Actif</span>;
      case 'Suspendu': return <span className="status-badge suspended">⛔ Suspendu</span>;
      case 'Premium': return <span className="status-badge premium">⭐ Premium</span>;
      default: return <span className="status-badge default">{status}</span>;
    }
  };

  return (
    <div className="recent-users">
      <div className="section-header">
        <h3>Derniers utilisateurs inscrits</h3>
        <Link to="/admin/utilisateurs" className="view-all">Voir tout →</Link>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Email</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar small">{user.avatar}</div>
                    <div>
                      <div className="user-name">{user.prenoms} {user.nom}</div>
                      <div className="user-username">@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>{user.type_compte}</td>
                <td>{getStatusBadge(user.statut)}</td>
                <td>{new Date(user.date_creation).toLocaleDateString('fr-FR')}</td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => onViewUser(user.id)} className="action-btn view" title="Voir">👁️</button>
                    <button onClick={() => onEditUser(user.id)} className="action-btn edit" title="Modifier">✏️</button>
                    <button onClick={() => onSuspendUser(user.id)} className="action-btn suspend" title="Suspendre">⛔</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Composant pour les entreprises récentes
export const RecentCompaniesTable = ({ companies, onViewCompany, onEditCompany }) => {
  return (
    <div className="recent-companies">
      <div className="section-header">
        <h3>Dernières entreprises inscrites</h3>
        <Link to="/admin/entreprises" className="view-all">Voir tout →</Link>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Responsable</th>
              <th>Contact</th>
              <th>Abonnement</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(company => (
              <tr key={company.id}>
                <td>
                  <div className="company-cell">
                    <div className="company-logo small">{company.logo}</div>
                    <div>
                      <div className="company-name">{company.nom}</div>
                      <div className="company-ifu">IFU: {company.numero_ifu}</div>
                    </div>
                  </div>
                </td>
                <td>{company.responsable}</td>
                <td>
                  <div>{company.telephone}</div>
                  <div className="company-email">{company.email}</div>
                </td>
                <td>
                  {company.is_premium ? (
                    <span className="premium-badge-small">⭐ Premium</span>
                  ) : (
                    <span className="free-badge">Gratuit</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${company.statut_compte.toLowerCase()}`}>
                    {company.statut_compte}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => onViewCompany(company.id)} className="action-btn view">👁️</button>
                    <button onClick={() => onEditCompany(company.id)} className="action-btn edit">✏️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Composant pour les abonnements
export const SubscriptionsList = ({ subscriptions, onRenew, onCancel }) => {
  const getExpiryStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Expiré', class: 'expired' };
    if (diffDays < 7) return { text: 'Expire bientôt', class: 'expiring' };
    return { text: 'Actif', class: 'active' };
  };

  return (
    <div className="subscriptions-list">
      <div className="section-header">
        <h3>Abonnements récents</h3>
        <Link to="/admin/abonnements" className="view-all">Gérer →</Link>
      </div>
      <div className="subscriptions-grid">
        {subscriptions.map(sub => {
          const expiryStatus = getExpiryStatus(sub.date_fin);
          return (
            <div key={sub.id} className="subscription-card">
              <div className="subscription-header">
                <div className="company-info">
                  <div className="company-logo small">{sub.logo}</div>
                  <div>
                    <div className="company-name">{sub.entreprise}</div>
                    <div className="plan-name">{sub.plan}</div>
                  </div>
                </div>
                <div className={`expiry-badge ${expiryStatus.class}`}>
                  {expiryStatus.text}
                </div>
              </div>
              <div className="subscription-details">
                <div className="detail-item">
                  <span>Montant:</span>
                  <strong>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(sub.montant)}</strong>
                </div>
                <div className="detail-item">
                  <span>Début:</span>
                  <span>{new Date(sub.date_debut).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="detail-item">
                  <span>Fin:</span>
                  <span>{new Date(sub.date_fin).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="detail-item">
                  <span>Auto-renouvellement:</span>
                  <span>{sub.auto_renouvellement ? '✅ Oui' : '❌ Non'}</span>
                </div>
              </div>
              <div className="subscription-actions">
                <button onClick={() => onRenew(sub.id)} className="btn-renew">Renouveler</button>
                <button onClick={() => onCancel(sub.id)} className="btn-cancel">Annuler</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Composant pour les paiements récents
export const RecentPaymentsTable = ({ payments, onViewPayment }) => {
  const getStatusBadge = (status) => {
    switch(status) {
      case 'Reussi': return <span className="payment-status success">✓ Réussi</span>;
      case 'En attente': return <span className="payment-status pending">⏳ En attente</span>;
      case 'Echoue': return <span className="payment-status failed">✗ Échoué</span>;
      default: return <span className="payment-status default">{status}</span>;
    }
  };

  return (
    <div className="recent-payments">
      <div className="section-header">
        <h3>Derniers paiements</h3>
        <Link to="/admin/paiements" className="view-all">Voir tout →</Link>
      </div>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Référence</th>
              <th>Entreprise</th>
              <th>Montant</th>
              <th>Mode</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <tr key={payment.id}>
                <td className="payment-ref">{payment.reference}</td>
                <td>{payment.entreprise}</td>
                <td className="payment-amount">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(payment.montant)}
                </td>
                <td>{payment.mode_paiement}</td>
                <td>{getStatusBadge(payment.statut)}</td>
                <td>{new Date(payment.created_at).toLocaleDateString('fr-FR')}</td>
                <td>
                  <button onClick={() => onViewPayment(payment.id)} className="action-btn view">👁️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Composant pour les logs système
export const SystemLogs = ({ logs, onFilter, onExport }) => {
  const [filter, setFilter] = useState('all');
  const logTypes = ['all', 'info', 'warning', 'error', 'success'];

  const getLogIcon = (type) => {
    switch(type) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return '📝';
    }
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.type === filter);

  return (
    <div className="system-logs">
      <div className="section-header">
        <h3>Logs système</h3>
        <div className="log-actions">
          <div className="log-filters">
            {logTypes.map(type => (
              <button 
                key={type}
                className={`filter-btn ${filter === type ? 'active' : ''}`}
                onClick={() => setFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>
          <button onClick={onExport} className="export-btn">📥 Exporter</button>
        </div>
      </div>
      <div className="logs-list">
        {filteredLogs.map(log => (
          <div key={log.id} className={`log-item ${log.type}`}>
            <div className="log-icon">{getLogIcon(log.type)}</div>
            <div className="log-content">
              <div className="log-message">{log.message}</div>
              <div className="log-meta">
                <span className="log-user">{log.utilisateur}</span>
                <span className="log-time">{log.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant pour les notifications système
export const SystemNotifications = ({ notifications, onDismiss }) => {
  const [showAll, setShowAll] = useState(false);
  const displayedNotifs = showAll ? notifications : notifications.slice(0, 5);

  return (
    <div className="system-notifications">
      <div className="section-header">
        <h3>Notifications système</h3>
        {notifications.length > 5 && (
          <button onClick={() => setShowAll(!showAll)} className="view-all">
            {showAll ? 'Voir moins' : 'Voir tout'}
          </button>
        )}
      </div>
      <div className="notifications-list">
        {displayedNotifs.map(notif => (
          <div key={notif.id} className={`notif-item ${notif.type}`}>
            <div className="notif-icon">
              {notif.type === 'success' && '✅'}
              {notif.type === 'warning' && '⚠️'}
              {notif.type === 'error' && '❌'}
              {notif.type === 'info' && 'ℹ️'}
            </div>
            <div className="notif-content">
              <div className="notif-message">{notif.message}</div>
              <div className="notif-time">{notif.time}</div>
            </div>
            <button onClick={() => onDismiss(notif.id)} className="notif-dismiss">✗</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant pour l'export de données
export const DataExport = ({ onExport, formats }) => {
  const [selectedFormat, setSelectedFormat] = useState('csv');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [dataType, setDataType] = useState('users');

  return (
    <div className="data-export">
      <h3>Exporter les données</h3>
      <div className="export-form">
        <div className="form-group">
          <label>Type de données</label>
          <select value={dataType} onChange={(e) => setDataType(e.target.value)}>
            <option value="users">Utilisateurs</option>
            <option value="companies">Entreprises</option>
            <option value="payments">Paiements</option>
            <option value="subscriptions">Abonnements</option>
          </select>
        </div>
        <div className="form-group">
          <label>Format</label>
          <div className="format-buttons">
            {formats.map(format => (
              <button 
                key={format}
                className={`format-btn ${selectedFormat === format ? 'active' : ''}`}
                onClick={() => setSelectedFormat(format)}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Période</label>
          <div className="date-range">
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              placeholder="Date début"
            />
            <span>à</span>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              placeholder="Date fin"
            />
          </div>
        </div>
        <button className="export-submit" onClick={() => onExport(dataType, selectedFormat, dateRange)}>
          📥 Exporter maintenant
        </button>
      </div>
    </div>
  );
};