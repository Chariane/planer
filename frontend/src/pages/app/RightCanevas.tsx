// frontend/src/pages/app/RightCanevas.tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Edit, X, Target, Sparkles } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function RightCanevas() {
  const { listId } = useParams();
  const { workspaces, toggleChecklistItem } = useApp();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({});

  let activeList = null;
  for (const ws of workspaces) {
    for (const space of ws.espaces || []) {
      const list = space.listes?.find(l => l.id === listId);
      if (list) { activeList = list; break; }
    }
    if (activeList) break;
  }

  if (!activeList || !activeList.periods?.length) {
    return (
      <div className="h-full p-6 text-center text-gray-400 flex flex-col items-center justify-center">
        <Target className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">Aucun canevas disponible</p>
        <p className="text-xs mt-1">Sélectionnez une liste avec des périodes</p>
      </div>
    );
  }

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
        {isExpanded && (
          <div className="mt-2 space-y-1.5">
            {period.children?.map((child: any) => renderPeriod(child, depth + 1))}
            {period.items?.map((item: any) => (
              <div key={item.id} className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleChecklistItem(activeList.id, period.id, item.id)}>
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
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-secondary" />
          <h2 className="font-semibold text-gray-800">Canevas</h2>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {activeList.periods.map((period: any) => renderPeriod(period))}
      </div>
    </div>
  );
}