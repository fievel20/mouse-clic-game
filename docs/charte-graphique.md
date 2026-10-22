# Charte graphique

Le jeu reprend la charte de [OCN-mouse-campus](https://github.com/le-campus-numerique/OCN-mouse-campus), du Campus Numérique : sobre, contrasté, avec de grandes cibles et peu de distractions.

## Couleurs

| Rôle | Couleur | Utilisation |
| --- | --- | --- |
| Fond de page | `#f4f4f9` | `body`, fonds secondaires (boutons de niveau, scène de démo) |
| Texte | `#333` | Tout le texte |
| Surfaces | `#ffffff` | Cases, cartes, plateaux, fenêtres |
| Gris | `#808080` | Murs du labyrinthe, bouton « Retour au menu », sous-titres |
| Gris clair | `#c8c8c8` | Étoiles non gagnées, liaisons du chemin pas encore franchies |
| **Réussite** | `#4caf50` | Case réussie, bouton principal, niveau conseillé, « Vous êtes ici », partie active de la souris dessinée |
| Bouton enfoncé | `#1b5e20` | Bouton de la souris dessinée pendant une démo |
| **Erreur** | `#ff4c4c` | Case en erreur, message d'erreur |
| Étoiles | `#f5b301` | Étoiles gagnées, bord des médailles |
| Médaille gagnée | `#ffe08a` | Fond des médailles |
| Surbrillance | `#e8f5e9` | Dossier survolé pendant un glisser-déposer |
| Sélection de texte | `#9cc7f5` | Texte sélectionné |
| Bulle d'aide | `#333` | Fond des bulles (texte blanc) |

## Typographie

- **Arial**, partout.
- Titre du menu : 32 px. Titre d'une partie : 26 px. Énoncé : 22 px, en gras. Commentaire sous l'énoncé : 19 px. Compteurs : 20 px.
- Le commentaire est vert (`#4caf50`) pour une réussite, rouge (`#ff4c4c`) pour une erreur, et gris foncé (`#555`) pour un simple conseil.
- Les textes destinés au joueur sont courts, au présent, au vouvoiement, sans jargon. On écrit « la flèche » plutôt que « le pointeur », et « l'ascenseur (la barre grise) » à la première mention.

## Composants

| Composant | Style |
| --- | --- |
| Case, carte, plateau | Fond blanc, `border-radius: 5px`, ombre `0 4px 8px rgba(0, 0, 0, 0.1)` |
| Fenêtre (résultat, démo) | Fond `#fefefe`, `border-radius: 10px`, voile `rgba(0, 0, 0, 0.4)` |
| Bouton principal | Fond `#4caf50`, texte blanc, `border-radius: 5px` |
| Bouton secondaire | Fond `#808080`, texte blanc |
| Menu contextuel, sous-menu | Fond blanc, ombre plus marquée `0 4px 12px rgba(0, 0, 0, 0.25)` |

Les classes `success` et `error` donnent le fond vert ou rouge à n'importe quel élément.

## Icônes

Icônes **au trait noir** (`stroke="#000"`, `stroke-width="2"`, sans remplissage), dans l'esprit de `file-icon.png` et `folder-icon.png` d'OCN-mouse-campus. Elles sont dessinées en SVG dans `ICONS` (`js/core.js`), car le dépôt d'origine n'a pas de licence. Taille par défaut : 44 px (classe `icon`).

La **souris dessinée** (`mouseSvg`) est l'élément clé du jeu : la partie à utiliser est toujours **en vert**. Gardez ce code couleur pour tout nouveau geste.

## Choix de jeu

- **Pas de cadre ni de pointillés autour de la cible** (fichier à cliquer, dossier où déposer) : il faut la repérer soi-même. Un dossier survolé pendant un glisser-déposer prend seulement un fond vert clair.
- **Pas de compte à rebours**, sauf au niveau 3 du clic gauche et du Grand défi. Le temps est seulement affiché.
- **L'énoncé reste toujours affiché**, en gras. Les réactions du jeu s'affichent en dessous, sans le remplacer.
- **Une erreur est toujours expliquée**, dans le commentaire en rouge.

## Mise en page

Le jeu vise un écran de **1024 × 768** au minimum :

- **Menu :** le chemin fait 968 px de large (6 cartes de 148 px et 5 liaisons de 16 px) et doit tenir en hauteur, sans barre de défilement. Avec 2 lignes, il tient dans 768 px de haut : il y a la place pour 12 ateliers, et **les 12 places sont prises**. Un 13e atelier ajouterait une 3e ligne : il faudra alors revoir la mise en page (par exemple, des cartes plus basses).
- **Plateaux de jeu :** 650 px de large au plus, sauf la mission finale (846 px : la liste de tâches et le bureau côte à côte).
- La page n'est pas prévue pour les téléphones : le jeu sert justement à apprendre la souris.
