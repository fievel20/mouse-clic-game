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
| Boutons de fenêtre | Cliquer sur le bouton nommé : Réduire (─), Agrandir (▢) / Rétrécir (❐), Fermer (✕) | Choisir le bon bouton d'après le but (« faites disparaître… sans la fermer ») | Plusieurs fenêtres : la bonne fenêtre et le bon bouton |
| Barre des tâches | Réduire une fenêtre, puis la rouvrir avec son icône | Retrouver une fenêtre réduite ou cachée derrière une autre | Réduire et rouvrir en cliquant sur les icônes |
| Fenêtres (comme Windows 11) | Double-clic sur la barre de titre : plein écran, puis taille d'origine | Glisser contre un bord : la moitié de l'écran, puis choisir l'autre fenêtre proposée | Glisser dans un coin : un quart de l'écran |
| Défi fenêtres | Boutons et barre des tâches mélangés | Avec les moitiés d'écran | Tout mélangé, avec 4 fenêtres |
| Sélection de texte | Sélectionner un mot en cliquant-glissant | Sélectionner un groupe de mots | Les raccourcis : double-clic (un mot) et triple-clic (un paragraphe) |
| Sélection multiple | Ctrl + clic pour ajouter des fichiers un par un | Maj + clic pour sélectionner toute une plage | Tracer un rectangle de sélection autour d'un groupe |
| Grand défi | Clics gauche, droit et central mélangés | Cases plus petites, icônes leurres | Contre la montre |
| **Ranger le bureau** (mission finale) | Ouvrir un dossier, renommer, ranger, supprimer | Le grand ménage : sélectionner plusieurs fichiers et les ranger ensemble | La lettre de Jeanne : ouvrir, lire jusqu'au bout, sélectionner la signature, ranger |

## Le chemin et les badges

Le menu présente les ateliers sous la forme d'un **chemin**, dans l'ordre conseillé : survol, clic gauche, clic droit, double-clic, bouton central, molette, barre de défilement, glisser-déposer, boutons de fenêtre, barre des tâches, fenêtres, défi fenêtres, sélection de texte, sélection multiple, Grand défi, puis la mission finale « Ranger le bureau ». C'est seulement une suggestion : **tous les ateliers sont ouverts dès le départ**, et on peut commencer par celui qu'on veut. Dans chaque atelier, on commence toujours par le **niveau 1**. Les niveaux 2 et 3 se débloquent avec ★★ au niveau précédent. Les liaisons du chemin passent au vert quand un atelier a ★★ au niveau 1.

Réussir le **niveau 3** d'un atelier avec ★★ rapporte son **badge** 🏅. Avec les 16 badges, on obtient le diplôme « Bravo, vous maîtrisez la souris ! ». Sans bouton central, cet atelier est considéré comme franchi et son badge n'est pas demandé.

## Le mode libre

Quand **tous les niveaux de tous les ateliers** sont terminés, un bouton « 🎲 Mode libre » apparaît dans le menu, à côté des badges. Avant cela, il n'est pas visible.

Le mode libre tire au hasard un exercice parmi tous les niveaux de tous les ateliers, puis un autre, **sans fin**. Une manche par exercice, ou la mission entière pour « Ranger le bureau ». Le compteur affiche les réussites, la **série** en cours (réussites d'affilée sans erreur) et le **record**, qui est enregistré. On en sort par le bouton « Menu ».

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
- `js/fenetres-ecran.js` : le petit écran façon Windows 11 (fenêtres, boutons, barre des tâches, ancrage), partagé par les 4 ateliers de fenêtres.
- `js/tests.js` : les tests automatiques.

Pour ajouter un atelier : créer son fichier dans `js/ateliers/`, l'ajouter dans `index.html`, écrire sa scène dans `js/demo.js`, puis apprendre au robot de `js/tests.js` à y jouer. Les scripts sont classiques, sans modules, pour que `index.html` s'ouvre aussi sans serveur.

## Documentation développeur

Tout le détail est dans [docs/](docs/README.md) : [architecture](docs/architecture.md), [référence de l'API](docs/reference-api.md), [ajouter un atelier](docs/ajouter-un-atelier.md) (avec un exemple complet), [tests](docs/tests.md), [lancer et déployer](docs/deploiement.md) et [charte graphique](docs/charte-graphique.md).
