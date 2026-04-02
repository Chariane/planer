import React from "react";
import ".styles/home.css";

const Home = () => {
  return (
    <div className="home">

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <h1>K-Planer</h1>
          <p className="subtitle">
            Plateforme intelligente de gestion de projets, de collaboration 
            et de suivi du temps de travail.
          </p>

          <p className="description">
            Centralisez vos workspaces, organisez vos espaces, gérez vos listes 
            et suivez vos tâches avec une communication en temps réel intégrée.
          </p>

          <div className="hero-buttons">
            <button className="btn primary">Créer un workspace</button>
            <button className="btn secondary">Explorer la plateforme</button>
          </div>
        </div>
      </section>

      {/* STRUCTURE METIER */}
      <section className="structure">
        <h2>Une organisation claire et hiérarchisée</h2>

        <div className="structure-flow">
          <div className="block">Workspace</div>
          <div className="arrow">→</div>
          <div className="block">Espaces</div>
          <div className="arrow">→</div>
          <div className="block">Listes</div>
          <div className="arrow">→</div>
          <div className="block">Tâches</div>
        </div>

        <p className="structure-desc">
          K-Planer vous permet de structurer efficacement vos projets grâce 
          à une hiérarchie flexible et adaptée à toutes les organisations.
        </p>
      </section>

      {/* FONCTIONNALITES */}
      <section className="features">
        <h2>Fonctionnalités clés</h2>

        <div className="feature-grid">

          <div className="card">
            <h3>Gestion des tâches avancée</h3>
            <p>
              Statuts, priorités, échéances, assignation et suivi détaillé.
            </p>
          </div>

          <div className="card">
            <h3>Vues multiples</h3>
            <p>
              Liste, Kanban et diagramme de Gantt pour visualiser vos projets.
            </p>
          </div>

          <div className="card">
            <h3>Checklists & progression</h3>
            <p>
              Décomposez vos tâches en sous-tâches et suivez leur avancement.
            </p>
          </div>

        </div>
      </section>

      {/* TEMPS REEL */}
      <section className="realtime">
        <h2>Collaboration en temps réel</h2>

        <div className="feature-grid">

          <div className="card">
            <h3>Messagerie intégrée</h3>
            <p>
              Communiquez directement avec votre équipe sans quitter la plateforme.
            </p>
          </div>

          <div className="card">
            <h3>Notifications instantanées</h3>
            <p>
              Soyez alerté des mises à jour, tâches assignées et deadlines.
            </p>
          </div>

          <div className="card">
            <h3>Présence en ligne</h3>
            <p>
              Visualisez l’activité des membres en temps réel.
            </p>
          </div>

        </div>
      </section>

      {/* GESTION TEMPS */}
      <section className="time-management">
        <h2>Gestion du temps et des ressources</h2>

        <div className="feature-grid">

          <div className="card">
            <h3>Absences & congés</h3>
            <p>
              Gérez et planifiez les absences de votre équipe.
            </p>
          </div>

          <div className="card">
            <h3>Rapports de travail</h3>
            <p>
              Suivez les réalisations, difficultés et performances.
            </p>
          </div>

          <div className="card">
            <h3>Suivi de productivité</h3>
            <p>
              Analysez l’évolution de vos projets et de votre équipe.
            </p>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Optimisez votre organisation dès aujourd’hui</h2>
        <p>Rejoignez K-Planer et améliorez votre gestion de projet</p>
        <button className="btn primary">Démarrer maintenant</button>
      </section>

    </div>
  );
};

export default Home;