import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../../../styles/EntrepriseLayout.css';

// Composant pour les cartes de statistiques premium
export const PremiumStatsCards = ({ stats }) => {
  const statCards = [
    { title: 'Membres actifs', value: stats.membresActifs, icon: '👥', color: '#4361ee', trend: '+12%' },
    { title: 'Projets en cours', value: stats.projetsEnCours, icon: '📁', color: '#7209b7', trend: '+5%' },
    { title: 'Tâches terminées', value: stats.tachesTerminees, icon: '✅', color: '#06d6a0', trend: '+23%' },
    { title: 'Heures travaillées', value: `${stats.heuresTravaillees}h`, icon: '⏰', color: '#ff9e00', trend: '+8%' },
    { title: 'Espaces utilisés', value: stats.espacesUtilises, icon: '🏗️', color: '#ef476f', trend: '+2' },
    { title: 'API calls', value: stats.apiCallsMois, icon: '🔌', color: '#00b4d8', trend: '+45%' }
  ];

  return (
    <div className="premium-stats-cards">
      {statCards.map((card, index) => (
        <div key={index} className="stat-card premium-stat">
          <div className="stat-header">
            <div className="stat-icon" style={{ backgroundColor: card.color }}>
              {card.icon}
            </div>
            <div className="stat-trend">{card.trend}</div>
          </div>
          <div className="stat-body">
            <div className="stat-value">{card.value}</div>
            <div className="stat-title">{card.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Composant pour le graphique d'activité premium
export const PremiumActivityChart = ({ data, onExport }) => {
  const [chartType, setChartType] = useState('bar');
  const [period, setPeriod] = useState('weekly');

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="premium-activity-chart">
      <div className="chart-header">
        <h3>📊 Activité en temps réel</h3>
        <div className="chart-controls">
          <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
            <option value="bar">Barres</option>
            <option value="line">Lignes</option>
            <option value="area">Aires</option>
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="daily">Journalier</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="monthly">Mensuel</option>
            <option value="yearly">Annuel</option>
          </select>
          <button onClick={onExport} className="export-chart-btn">📥 Exporter</button>
        </div>
      </div>
      <div className="chart-container">
        <div className="chart-bars premium-chart">
          {data.map((item, index) => (
            <div key={index} className="chart-bar-wrapper">
              <div 
                className="chart-bar premium-bar"
                style={{ 
                  height: `${(item.value / maxValue) * 100}%`,
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div className="chart-tooltip">
                  {item.value} activités
                </div>
              </div>
              <div className="chart-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Composant pour la gestion d'équipe premium
export const TeamManagement = ({ members, onAddMember, onRemoveMember, onEditRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.prenoms.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role) => {
    switch(role) {
      case 'Administrateur': return <span className="role-badge admin">👑 Admin</span>;
      case 'Chef de projet': return <span className="role-badge manager">📊 Manager</span>;
      case 'Membre': return <span className="role-badge member">👤 Membre</span>;
      default: return <span className="role-badge guest">👋 Invité</span>;
    }
  };

  return (
    <div className="team-management">
      <div className="section-header">
        <h3>👥 Gestion de l'équipe</h3>
        <button onClick={onAddMember} className="btn-primary">+ Ajouter un membre</button>
      </div>
      
      <div className="team-filters">
        <div className="search-box">
          <input 
            type="text" 
            placeholder="Rechercher un membre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        <div className="role-filters">
          <button className={`filter-chip ${roleFilter === 'all' ? 'active' : ''}`} onClick={() => setRoleFilter('all')}>
            Tous
          </button>
          <button className={`filter-chip ${roleFilter === 'Administrateur' ? 'active' : ''}`} onClick={() => setRoleFilter('Administrateur')}>
            Administrateurs
          </button>
          <button className={`filter-chip ${roleFilter === 'Chef de projet' ? 'active' : ''}`} onClick={() => setRoleFilter('Chef de projet')}>
            Chefs de projet
          </button>
          <button className={`filter-chip ${roleFilter === 'Membre' ? 'active' : ''}`} onClick={() => setRoleFilter('Membre')}>
            Membres
          </button>
        </div>
      </div>

      <div className="team-grid">
        {filteredMembers.map(member => (
          <div key={member.id} className="member-card">
            <div className="member-avatar">
              {member.avatar}
              <div className="member-status online"></div>
            </div>
            <div className="member-info">
              <div className="member-name">{member.prenoms} {member.nom}</div>
              <div className="member-email">{member.email}</div>
              <div className="member-role">{getRoleBadge(member.role)}</div>
            </div>
            <div className="member-actions">
              <button onClick={() => onEditRole(member.id)} className="action-icon" title="Modifier rôle">✏️</button>
              <button onClick={() => onRemoveMember(member.id)} className="action-icon danger" title="Retirer">🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant pour les rapports personnalisés premium
export const PremiumReports = ({ reports, onGenerate, onExport }) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [format, setFormat] = useState('pdf');

  const reportTypes = [
    { id: 'productivity', name: 'Rapport de productivité', icon: '📈', description: 'Analyse détaillée de la productivité' },
    { id: 'time', name: 'Rapport de temps', icon: '⏰', description: 'Suivi du temps de travail' },
    { id: 'projects', name: 'Rapport projets', icon: '📁', description: 'État d\'avancement des projets' },
    { id: 'team', name: 'Rapport équipe', icon: '👥', description: 'Performance de l\'équipe' },
    { id: 'financial', name: 'Rapport financier', icon: '💰', description: 'Analyse financière' },
    { id: 'custom', name: 'Rapport personnalisé', icon: '⚙️', description: 'Créez votre rapport' }
  ];

  return (
    <div className="premium-reports">
      <div className="section-header">
        <h3>📄 Rapports personnalisés</h3>
        <button onClick={onGenerate} className="btn-primary">+ Nouveau rapport</button>
      </div>

      <div className="reports-layout">
        <div className="report-types">
          {reportTypes.map(report => (
            <div 
              key={report.id} 
              className={`report-type-card ${selectedReport === report.id ? 'selected' : ''}`}
              onClick={() => setSelectedReport(report.id)}
            >
              <div className="report-icon">{report.icon}</div>
              <div className="report-info">
                <div className="report-name">{report.name}</div>
                <div className="report-desc">{report.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="report-config">
          <h4>Configuration du rapport</h4>
          <div className="config-group">
            <label>Période</label>
            <div className="date-range">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
              <span>à</span>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
          </div>
          <div className="config-group">
            <label>Format d'export</label>
            <div className="format-selector">
              <button className={`format-option ${format === 'pdf' ? 'active' : ''}`} onClick={() => setFormat('pdf')}>
                PDF
              </button>
              <button className={`format-option ${format === 'excel' ? 'active' : ''}`} onClick={() => setFormat('excel')}>
                Excel
              </button>
              <button className={`format-option ${format === 'csv' ? 'active' : ''}`} onClick={() => setFormat('csv')}>
                CSV
              </button>
              <button className={`format-option ${format === 'json' ? 'active' : ''}`} onClick={() => setFormat('json')}>
                JSON
              </button>
            </div>
          </div>
          <button className="generate-report-btn" onClick={() => onExport(selectedReport, dateRange, format)}>
            📊 Générer et exporter
          </button>
        </div>
      </div>

      <div className="recent-reports">
        <h4>Rapports récents</h4>
        <div className="reports-list">
          {reports.map(report => (
            <div key={report.id} className="report-item">
              <div className="report-info">
                <div className="report-title">{report.titre}</div>
                <div className="report-meta">
                  <span>📅 {new Date(report.date).toLocaleDateString('fr-FR')}</span>
                  <span>👤 {report.auteur}</span>
                </div>
              </div>
              <div className="report-actions">
                <button onClick={() => onExport(report.id)} className="action-icon">📥</button>
                <button className="action-icon">👁️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Composant pour les intégrations API premium
export const APIIntegrations = ({ integrations, onConnect, onDisconnect }) => {
  const availableIntegrations = [
    { id: 'slack', name: 'Slack', icon: '💬', description: 'Notifications en temps réel', color: '#4A154B' },
    { id: 'teams', name: 'Microsoft Teams', icon: '👥', description: 'Collaboration', color: '#6264A7' },
    { id: 'google', name: 'Google Workspace', icon: '📧', description: 'Calendar & Drive', color: '#4285F4' },
    { id: 'zoom', name: 'Zoom', icon: '🎥', description: 'Visioconférences', color: '#2D8CFF' },
    { id: 'github', name: 'GitHub', icon: '🐙', description: 'Code & versions', color: '#181717' },
    { id: 'jira', name: 'Jira', icon: '🎯', description: 'Suivi de tickets', color: '#0052CC' },
    { id: 'webhook', name: 'Webhooks', icon: '🔌', description: 'Personnalisé', color: '#00B4D8' },
    { id: 'api', name: 'API REST', icon: '⚡', description: 'Accès complet', color: '#7209B7' }
  ];

  return (
    <div className="api-integrations">
      <div className="section-header">
        <h3>🔌 Intégrations & API</h3>
        <div className="api-stats">
          <span className="api-call-count">📊 {integrations.filter(i => i.active).length} actives</span>
          <span className="api-limit">🔒 100k calls/mois</span>
        </div>
      </div>

      <div className="integrations-grid">
        {availableIntegrations.map(integration => {
          const isConnected = integrations.find(i => i.id === integration.id)?.active;
          return (
            <div key={integration.id} className="integration-card">
              <div className="integration-icon" style={{ backgroundColor: integration.color }}>
                {integration.icon}
              </div>
              <div className="integration-info">
                <div className="integration-name">{integration.name}</div>
                <div className="integration-desc">{integration.description}</div>
              </div>
              <div className="integration-status">
                {isConnected ? (
                  <button onClick={() => onDisconnect(integration.id)} className="status-badge connected">
                    ✓ Connecté
                  </button>
                ) : (
                  <button onClick={() => onConnect(integration.id)} className="status-badge disconnected">
                    + Connecter
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="api-documentation">
        <div className="api-doc-header">
          <h4>📖 Documentation API</h4>
          <button className="btn-secondary">Voir la documentation</button>
        </div>
        <div className="api-keys-section">
          <div className="api-key-item">
            <label>Clé API publique</label>
            <div className="api-key-value">
              <code>pk_live_xxxxxxxxxxxxx</code>
              <button className="copy-btn">📋</button>
            </div>
          </div>
          <div className="api-key-item">
            <label>Clé API secrète</label>
            <div className="api-key-value">
              <code>sk_live_•••••••••••••</code>
              <button className="copy-btn">📋</button>
              <button className="regenerate-btn">⟳ Régénérer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant pour l'automation premium
export const AutomationWorkflows = ({ workflows, onCreate, onEdit, onToggle }) => {
  const [selectedTrigger, setSelectedTrigger] = useState('task_completed');
  const [selectedAction, setSelectedAction] = useState('send_notification');

  const triggers = [
    { id: 'task_completed', name: 'Tâche terminée', icon: '✅' },
    { id: 'project_started', name: 'Projet démarré', icon: '🚀' },
    { id: 'deadline_approaching', name: 'Échéance approche', icon: '⏰' },
    { id: 'member_joined', name: 'Membre rejoint', icon: '👥' }
  ];

  const actions = [
    { id: 'send_notification', name: 'Envoyer notification', icon: '🔔' },
    { id: 'send_email', name: 'Envoyer email', icon: '📧' },
    { id: 'create_task', name: 'Créer tâche', icon: '✅' },
    { id: 'call_webhook', name: 'Appeler webhook', icon: '🔌' }
  ];

  return (
    <div className="automation-workflows">
      <div className="section-header">
        <h3>🤖 Workflows d'automatisation</h3>
        <button onClick={onCreate} className="btn-primary">+ Créer workflow</button>
      </div>

      <div className="workflow-creator">
        <h4>Créer une automatisation</h4>
        <div className="workflow-builder">
          <div className="builder-step">
            <span className="step-number">1</span>
            <span>Quand</span>
            <select value={selectedTrigger} onChange={(e) => setSelectedTrigger(e.target.value)}>
              {triggers.map(trigger => (
                <option key={trigger.id} value={trigger.id}>
                  {trigger.icon} {trigger.name}
                </option>
              ))}
            </select>
          </div>
          <div className="builder-arrow">→</div>
          <div className="builder-step">
            <span className="step-number">2</span>
            <span>Alors</span>
            <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
              {actions.map(action => (
                <option key={action.id} value={action.id}>
                  {action.icon} {action.name}
                </option>
              ))}
            </select>
          </div>
          <button className="create-workflow-btn">Créer</button>
        </div>
      </div>

      <div className="workflows-list">
        <h4>Workflows actifs</h4>
        {workflows.map(workflow => (
          <div key={workflow.id} className="workflow-item">
            <div className="workflow-info">
              <div className="workflow-trigger">
                <span className="workflow-icon">⚡</span>
                <span>Quand {workflow.trigger}</span>
              </div>
              <div className="workflow-arrow">→</div>
              <div className="workflow-action">
                <span>Alors {workflow.action}</span>
              </div>
            </div>
            <div className="workflow-stats">
              <span>Exécuté {workflow.executions} fois</span>
              <span>Dernière exécution: {workflow.last_execution}</span>
            </div>
            <div className="workflow-controls">
              <label className="switch">
                <input type="checkbox" checked={workflow.active} onChange={() => onToggle(workflow.id)} />
                <span className="slider"></span>
              </label>
              <button onClick={() => onEdit(workflow.id)} className="action-icon">✏️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant pour l'export massif premium
export const BulkExport = ({ onExport, exportHistory }) => {
  const [exportType, setExportType] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [format, setFormat] = useState('zip');

  const exportOptions = [
    { id: 'all', name: 'Export complet', icon: '📦', description: 'Toutes les données de l\'entreprise' },
    { id: 'projects', name: 'Projets', icon: '📁', description: 'Projets et tâches' },
    { id: 'team', name: 'Équipe', icon: '👥', description: 'Membres et rôles' },
    { id: 'time', name: 'Temps', icon: '⏰', description: 'Suivi du temps' },
    { id: 'reports', name: 'Rapports', icon: '📄', description: 'Tous les rapports' }
  ];

  return (
    <div className="bulk-export">
      <div className="section-header">
        <h3>📦 Export massif des données</h3>
        <div className="export-info">
          <span>💾 Dernier export: {exportHistory[0]?.date || 'Jamais'}</span>
        </div>
      </div>

      <div className="export-options">
        {exportOptions.map(option => (
          <div 
            key={option.id} 
            className={`export-option ${exportType === option.id ? 'selected' : ''}`}
            onClick={() => setExportType(option.id)}
          >
            <div className="export-icon">{option.icon}</div>
            <div className="export-details">
              <div className="export-name">{option.name}</div>
              <div className="export-desc">{option.description}</div>
            </div>
            <div className="export-radio">
              <div className={`radio ${exportType === option.id ? 'selected' : ''}`}></div>
            </div>
          </div>
        ))}
      </div>

      <div className="export-config">
        <div className="config-row">
          <div className="config-group">
            <label>Période</label>
            <div className="date-range">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
              <span>à</span>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
          </div>
          <div className="config-group">
            <label>Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="zip">ZIP (recommandé)</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
        </div>
        <div className="config-row">
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={includeAttachments} 
              onChange={(e) => setIncludeAttachments(e.target.checked)}
            />
            Inclure les pièces jointes et fichiers
          </label>
        </div>
      </div>

      <button className="export-now-btn" onClick={() => onExport(exportType, dateRange, format, includeAttachments)}>
        📥 Démarrer l'export maintenant
      </button>

      <div className="export-history">
        <h4>Historique des exports</h4>
        <div className="history-list">
          {exportHistory.map(export_item => (
            <div key={export_item.id} className="history-item">
              <div className="history-info">
                <span className="history-type">{export_item.type}</span>
                <span className="history-date">{export_item.date}</span>
                <span className="history-size">{export_item.size}</span>
              </div>
              <div className="history-actions">
                <button className="download-btn">📥 Télécharger</button>
                <button className="delete-btn">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};