import React from 'react';
import { Users, UserCheck, UserX, Shield } from 'lucide-react';

const UserStats = ({ users }) => {
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.is_active).length;
  const inactiveUsers = totalUsers - activeUsers;
  const adminUsers = users.filter(user => user.role === 'admin' || user.role === 'super_admin').length;

  const stats = [
    {
      label: 'Total utilisateurs',
      value: totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Utilisateurs actifs',
      value: activeUsers,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: 'Utilisateurs inactifs',
      value: inactiveUsers,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      label: 'Administrateurs',
      value: adminUsers,
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserStats;