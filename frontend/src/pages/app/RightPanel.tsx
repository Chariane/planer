// frontend/src/pages/app/RightPanel.tsx
import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Edit, X, Target, Sparkles } from 'lucide-react';

// Données exactes pour le canevas (mois, semaine, jours)
const periods = [
  { id: '1', name: 'Mois de Décembre', progress: 65, items: [
    { id: '11', text: 'Rédaction de cahier de charges', completed: true },
    { id: '12', text: 'Conception de l\'architecture', completed: true },
    { id: '13', text: 'Conception Frontend', completed: false },
    { id: '14', text: 'Conception Backend', completed: false },
    { id: '15', text: 'Conception de BD', completed: false },
  ]},
  { id: '2', name: 'Semaine du 05/12', progress: 65, items: [
    { id: '21', text: 'Rédaction de cahier de charges', completed: true },
    { id: '22', text: 'Conception de l\'architecture', completed: true },
    { id: '23', text: 'Conception Frontend', completed: false },
    { id: '24', text: 'Conception Backend', completed: false },
    { id: '25', text: 'Conception de BD', completed: false },
  ]},
  { id: '3', name: 'Lundi 05/12', progress: 65, items: [
    { id: '31', text: 'Rédaction de cahier de charges', completed: true },
    { id: '32', text: 'Conception de l\'architecture', completed: true },
    { id: '33', text: 'Conception Frontend', completed: false },
    { id: '34', text: 'Conception Backend', completed: false },
    { id: '35', text: 'Conception de BD', completed: false },
  ]},
  { id: '4', name: 'Mardi 06/12', progress: 0, items: [] },
  { id: '5', name: 'Mercredi 07/12', progress: 0, items: [] },
];

export default function RightPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({ '1': true, '2': true, '3': true });

  const togglePeriod = (id: string) => setExpandedPeriods(prev => ({ ...prev, [id]: !prev[id] }));

  const renderPeriod = (period: any, depth = 0) => {
    const isExpanded = expandedPeriods[period.id] !== false;
    return (
      <div key={period.id} className={`mt-3 ${depth > 0 ? 'ml-6' : ''}`}>
        <div className="flex items-center justify-between group">
          <button onClick={() => togglePeriod(period.id)} className="flex items-center gap-1.5 hover:text-secondary transition">
            {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
            <span className="text-sm font-medium text-gray-700">{period.name}</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary">{period.progress}%</span>
            <button className="text-gray-300 hover:text-gray-500"><Edit className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 my-1.5"><div className="bg-secondary h-2 rounded-full transition-all duration-500" style={{ width: `${period.progress}%` }} /></div>
        {isExpanded && period.items && (
          <div className="mt-2 space-y-1.5">
            {period.items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-2 cursor-pointer group">
                {item.completed ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Circle className="h-4 w-4 text-gray-300 group-hover:text-gray-400" />}
                <span className={`text-xs ${item.completed ? 'line-through text-gray-400' : 'text-gray-600'}`}>{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
        <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-secondary" /><h2 className="font-semibold text-gray-800">Canevas de la liste</h2></div>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {periods.map(period => renderPeriod(period))}
      </div>
    </div>
  );
}