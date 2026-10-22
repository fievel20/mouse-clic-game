# mouse-clic-game
Jeu pour s'entraîner au maniement de la souris, pensé pour les personnes qui débutent avec l'ordinateur et qui jouent seules.

Même charte graphique que [OCN-mouse-campus](https://github.com/le-campus-numerique/OCN-mouse-campus) : fond gris clair, cases blanches, icônes au trait, vert pour la réussite et rouge pour l'erreur.

## Les ateliers et leurs niveaux

| Atelier | Niveau 1 | Niveau 2 | Niveau 3 |
| --- | --- | --- | --- |
| Survol | Laisser la flèche sur le fichier pour voir sa bulle d'aide | Ouvrir un sous-menu en le survolant, puis choisir | Lire les bulles pour trouver le bon fichier parmi des fichiers identiques |
| Clic gauche | Un grand fichier à cliquer | Cases plus petites, icônes leurres | Cliquer avant que le fichier change de place |
| Clic droit | Ouvrir le menu du fichier | Ouvrir le menu, puis choisir l'action demandée | Trouver le bon fichier par son nom, puis choisir l'action |
| Double-clic | Deux clics en moins de 0,8 s | Deux clics en moins de 0,5 s (comme sous Windows) | Trouver le bon dossier par son nom et l'ouvrir |
| Bouton central | Appuyer sur la molette | Cases plus petites, icônes leurres | Ouvrir des liens dans un nouvel onglet |
| Molette | Déplacer le fichier cran par cran | Faire défiler une liste pour trouver le dossier | Trouver un fichier par son nom dans une longue liste |
| Barre de défilement | Faire glisser l'ascenseur pour trouver le dossier | Les flèches ▲ ▼, ligne par ligne | Ascenseur, flèches et piste pour trouver un fichier par son nom |
| Glisser-déposer | Ranger le fichier dans le dossier | Trier dans trois dossiers | Le labyrinthe de OCN-mouse-campus |
| Sélection de texte | Sélectionner un mot en cliquant-glissant | Sélectionner un groupe de mots | Les raccourcis : double-clic (un mot) et triple-clic (un paragraphe) |
| Grand défi | Clics gauche, droit et central mélangés | Cases plus petites, icônes leurres | Contre la montre |

## Le chemin de progression et les badges

Le menu est un **chemin** : les ateliers s'ouvrent dans l'ordre conseillé (survol, clic gauche, clic droit, double-clic, bouton central, molette, barre de défilement, glisser-déposer, sélection de texte, Grand défi). Un atelier s'ouvre quand le précédent a ★★ au niveau 1. Un atelier déjà commencé reste toujours ouvert, même si un nouvel atelier est ajouté avant lui sur le chemin. La mention « ▶ Vous êtes ici » indique l'étape à faire.

Réussir le **niveau 3** d'un atelier avec ★★ rapporte son **badge** 🏅. Avec les 10 badges, on obtient le diplôme « Bravo, vous maîtrisez la souris ! ». Sans bouton central, cet atelier est considéré comme franchi et son badge n'est pas demandé.

## Les démonstrations

La première fois qu'on ouvre un atelier, une **démonstration animée** montre le geste : la flèche se déplace à l'écran et le bouton de la souris dessinée s'enfonce au bon moment. Le bouton « ▶ Revoir la démo » la rejoue pendant une partie.

À chaque consigne, un dessin de souris montre en vert le bouton à utiliser. On gagne de 1 à 3 étoiles selon le nombre d'erreurs. Avec ★★ ou plus, le niveau suivant se débloque. Les étoiles sont gardées dans le navigateur.

Seul le niveau 3 du clic gauche et du Grand défi est minuté. Ailleurs, le temps est seulement affiché, pour ne pas mettre de pression.

Sans bouton central (pavé tactile d'ordinateur portable), le bouton « Je n'ai pas de bouton central » passe l'atelier et retire ce bouton du Grand défi.

## Lancer le jeu

Ouvrez `index.html` dans un navigateur. Il n'y a rien à installer : c'est du HTML, du CSS et du JavaScript, sans bibliothèque.

En ligne avec GitHub Pages : https://fievel20.github.io/mouse-clic-game/

## Tests automatiques

Ouvrez `index.html?test` : un robot joue chaque niveau de chaque atelier en accéléré, puis vérifie que les erreurs sont bien comptées. Le rapport s'affiche en haut à droite. Ces tests n'effacent pas les vraies étoiles.

## Organisation du code

- `js/core.js` : menu, niveaux, déroulement d'une partie, score, étoiles, dessin de la souris.
- `js/ateliers/*.js` : un fichier par atelier, qui s'enregistre avec `MouseGame.register({ id, order, title, text, hint, badge, levels, start })`. `order` fixe sa place sur le chemin. Chaque niveau est un objet de réglages (`{ name, rounds, ... }`) passé à `start(api, level)`.
- `js/demo.js` : les démonstrations animées, une scène par atelier (clé = `id` de l'atelier).
- `js/tests.js` : les tests automatiques.

Pour ajouter un atelier : créer son fichier dans `js/ateliers/`, l'ajouter dans `index.html`, écrire sa scène dans `js/demo.js`, puis apprendre au robot de `js/tests.js` à y jouer. Les scripts sont classiques, sans modules, pour que `index.html` s'ouvre aussi sans serveur.

## Documentation développeur

Tout le détail est dans [docs/](docs/README.md) : [architecture](docs/architecture.md), [référence de l'API](docs/reference-api.md), [ajouter un atelier](docs/ajouter-un-atelier.md) (avec un exemple complet), [tests](docs/tests.md), [lancer et déployer](docs/deploiement.md) et [charte graphique](docs/charte-graphique.md).
