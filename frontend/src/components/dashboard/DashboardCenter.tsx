import { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle, Circle, Clock, AlertCircle, Plus, Filter } from 'lucide-react';
import {Button} from '../ui/Button';
import Card from '../ui/Card';

// Données mockées des tâches
const tasksData = {
  'En cours': [
    { id: 1, title: 'Implémenter le drag & drop', members: ['AD', 'BC'], priority: 'Haute', dueDate: '2025-04-15' },
    { id: 2, title: 'Concevoir le pie chart', members: ['CD'], priority: 'Moyenne', dueDate: '2025-04-12' },
  ],
  'En attente': [
    { id: 3, title: 'Réviser l’architecture', members: ['EF'], priority: 'Basse', dueDate: '2025-04-20' },
  ],
  'Terminées': [
    { id: 4, title: 'Initialiser le projet', members: ['GH'], priority: 'Haute', dueDate: '2025-04-01' },
  ],
};

const statusColors = {
  'En cours': 'bg-blue-100 text-blue-700',
  'En attente': 'bg-yellow-100 text-yellow-700',
  'Terminées': 'bg-green-100 text-green-700',
};

const priorityColors = {
  Haute: 'text-red-600 bg-red-50',
  Moyenne: 'text-orange-600 bg-orange-50',
  Basse: 'text-green-600 bg-green-50',
};

// Données pour le pie chart
const pieData = [
  { name: 'En cours', value: 2, color: '#3b82f6' },
  { name: 'En attente', value: 1, color: '#eab308' },
  { name: 'Terminées', value: 1, color: '#10b981' },
];

export default function DashboardCenter() {
  const [activeTab, setActiveTab] = useState('liste');
  const [expandedSections, setExpandedSections] = useState({
    'En cours': true,
    'En attente': true,
    'Terminées': true,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {['liste', 'kanban', 'gantt'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeTab === tab
                ? 'bg-secondary text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab === 'liste' && 'Vue liste'}
            {tab === 'kanban' && 'Vue Kanban'}
            {tab === 'gantt' && 'Diagramme de Gantt'}
          </button>
        ))}
      </div>

      {/* Barre d'actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <Button variant="primary" size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter tâche</Button>
          <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter membre</Button>
        </div>
        <button className="p-2 rounded-lg hover:bg-gray-100">
          <Filter className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Tableau des tâches groupé par statut */}
      <div className="space-y-4">
        {Object.entries(tasksData).map(([status, tasks]) => (
          <Card key={status} className="p-4">
            <button
              onClick={() => toggleSection(status)}
              className="w-full flex justify-between items-center"
            >
              <div className="flex items-center gap-2">
                {status === 'En cours' && <Clock className="h-5 w-5 text-blue-500" />}
                {status === 'En attente' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                {status === 'Terminées' && <CheckCircle className="h-5 w-5 text-green-500" />}
                <h3 className="font-semibold text-gray-800">{status}</h3>
                <span className="text-xs text-gray-400">({tasks.length})</span>
              </div>
              <span className="text-gray-400">{expandedSections[status] ? '−' : '+'}</span>
            </button>

            {expandedSections[status] && (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-gray-500 border-b">
                    <tr>
                      <th className="text-left py-2">#</th>
                      <th className="text-left py-2">Titre</th>
                      <th className="text-left py-2">Membres</th>
                      <th className="text-left py-2">Priorité</th>
                      <th className="text-left py-2">Date fin</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task, idx) => (
                      <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2">{task.id}</td>
                        <td className="py-2 font-medium">{task.title}</td>
                        <td className="py-2">
                          <div className="flex -space-x-2">
                            {task.members.map((m, i) => (
                              <div key={i} className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700 border-2 border-white">
                                {m}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-2 text-gray-500">{task.dueDate}</td>
                        <td className="py-2">
                          <button className="text-gray-400 hover:text-gray-600">⋯</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Graphique circulaire (Pie Chart) */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-800 mb-3">Répartition des tâches</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
