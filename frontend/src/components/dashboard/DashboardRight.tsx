import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, ChevronRight } from 'lucide-react';
import Card from '../ui/Card';

// Données mockées du canevas (checklists)
const canvasData = {
  title: 'Canevas - Projet K-Planner',
  sections: [
    {
      name: 'Checklist quotidienne',
      items: [
        { id: 1, text: 'Mettre à jour le board Kanban', completed: true },
        { id: 2, text: 'Faire le point avec l’équipe', completed: false },
        { id: 3, text: 'Vérifier les deadlines', completed: true },
      ],
    },
    {
      name: 'Checklist hebdomadaire',
      items: [
        { id: 4, text: 'Préparer le rapport d’activité', completed: false },
        { id: 5, text: 'Valider les sprints', completed: false },
        { id: 6, text: 'Mise à jour de la documentation', completed: true },
      ],
    },
  ],
};

function calculateProgress(items) {
  const total = items.length;
  const completed = items.filter(i => i.completed).length;
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

export default function DashboardRight() {
  const [sections, setSections] = useState(canvasData.sections);

  const toggleItem = (sectionIdx, itemId) => {
    setSections(prev =>
      prev.map((section, idx) =>
        idx === sectionIdx
          ? {
              ...section,
              items: section.items.map(item =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
              ),
            }
          : section
      )
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">{canvasData.title}</h2>
        <p className="text-sm text-gray-500 mb-4">Suivi d’avancement</p>

        {sections.map((section, sectionIdx) => {
          const progress = calculateProgress(section.items);
          return (
            <div key={sectionIdx} className="mb-6 last:mb-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-700">{section.name}</h3>
                <span className="text-sm font-medium text-secondary">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <motion.div
                  className="bg-secondary h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => toggleItem(sectionIdx, item.id)}
                  >
                    {item.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300 group-hover:text-gray-400" />
                    )}
                    <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </Card>

      <Card className="p-4 text-center">
        <p className="text-sm text-gray-500">Progression globale</p>
        <p className="text-3xl font-bold text-secondary">65%</p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div className="bg-secondary h-2 rounded-full w-[65%]"></div>
        </div>
      </Card>
    </div>
  );
}
