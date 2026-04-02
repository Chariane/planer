cat > src/App.jsx << 'EOF'
function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-8 text-center max-w-md w-full">
        <div className="mb-6">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">KP</span>
          </div>
          <h1 className="text-3xl font-bold text-primary-500 mb-2">
            K-PLANER
          </h1>
          <p className="text-secondary-500">
            Plateforme de gestion de projets
          </p>a
        </div>
        
        <p className="text-secondary-600 mb-6">
          ✅ Tailwind CSS est installé avec succès !
        </p>
        
        <div className="flex gap-3 justify-center">
          <button className="btn-primary">
            Se connecter
          </button>
          <button className="btn-secondary">
            S'inscrire
          </button>
        </div>
        
        <div className="mt-6 pt-6 border-t border-secondary-100">
          <div className="flex gap-2 justify-center">
            <span className="badge badge-success">✓ Prêt</span>
            <span className="badge badge-info">⚡ Vite + React</span>
            <span className="badge badge-success">🎨 Tailwind</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
EOF