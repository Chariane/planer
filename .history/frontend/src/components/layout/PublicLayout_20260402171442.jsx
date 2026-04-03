import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PublicLayout.css';

// Composant pour les cartes de statistiques
const StatCard = ({ title, value, change, icon }) => {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        {change && <div className="stat-change">{change}</div>}
      </div>
    </div>
  );
};

// Composant pour les cartes de projet
const ProjectCard = ({ project, onViewProject }) => {
  const getProgressColor = (progress) => {
    if (progress >= 75) return '#06d6a0';
    if (progress >= 50) return '#ff9e00';
    return '#ef476f';
  };

  return (
    <div className="project-card" onClick={() => onViewProject(project.id)}>
      <div className="project-header">
        <div className="project-title">{project.name}</div>
        <div className="project-badge" style={{ background: project.priority === 'high' ? '#ffe5e5' : '#e3f2fd', color: project.priority === 'high' ? '#ef476f' : '#4361ee' }}>
          {project.priority === 'high' ? 'Haute priorité' : project.priority === 'medium' ? 'Priorité moyenne' : 'Priorité basse'}
        </div>
      </div>
      <p className="project-description">{project.description}</p>
      <div className="project-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${project.progress}%`, background: getProgressColor(project.progress) }}
          ></div>
        </div>
        <div className="progress-text">{project.progress}%</div>
      </div>
      <div className="project-footer">
        <span>📅 {formatDate(project.dueDate)}</span>
        <span>✓ {project.tasks?.filter(t => t.completed).length || 0}/{project.tasks?.length || 0} tâches</span>
      </div>
    </div>
  );
};

