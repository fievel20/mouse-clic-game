# mouse-clic-game
Jeu pour s'entraîner au maniement de la souris, pensé pour les personnes qui débutent avec l'ordinateur.

Même charte graphique que [OCN-mouse-campus](https://github.com/le-campus-numerique/OCN-mouse-campus) : fond gris clair, cases blanches, icônes au trait, vert pour la réussite et rouge pour l'erreur.

## Les ateliers

| Atelier | Ce qu'on pratique |
| --- | --- |
| Clic gauche | Cliquer sur un fichier avec le bouton gauche |
| Clic droit | Ouvrir le menu d'un fichier avec le bouton droit |
| Bouton central | Appuyer sur la molette comme sur un bouton |
| Molette | Tourner la molette pour monter ou descendre un fichier jusqu'au dossier |
| Glisser-déposer | Ranger un fichier dans un dossier, puis trier documents et images |
| Grand défi | Clics gauche, droit et central mélangés |

À chaque consigne, un dessin de souris montre en vert le bouton à utiliser. Chaque atelier se joue en 10 manches (15 pour le Grand défi). On gagne de 1 à 3 étoiles selon le nombre d'erreurs. Les étoiles sont gardées dans le navigateur.

Pas de compte à rebours : le temps est seulement affiché, pour ne pas mettre de pression.

## Lancer le jeu

Ouvrez `index.html` dans un navigateur. Il n'y a rien à installer : c'est du HTML, du CSS et du JavaScript, sans bibliothèque.

Le jeu peut aussi être publié avec GitHub Pages (Settings → Pages → branche `main`).

Sans bouton central (pavé tactile d'ordinateur portable), le bouton « Je n'ai pas de bouton central » passe l'atelier et retire ce bouton du Grand défi.

## Organisation du code

- `js/core.js` : menu, déroulement d'une partie, score, étoiles, dessin de la souris.
- `js/ateliers/*.js` : un fichier par atelier, qui s'enregistre avec `MouseGame.register({ id, title, text, hint, rounds, order, start })`.

Pour ajouter un atelier : créer son fichier dans `js/ateliers/`, puis l'ajouter dans `index.html`. Les scripts sont classiques, sans modules, pour que `index.html` s'ouvre aussi sans serveur.
