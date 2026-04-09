export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'member' | 'guest';
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  members: Member[];
  createdAt: Date;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  createdAt: Date;
}

export interface List {
  id: string;
  name: string;
  description: string;
  workspaceId: string;
  spaceId?: string;
  globalChecklistSections: ChecklistSection[];
  createdAt: Date;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: Date | null;
  assigneeId: string | null;
  listId: string;
  checklists: ChecklistItem[];
  attachments: Attachment[];
  createdAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'other';
  uploadedBy: string;
}

export interface Absence {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  type: 'vacation' | 'sick' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
}

export interface Report {
  id: string;
  userId: string;
  listId: string;
  content: string;
  achievements: string;
  difficulties: string;
  solutions: string;
  createdAt: Date;
}
