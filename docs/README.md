# Documentation développeur

Mouse Clic Game est un jeu pour apprendre à se servir de la souris, pensé pour des personnes débutantes qui jouent seules. C'est une page web statique : du HTML, du CSS et du JavaScript, sans bibliothèque ni étape de compilation.

| Document | Contenu |
| --- | --- |
| [Architecture](architecture.md) | Organisation des fichiers, déroulement d'une partie, progression (niveaux, chemin, badges), sauvegarde |
| [Référence de l'API](reference-api.md) | `MouseGame`, l'objet `api` reçu par les ateliers, la description d'un atelier, `MouseDemo` |
| [Ajouter un atelier](ajouter-un-atelier.md) | Pas à pas, avec un exemple complet : atelier, démonstration, tests |
| [Tests automatiques](tests.md) | Le mode `index.html?test`, le robot, les scénarios d'erreur |
| [Lancer et déployer](deploiement.md) | Ouvrir le jeu en local, branches et pull requests, GitHub Pages |
| [Charte graphique](charte-graphique.md) | Couleurs, icônes, composants, contraintes de mise en page |

## En bref

- **Aucune installation** : ouvrez `index.html` dans un navigateur.
- **Un fichier par atelier** dans `js/ateliers/`, qui s'enregistre auprès du noyau `js/core.js`.
- **Tests** : ouvrez `index.html?test`. Un robot joue tous les niveaux et affiche un rapport.
- **En ligne** : https://fievel20.github.io/mouse-clic-game/, publié par GitHub Pages depuis `main`.
