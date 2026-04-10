import Card from '../ui/Card';

const activities = [
  { user: 'Thomas D.', action: 'a créé le workspace', target: 'K-Planner Dev', time: 'il y a 2 heures' },
  { user: 'Alice M.', action: 'a ajouté une tâche', target: 'Implémenter le drag & drop', time: 'il y a 1 jour' },
  { user: 'Bob L.', action: 'a terminé', target: 'Concevoir le pie chart', time: 'il y a 2 jours' },
];

export default function RecentActivities() {
  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-4">Activités récentes</h3>
      <div className="space-y-3">
        {activities.map((act, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="font-medium">{act.user}</span>
            <span className="text-gray-500">{act.action}</span>
            <span className="font-medium">{act.target}</span>
            <span className="text-gray-400 ml-auto">{act.time}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
