// frontend/src/pages/app/TopBar.tsx
import { ArrowLeft, ArrowRight, Menu } from 'lucide-react';

export default function TopBar() {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <button className="p-1 rounded hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <button className="p-1 rounded hover:bg-gray-100">
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </button>
        <div className="ml-2 text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded">
          https://planer.kapitalhc.com/dashboard/{'{id-environnement}'}/{'{id-espace}'}
        </div>
      </div>
      <button className="p-1 rounded hover:bg-gray-100">
        <Menu className="h-5 w-5 text-gray-600" />
      </button>
    </div>
  );
}