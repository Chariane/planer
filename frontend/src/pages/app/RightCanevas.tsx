import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Edit, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function RightCanevas() {
  const { listId } = useParams();
  const { workspaces, toggleChecklistItem } = useApp();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({});

  let activeList = null;
  for (const ws of workspaces) {
    for (const space of ws.espaces) {
      const list = space.listes.find(l => l.id === listId);
      if (list) {
        activeList = list;
        break;
      }
    }
  }

  if (!activeList || !activeList.periods) {
    return (
      <div className="w-full md:w-80 flex-shrink-0 bg-white border-t md:border-t-0 md:border-l border-gray-200 p-4">
        <p className="text-gray-500 text-sm">Sélectionnez une liste pour voir le canevas.</p>
      </div>
    );
  }

  const togglePeriod = (id: string) => {
    setExpandedPeriods(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderPeriod = (period: any, depth = 0) => {
    const isExpanded = expandedPeriods[period.id] !== false;
    return (
      <div key={period.id} className={`ml-${depth * 4} mt-3`}>
        <div className="flex items-center justify-between">
          <button onClick={() => togglePeriod(period.id)} className="flex items-center gap-1 hover:text-secondary">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="text-sm font-medium text-gray-700">{period.name}</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-secondary">{period.progress}%</span>
            <button className="text-gray-400 hover:text-gray-600"><Edit className="h-3 w-3" /></button>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 my-1">
          <div className="bg-secondary h-1.5 rounded-full" style={{ width: `${period.progress}%` }} />
        </div>
        {isExpanded && period.children?.map((child: any) => renderPeriod(child, depth + 1))}
        {isExpanded && period.items && (
          <div className="mt-2 space-y-1 pl-2">
            {period.items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleChecklistItem(activeList.id, period.id, item.id)}>
                {item.completed ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-gray-300 group-hover:text-gray-400" />}
                <span className={`text-xs ${item.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="w-full md:w-80 flex-shrink-0 bg-white border-t md:border-t-0 md:border-l border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h2 className="font-semibold text-gray-800">Canevas de la liste</h2>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[60vh] md:max-h-full overflow-y-auto p-4">
        {activeList.periods.map(period => renderPeriod(period))}
      </div>
    </div>
  );
}
