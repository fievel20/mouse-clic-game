# Référence de l'API

## Description d'un atelier

Un atelier est un objet passé à `MouseGame.register()` :

```js
MouseGame.register({
    id: 'gauche',                 // identifiant unique, sert de clé de sauvegarde (ne plus le changer)
    order: 10,                    // place sur le chemin (ordre croissant)
    title: 'Clic gauche',         // nom affiché
    text: 'Cliquez sur le fichier avec le bouton gauche.',  // phrase de la carte du menu
    hint: 'left',                 // dessin de souris de la carte (voir « Dessins de souris »)
    badge: 'As du clic gauche',   // nom du badge gagné au dernier niveau
    usesMiddle: false,            // facultatif : affiche « Je n'ai pas de bouton central »
    levels: [                     // 3 niveaux, du plus simple au plus difficile
        { name: 'Un grand fichier à cliquer', rounds: 10 },
        { name: 'Cases plus petites, attention aux autres icônes', rounds: 10, cols: 10, rows: 6, cell: 46, distractors: 8 },
        { name: 'Cliquez avant que le fichier ne change de place', rounds: 10, cols: 10, rows: 6, cell: 46, distractors: 10, timeLimit: 4000 }
    ],
    start: (api, level) => { /* construit le plateau dans api.board */ }
});
```

| Champ | Obligatoire | Rôle |
| --- | --- | --- |
| `id` | oui | Identifiant unique. Il sert de clé dans la sauvegarde (`"gauche.1"`) et de nom de la scène de démo. Le changer fait perdre la progression enregistrée. |
| `order` | oui | Place sur le chemin. Laissez des écarts (10, 20…) pour pouvoir insérer un atelier plus tard. |
| `title`, `text` | oui | Textes de la carte du menu. |
| `hint` | oui | Dessin de souris de la carte et des médailles. |
| `badge` | oui | Nom du badge. |
| `usesMiddle` | non | `true` si l'atelier demande le bouton central. |
| `levels` | oui | Tableau des niveaux. Chaque niveau a au moins `name` (sous-titre affiché) et `rounds` (nombre de réussites pour finir). Les autres champs sont libres : ce sont les réglages lus par `start`. |
| `start(api, level)` | oui | Lance le niveau. `level` est l'objet du niveau, complété par `level.number` (1, 2 ou 3). |

## L'objet `api` reçu par `start`

| Membre | Description |
| --- | --- |
| `board` | Élément `#board`, vide au départ. L'atelier y construit son plateau. Il est en `position: relative`. |
| `setInstruction(texte)` | Affiche l'**énoncé** de la manche, en gras. Il reste affiché jusqu'à l'énoncé suivant. Le commentaire précédent est effacé. |
| `setFeedback(texte, genre = 'info')` | Affiche un **commentaire** sous l'énoncé, sans l'effacer. `genre` : `'good'` (vert, réussite), `'bad'` (rouge, erreur ou geste raté) ou `'info'` (gris foncé, simple conseil). `setFeedback('')` l'efface. |
| `setHint(partie)` | Change le dessin de souris à côté de la consigne. |
| `success(next, delay = 700)` | Compte une réussite. Après `delay` ms, appelle `next()`, ou termine la partie si `level.rounds` est atteint. Bloquez les gestes entre-temps, sinon une même manche peut compter deux fois. |
| `error()` | Compte une erreur. Les étoiles dépendent du nombre d'erreurs. |
| `round` | Nombre de réussites déjà comptées, en lecture seule. Utile pour faire évoluer la difficulté pendant un niveau. En mode libre, il repart de 0 à chaque exercice. |
| `later(fn, ms)` | Comme `setTimeout`, mais annulé si la partie s'arrête, et accéléré en mode test. **À utiliser à la place de `setTimeout`.** |
| `onCleanup(fn)` | Enregistre une fonction appelée à l'arrêt de la partie : retour au menu, nouvelle partie ou démo. |
| `randomInt(max)` | Entier aléatoire entre `0` et `max - 1`. |
| `shuffle(liste)` | Copie mélangée d'une liste. |
| `getSetting(nom)` | Lit un réglage enregistré, par exemple `'noMiddle'`. |
| `ICONS` | Icônes SVG au trait : `file`, `folder`, `folderOpen`, `image`, `music`. Ce sont des chaînes HTML avec la classe `icon`. |
| `FILES` | 12 fichiers d'exemple `{ name, icon }`, par exemple `{ name: 'photo.jpg', icon: 'image' }`. |
| `FOLDERS` | 8 noms de dossiers : `'Photos'`, `'Documents'`… |

