-- 1. On supprime l'ancienne contrainte restrictive
ALTER TABLE planer.membre 
DROP CONSTRAINT IF EXISTS membre_statut_check;

-- 2. On ajoute la nouvelle contrainte incluant 'En attente'
ALTER TABLE planer.membre 
ADD CONSTRAINT membre_statut_check 
CHECK (statut = ANY (ARRAY[
    'Actif'::text, 
    'En attente'::text, 
    'Suspendu'::text, 
    'Quitté'::text
]));
