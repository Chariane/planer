export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'en_cours' | 'en_attente' | 'terminee' | 'bloquee' | 'archivee';
  priority: 'tres_elevee' | 'elevee' | 'normale' | 'faible' | 'tres_faible';
  dueDate: string;
  assignees: Member[];
  listId: string;
  createdAt: Date;
  subTasks?: ChecklistItem[];
}

export interface Period {
  id: string;
  name: string;
  progress: number;
  expanded?: boolean;
  children?: Period[];
  items?: ChecklistItem[];
}

export interface List {
  id: string;
  nom: string;
  description: string;
  taches: Task[];
  periods?: Period[];
  createdAt: Date;
}

export interface Space {
  id: string;
  nom: string;
  description: string;
  sous_espaces?: Space[];
  listes: List[];
  createdAt: Date;
}

export interface Workspace {
  id: string;
  nom: string;
  description: string;
  membres: Member[];
  espaces: Space[];
  createdAt: Date;
}
