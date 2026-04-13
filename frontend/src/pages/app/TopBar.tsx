import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export default function TopBar() {
  const navigate = useNavigate();
  const { workspaceId, spaceId, listId } = useParams();
  const { workspaces } = useApp();
  const workspace = workspaces.find(w => w.id === workspaceId);
  const space = workspace?.espaces.find(s => s.id === spaceId);
  const list = space?.listes.find(l => l.id === listId);

  const breadcrumb = [
    { name: 'Dashboard', path: '/dashboard' },
    ...(workspace ? [{ name: workspace.nom, path: `/workspace/${workspace.id}` }] : []),
    ...(space ? [{ name: space.nom, path: `/workspace/${workspaceId}/${space.id}` }] : []),
    ...(list ? [{ name: list.nom, path: `/workspace/${workspaceId}/${spaceId}/${list.id}` }] : []),
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center shadow-sm">
      <div className="flex items-center gap-2">
        <button className="p-1 rounded hover:bg-gray-100" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <button className="p-1 rounded hover:bg-gray-100" onClick={() => navigate(1)}>
          <ArrowRight className="h-5 w-5 text-gray-600" />
        </button>
        <div className="ml-2 flex items-center text-sm text-gray-500 flex-wrap">
          {breadcrumb.map((item, idx) => (
            <div key={item.path} className="flex items-center">
              {idx > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
              <button
                onClick={() => navigate(item.path)}
                className="hover:text-gray-900 hover:underline"
              >
                {item.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