### Bonnes pratiques

- **L'énoncé dit quoi faire, le commentaire dit comment ça s'est passé.** L'énoncé (`setInstruction`) est donné une fois par manche. Pour réagir à un geste, utilisez `setFeedback`, et ne répétez pas l'énoncé dans le commentaire, puisqu'il reste affiché juste au-dessus.
- **L'énoncé doit rester vrai pendant toute la manche.** Si une indication peut changer en cours de manche (par exemple le sens de la molette quand le fichier dépasse le dossier), mettez-la dans le commentaire.
- **Une erreur, c'est un mauvais geste**, comme le mauvais bouton, le mauvais fichier ou un mur touché. Un geste simplement raté (clic à côté, fichier lâché dans le vide) donne un commentaire par `setFeedback(…, 'bad')`, sans `error()`.
- **Expliquez toujours l'erreur** dans le message : « Ce n'est pas le bon bouton : utilisez le bouton droit », plutôt que « Erreur ».
- **Pas de cadre autour de la cible.** C'est un choix de jeu : il faut repérer soi-même le fichier ou le dossier.
- **Empêchez les comportements du navigateur** qui gêneraient : menu contextuel (`contextmenu`), défilement automatique du bouton central (`preventDefault` sur `mousedown` quand `button === 1`).

## Dessins de souris

`setHint(partie)` et le champ `hint` acceptent ces valeurs :

| Valeur | Dessin |
| --- | --- |
| `left`, `right`, `middle` | Le bouton indiqué en vert |
| `double`, `triple` | Bouton gauche en vert, avec « ×2 » ou « ×3 » |
| `drag` | Bouton gauche en vert, avec une flèche vers la droite |
| `wheel-up`, `wheel-down`, `wheel` | Molette en vert, avec une flèche vers le haut, vers le bas, ou les deux |
| `ctrl`, `shift` | Bouton gauche en vert, avec le nom de la touche à garder enfoncée (« Ctrl », « Maj ») |
| `move` | Aucun bouton, avec 4 flèches (déplacer sans cliquer) |
| `all` | Les trois boutons en vert |

Pour ajouter un dessin, complétez `mouseSvg()` dans `js/core.js`. Les flèches se dessinent à droite de la souris, dans la zone `x` de 70 à 90 du `viewBox`.

## Réglages des niveaux, atelier par atelier

