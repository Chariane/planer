import DashboardCenter from '../components/dashboard/DashboardCenter';
import DashboardRight from '../components/dashboard/DashboardRight';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Colonne centrale (2/3 de largeur) */}
      <div className="lg:col-span-2">
        <DashboardCenter />
      </div>
      {/* Colonne droite (1/3) - Canevas */}
      <div className="lg:col-span-1">
        <DashboardRight />
      </div>
    </div>
  );
}
