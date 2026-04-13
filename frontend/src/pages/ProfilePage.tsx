import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Shield, Copy, Check, Edit2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export default function ProfilePage() {
  const { user, updateProfile, setup2FA, enable2FA, disable2FA, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nom: user?.nom || '', prenoms: user?.prenoms || '' });
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFASetup, setTwoFASetup] = useState<any>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [copied, setCopied] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleEditSubmit = async () => {
    try {
      await updateProfile({ nom: editForm.nom, prenoms: editForm.prenoms });
      setMessage('Profil mis à jour avec succès');
      setIsEditing(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Erreur lors de la mise à jour');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const data = await setup2FA();
      setTwoFASetup(data);
      setIs2FAModalOpen(true);
    } catch (err) {
      setError('Erreur lors de la préparation 2FA');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEnable2FA = async () => {
    try {
      await enable2FA(twoFACode);
      setIs2FAModalOpen(false);
      setTwoFASetup(null);
      setTwoFACode('');
      setMessage('2FA activée avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Code 2FA invalide');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      setError('Veuillez entrer votre mot de passe');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      await disable2FA(disablePassword);
      setDisablePassword('');
      setMessage('2FA désactivée avec succès');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors de la désactivation');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      await changePassword(passwordForm.current, passwordForm.new);
      setMessage('Mot de passe modifié avec succès');
      setPasswordForm({ current: '', new: '', confirm: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Mot de passe actuel incorrect');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Mon profil</h1>
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button onClick={() => setActiveTab('profile')} className={`pb-2 px-1 text-sm font-medium ${activeTab === 'profile' ? 'border-b-2 border-secondary text-secondary' : 'text-gray-500'}`}>Informations</button>
          <button onClick={() => setActiveTab('security')} className={`pb-2 px-1 text-sm font-medium ${activeTab === 'security' ? 'border-b-2 border-secondary text-secondary' : 'text-gray-500'}`}>Sécurité</button>
        </nav>
      </div>

      {activeTab === 'profile' && (
        <Card className="p-6">
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700">Nom d'utilisateur</label><p className="mt-1">{user?.username}</p></div>
            <div><label className="block text-sm font-medium text-gray-700">Email</label><p className="mt-1">{user?.email}</p></div>
            {!isEditing ? (
              <>
                <div><label className="block text-sm font-medium text-gray-700">Nom</label><p className="mt-1">{user?.nom || 'Non renseigné'}</p></div>
                <div><label className="block text-sm font-medium text-gray-700">Prénoms</label><p className="mt-1">{user?.prenoms || 'Non renseigné'}</p></div>
                <Button variant="outline" onClick={() => { setEditForm({ nom: user?.nom || '', prenoms: user?.prenoms || '' }); setIsEditing(true); }}>
                  <Edit2 className="h-4 w-4 mr-2" /> Modifier mon profil
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700">Nom</label><input type="text" value={editForm.nom} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} className="w-full border rounded p-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Prénoms</label><input type="text" value={editForm.prenoms} onChange={e => setEditForm({ ...editForm, prenoms: e.target.value })} className="w-full border rounded p-2" /></div>
                <div className="flex gap-2"><Button onClick={handleEditSubmit}>Enregistrer</Button><Button variant="outline" onClick={() => setIsEditing(false)}>Annuler</Button></div>
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'security' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Authentification à deux facteurs</h2>
            {user?.is_2fa_enabled ? (
              <div>
                <p className="text-green-600 mb-2">✓ 2FA activée</p>
                <input type="password" placeholder="Mot de passe actuel" value={disablePassword} onChange={e => setDisablePassword(e.target.value)} className="border rounded p-2 w-64 mr-2" />
                <Button variant="outline" onClick={handleDisable2FA}>Désactiver 2FA</Button>
              </div>
            ) : (
              <Button onClick={handleSetup2FA}><Shield className="h-4 w-4 mr-2" /> Activer 2FA</Button>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Changer le mot de passe</h2>
            <div className="space-y-3 max-w-md">
              <input type="password" placeholder="Mot de passe actuel" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} className="w-full border rounded p-2" />
              <input type="password" placeholder="Nouveau mot de passe" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full border rounded p-2" />
              <input type="password" placeholder="Confirmer" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full border rounded p-2" />
              <Button onClick={handleChangePassword}>Modifier le mot de passe</Button>
            </div>
          </Card>
        </div>
      )}

      <Modal isOpen={is2FAModalOpen} onClose={() => setIs2FAModalOpen(false)} title="Activer l'authentification à deux facteurs" size="lg">
        {twoFASetup && (
          <div className="space-y-4">
            <p>Scannez ce QR code avec Google Authenticator :</p>
            <div className="flex justify-center"><QRCodeCanvas value={twoFASetup.google_authenticator_otpauth_url} size={200} /></div>
            <p>Ou saisissez ce code secret :</p>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 p-2 rounded">{twoFASetup.google_authenticator_secret}</code>
              <button onClick={() => { navigator.clipboard.writeText(twoFASetup.google_authenticator_secret); setCopied(true); setTimeout(()=>setCopied(false),2000); }}>{copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}</button>
            </div>
            <input type="text" placeholder="Code à 6 chiffres" value={twoFACode} onChange={e => setTwoFACode(e.target.value)} className="w-full border rounded p-2" />
            <Button onClick={handleEnable2FA}>Activer</Button>
          </div>
        )}
      </Modal>

      {message && <div className="fixed bottom-4 right-4 bg-green-100 text-green-700 p-3 rounded shadow">{message}</div>}
      {error && <div className="fixed bottom-4 right-4 bg-red-100 text-red-700 p-3 rounded shadow">{error}</div>}
    </div>
  );
}