| Atelier | Réglages lus dans `level` |
| --- | --- |
| Survol | `mode` : `'tooltip'` (bulle d'aide), `'submenu'` (sous-menu), `'read'` (lire les bulles) |
| Clic gauche, droit, central, Grand défi | `cols`, `rows`, `cell` (taille des cases en px), `distractors` (nombre d'icônes leurres), `named` (fichiers nommés), `timeLimit` (ms), `menuAction` (clic droit puis choix dans le menu), `tabs` (bouton central : faux navigateur) |
| Double-clic | `delay` (ms maximum entre les deux clics), `named` (dossier à trouver par son nom) |
| Molette | `count` (nombre de lignes, sinon colonne de 7 cases), `named` (fichier à trouver par son nom) |
| Barre de défilement | `count`, `named`, `tools` (outils autorisés : `'thumb'`, `'arrows'`, `'track'` ; tous si absent), `near` (cible juste hors de vue) |
| Glisser-déposer | `kinds` (types de fichiers à trier : `'doc'`, `'image'`, `'music'`), `size` (labyrinthe de `size × size` cases, impair) |
| Sélection de texte | `mode` : `'word'`, `'group'`, `'shortcuts'` (double et triple-clic) |
| Sélection multiple | `mode` : `'ctrl'` (Ctrl + clic), `'shift'` (Maj + clic), `'lasso'` (rectangle de sélection) |
| Ranger le bureau | `mission` : numéro de la mission dans `MISSIONS` (0, 1 ou 2). `rounds` est remplacé par le nombre de tâches. |

## Écrire une mission (`js/ateliers/mission.js`)

Une mission décrit un petit bureau et une liste de tâches, dans le tableau `MISSIONS` :

```js
{
    items: [
        { name: 'Photos', kind: 'folder', x: 24, y: 20, contents: ['vacances.jpg'] },
        { name: 'plage.jpg', icon: 'image', x: 190, y: 40 }
    ],
    tasks: [
        { hint: 'double', text: 'Ouvrez le dossier « Photos » : double-cliquez dessus.', action: { type: 'open', name: 'Photos' } },
        { hint: 'drag', text: 'Rangez « plage.jpg » dans « Photos ».', action: { type: 'move', names: ['plage.jpg'], into: 'Photos' } }
    ]
}
```

- **`items`** : les icônes du bureau, positionnées en pixels dans une zone de 620 × 340. Une icône fait 76 × 80. Un dossier a `kind: 'folder'` et un contenu (`contents`), affiché quand on l'ouvre. Un fichier a une icône (`file`, `image`, `music`).
- **`tasks`** : à faire dans l'ordre. `text` est la consigne. Le début de `text`, jusqu'au « : », sert d'intitulé dans la liste à cocher. `hint` est le dessin de souris.
- **`action`** : ce qui valide la tâche. Le robot des tests la lit aussi, dans `data-action` du bureau.

| `action.type` | Validée quand… | Champs |
| --- | --- | --- |
| `open` | un dossier ou fichier est ouvert (double-clic ou « Ouvrir ») | `name` |
| `close` | la fenêtre est fermée par ✕ | — |
| `rename` | « Renommer » est choisi sur l'icône. Le jeu tape le nouveau nom à la place du joueur. | `name`, `to` |
| `delete` | « Supprimer » est choisi sur l'icône | `name` |
| `move` | ces fichiers sont lâchés ensemble sur ce dossier | `names`, `into` |
| `select` | la sélection contient exactement ces fichiers (clic, Ctrl + clic ou rectangle) | `names` |
| `scroll-end` | le document ouvert est lu jusqu'en bas | — |
| `textselect` | ce texte est sélectionné dans le document ouvert | `text` |

`rename`, `delete` et `move` modifient le bureau. S'ils ne correspondent pas à la tâche en cours, ils sont **refusés** et comptent une erreur : le bureau n'est jamais abîmé par une fausse manœuvre. Les autres actions ne sont jamais refusées.

Le seul document disponible est la lettre `LETTER`, ouverte pour tout fichier qui n'est pas un dossier.

## `window.MouseGame`

Ce qui est accessible hors du noyau :

| Membre | Utilisé par | Description |
| --- | --- | --- |
| `register(atelier)` | ateliers | Enregistre un atelier. |
| `start()` | `index.html` | Affiche le menu. |
| `startActivity(atelier, niveau)` | tests | Lance un niveau directement, sans vérifier qu'il est ouvert. |
| `startFreeMode()`, `isFreeUnlocked()` | menu, tests | Lance le mode libre ; indique s'il est débloqué. |
| `showMenu()` | tests | Revient au menu. |
| `activities` | tests | Ateliers enregistrés, triés par `order`. |
| `mouseSvg(partie)` | demo.js | Code SVG d'un dessin de souris. |
| `ICONS` | demo.js | Les icônes, comme dans `api.ICONS`. |
| `isTest`, `speed` | demo.js, index.html | Mode test actif, et facteur de vitesse des pauses (`0.02` en test, `1` sinon). |
| `resetProgress()` | tests | Efface la progression et les réglages. |

## `window.MouseDemo`

| Membre | Description |
| --- | --- |
| `play(atelier, quandFini)` | Ouvre la fenêtre de démo et joue la scène `SCENES[atelier.id]`. `quandFini` est appelé quand le joueur clique sur « C'est parti ! ». |
| `has(id)` | `true` si une scène existe pour cet atelier. |

Pendant la scène, `#demoModal` porte `data-state="playing"`, puis `"finished"` à la fin. Les tests s'en servent.

### Outils pour écrire une scène (internes à `demo.js`)

La scène fait 340 × 210 pixels. Les coordonnées sont relatives à son coin haut gauche.

| Outil | Description |
| --- | --- |
| `put(html, x, y, classe)` | Ajoute un élément centré sur `(x, y)`. Les classes `demo-menu` et `demo-highlight` le placent par son coin haut gauche. |
| `file(x, y)`, `folder(x, y, nom?)` | Ajoute une icône de fichier ou de dossier. |
| `setMouse(partie)` | Change la grande souris dessinée à droite. |
| `await caption(texte, pause = 2000)` | Affiche la légende, puis attend. |
| `await moveTo(x, y)`, `await moveToEl(el)` | Déplace la flèche en 0,9 s. Si `carried` désigne un élément, il suit la flèche (glisser-déposer). |
| `await press(partie, maintenir = false)` | Enfonce un bouton de la souris dessinée, avec un cercle de clic sous la flèche. Avec `maintenir`, le bouton reste enfoncé jusqu'à `release(partie)`. |
| `await notch()` | Un cran de molette, sans cercle de clic. |
| `await wait(ms)` | Pause. Elle est accélérée en mode test, et interrompue si la démo est relancée ou fermée. |