// Composant pour les éléments de tâche
const TaskItem = ({ task, projectName, onToggleTask }) => {
  return (
    <div className="task-item">
      <div className="task-info">
        <input 
          type="checkbox" 
          checked={task.completed} 
          onChange={() => onToggleTask(task.id)}
          className="task-checkbox"
        />
        <div>
          <div className={`task-title ${task.completed ? 'completed' : ''}`}>
            {task.title}
          </div>
          <div className="task-date">
            📅 {formatDate(task.dueDate)} | 📁 {projectName}
          </div>
        </div>
      </div>
      <div className={`task-priority priority-${task.priority}`}>
        {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
      </div>
    </div>
  );
};

// Composant modal
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

// Fonction utilitaire pour formater les dates
const formatDate = (dateString) => {
  if (!dateString) return "Non définie";
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Composant principal PublicLayout
const PublicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingTasks: 0,
    members: 24,
    hoursWorked: 156
  });
  
  // États pour les modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  
  // États pour les formulaires
  const [newProject, setNewProject] = useState({ name: '', description: '', dueDate: '', priority: 'medium' });
  const [newTask, setNewTask] = useState({ title: '', projectId: '', dueDate: '', priority: 'medium' });
  const [newTimeOff, setNewTimeOff] = useState({ type: 'vacation', start: '', end: '', reason: '' });

  // Chargement des données initiales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Mise à jour des statistiques
  useEffect(() => {
    updateStats();
  }, [projects, tasks]);

  const loadInitialData = () => {
    // Données simulées
    const initialProjects = [
      { 
        id: 1, 
        name: "Application Mobile K-PLANER", 
        description: "Développement de l'application mobile complète", 
        dueDate: "2024-12-31", 
        priority: "high", 
        progress: 65,
        tasks: [1, 2]
      },
      { 
        id: 2, 
        name: "Site Web Corporate", 
        description: "Refonte complète du site web corporate", 
        dueDate: "2024-11-15", 
        priority: "medium", 
        progress: 40,
        tasks: [3]
      },
      { 
        id: 3, 
        name: "Dashboard Analytics", 
        description: "Création du dashboard analytique", 
        dueDate: "2024-10-30", 
        priority: "high", 
        progress: 85,
        tasks: [4]
      }
    ];

    const initialTasks = [
      { id: 1, title: "Concevoir l'interface utilisateur", projectId: 1, dueDate: "2024-10-20", priority: "high", completed: false },
      { id: 2, title: "Implémenter l'API REST", projectId: 1, dueDate: "2024-10-25", priority: "high", completed: false },
      { id: 3, title: "Tester les fonctionnalités", projectId: 2, dueDate: "2024-11-10", priority: "medium", completed: false },
      { id: 4, title: "Rédiger la documentation", projectId: 3, dueDate: "2024-10-28", priority: "low", completed: true }
    ];

    const initialTimeOff = [
      { id: 1, type: "vacation", start: "2024-11-01", end: "2024-11-07", reason: "Vacances d'automne", status: "pending" }
    ];

    setProjects(initialProjects);
    setTasks(initialTasks);
    setTimeOffRequests(initialTimeOff);
  };

  const updateStats = () => {
    const activeProjects = projects.length;
    const pendingTasks = tasks.filter(t => !t.completed).length;
    setStats({ ...stats, activeProjects, pendingTasks });
  };

  const handleCreateProject = () => {
    if (!newProject.name) {
      alert("Veuillez entrer un nom de projet");
      return;
    }

    const project = {
      id: projects.length + 1,
      ...newProject,
      progress: 0,
      tasks: []
    };

    setProjects([...projects, project]);
    setIsProjectModalOpen(false);
    setNewProject({ name: '', description: '', dueDate: '', priority: 'medium' });
    
    // Notification
    console.log(`Projet créé: ${project.name}`);
  };

  const handleCreateTask = () => {
    if (!newTask.title) {
      alert("Veuillez entrer un titre de tâche");
      return;
    }

    const task = {
      id: tasks.length + 1,
      ...newTask,
      completed: false
    };

    setTasks([...tasks, task]);
    setIsTaskModalOpen(false);
    setNewTask({ title: '', projectId: '', dueDate: '', priority: 'medium' });
    
    console.log(`Tâche créée: ${task.title}`);
  };

  const handleToggleTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const handleRequestTimeOff = () => {
    if (!newTimeOff.start || !newTimeOff.end) {
      alert("Veuillez sélectionner les dates");
      return;
    }

    const request = {
      id: timeOffRequests.length + 1,
      ...newTimeOff,
      status: "pending"
    };

    setTimeOffRequests([...timeOffRequests, request]);
    setIsTimeOffModalOpen(false);
    setNewTimeOff({ type: 'vacation', start: '', end: '', reason: '' });
    
    console.log(`Demande de congé envoyée: ${request.type}`);
  };

  const handleViewProject = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  // Composant pour chaque page (simplifié pour l'exemple)
  const renderDashboard = () => (
    <>
      <div className="stats-grid">
        <StatCard title="Projets actifs" value={stats.activeProjects} change="+2 cette semaine" icon="📊" />
        <StatCard title="Tâches en cours" value={stats.pendingTasks} change="24 terminées" icon="✅" />
        <StatCard title="Membres" value={stats.members} change="+3 nouveaux" icon="👥" />
        <StatCard title="Heures travaillées" value={`${stats.hoursWorked}h`} change="Ce mois" icon="⏰" />
      </div>

      <div className="section-header">
        <h2 className="section-title">Projets récents</h2>
        <button className="btn-primary" onClick={() => setIsProjectModalOpen(true)}>
          + Nouveau projet
        </button>
      </div>

      <div className="projects-grid">
        {projects.slice(0, 3).map(project => (
          <ProjectCard key={project.id} project={project} onViewProject={handleViewProject} />
        ))}
      </div>

      <div className="section-header">
        <h2 className="section-title">Tâches prioritaires</h2>
        <button className="btn-secondary" onClick={() => setIsTaskModalOpen(true)}>
          + Nouvelle tâche
        </button>
      </div>

      <div className="tasks-container">
        {tasks.filter(t => !t.completed && t.priority === 'high').map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            projectName={projects.find(p => p.id === task.projectId)?.name || 'Sans projet'}
            onToggleTask={handleToggleTask}
          />
        ))}
        {tasks.filter(t => !t.completed && t.priority === 'high').length === 0 && (
          <div className="empty-state">✅ Aucune tâche prioritaire en attente !</div>
        )}
      </div>
    </>
  );

  const renderProjects = () => (
    <>
      <div className="section-header">
        <h2 className="section-title">Tous les projets</h2>
        <button className="btn-primary" onClick={() => setIsProjectModalOpen(true)}>
          + Nouveau projet
        </button>
      </div>
      <div className="projects-grid">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} onViewProject={handleViewProject} />
        ))}
      </div>
    </>
  );

  const renderTasks = () => (
    <>
      <div className="section-header">
        <h2 className="section-title">Toutes les tâches</h2>
        <button className="btn-primary" onClick={() => setIsTaskModalOpen(true)}>
          + Nouvelle tâche
        </button>
      </div>
      <div className="tasks-container">
        {tasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            projectName={projects.find(p => p.id === task.projectId)?.name || 'Sans projet'}
            onToggleTask={handleToggleTask}
          />
        ))}
      </div>
    </>
  );

  const renderTime = () => (
    <>
      <div className="section-header">
        <h2 className="section-title">Gestion du temps de travail</h2>
        <button className="btn-primary" onClick={() => setIsTimeOffModalOpen(true)}>
          + Demander congé
        </button>
      </div>
      <div className="stats-grid">
        <StatCard title="Congés restants" value="15j" icon="🏖️" />
        <StatCard title="Absences planifiées" value="3j" icon="📅" />
        <StatCard title="Heures supplémentaires" value="8h" icon="⏰" />
      </div>
      <div className="tasks-container">
        <h3 style={{ marginBottom: '15px' }}>Demandes de congé en attente</h3>
        {timeOffRequests.map(request => (
          <div key={request.id} className="task-item">
            <div>
              <strong>
                {request.type === 'vacation' ? '🏖️ Vacances' : 
                 request.type === 'sick' ? '🤒 Maladie' : '👤 Personnel'}
              </strong>
              <div>Du {formatDate(request.start)} au {formatDate(request.end)}</div>
              <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Motif: {request.reason}</div>
            </div>
            <div className="task-priority" style={{ background: '#fff3e0', color: '#ff9e00' }}>
              {request.status === 'pending' ? 'En attente' : 'Approuvé'}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  // Rendu conditionnel basé sur la route
  const renderContent = () => {
    switch(location.pathname) {
      case '/projects':
        return renderProjects();
      case '/tasks':
        return renderTasks();
      case '/time':
        return renderTime();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="public-layout">
      {renderContent()}

      {/* Modals */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="Nouveau projet">
        <div className="form-group">
          <label>Nom du projet *</label>
          <input 
            type="text" 
            value={newProject.name}
            onChange={(e) => setNewProject({...newProject, name: e.target.value})}
            placeholder="Ex: Application Mobile"
          />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea 
            rows="3"
            value={newProject.description}
            onChange={(e) => setNewProject({...newProject, description: e.target.value})}
            placeholder="Description du projet..."
          />
        </div>
        <div className="form-group">
          <label>Date d'échéance</label>
          <input 
            type="date" 
            value={newProject.dueDate}
            onChange={(e) => setNewProject({...newProject, dueDate: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Priorité</label>
          <select 
            value={newProject.priority}
            onChange={(e) => setNewProject({...newProject, priority: e.target.value})}
          >
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
        </div>
        <button className="btn-primary" onClick={handleCreateProject} style={{ width: '100%' }}>
          Créer le projet
        </button>
      </Modal>

      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Nouvelle tâche">
        <div className="form-group">
          <label>Titre de la tâche *</label>
          <input 
            type="text" 
            value={newTask.title}
            onChange={(e) => setNewTask({...newTask, title: e.target.value})}
            placeholder="Ex: Concevoir l'interface"
          />
        </div>
        <div className="form-group">
          <label>Projet associé</label>
          <select 
            value={newTask.projectId}
            onChange={(e) => setNewTask({...newTask, projectId: parseInt(e.target.value)})}
          >
            <option value="">Sélectionner un projet</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Date d'échéance</label>
          <input 
            type="date" 
            value={newTask.dueDate}
            onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Priorité</label>
          <select 
            value={newTask.priority}
            onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
          >
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
        </div>
        <button className="btn-primary" onClick={handleCreateTask} style={{ width: '100%' }}>
          Créer la tâche
        </button>
      </Modal>

      <Modal isOpen={isTimeOffModalOpen} onClose={() => setIsTimeOffModalOpen(false)} title="Demander un congé">
        <div className="form-group">
          <label>Type de congé</label>
          <select 
            value={newTimeOff.type}
            onChange={(e) => setNewTimeOff({...newTimeOff, type: e.target.value})}
          >
            <option value="vacation">Vacances</option>
            <option value="sick">Maladie</option>
            <option value="personal">Personnel</option>
          </select>
        </div>
        <div className="form-group">
          <label>Date de début</label>
          <input 
            type="date" 
            value={newTimeOff.start}
            onChange={(e) => setNewTimeOff({...newTimeOff, start: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Date de fin</label>
          <input 
            type="date" 
            value={newTimeOff.end}
            onChange={(e) => setNewTimeOff({...newTimeOff, end: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Motif</label>
          <textarea 
            rows="3"
            value={newTimeOff.reason}
            onChange={(e) => setNewTimeOff({...newTimeOff, reason: e.target.value})}
            placeholder="Motif de l'absence..."
          />
        </div>
        <button className="btn-primary" onClick={handleRequestTimeOff} style={{ width: '100%' }}>
          Envoyer la demande
        </button>
      </Modal>
    </div>
  );
};

export default PublicLayout;