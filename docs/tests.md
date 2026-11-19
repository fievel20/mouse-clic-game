# Tests automatiques

## Lancer les tests

Ouvrez **`index.html?test`** dans un navigateur. Un rapport s'affiche en haut à droite, avec une ligne ✅ ou ❌ par vérification, puis le total (par exemple « ✅ 58 / 58 tests réussis »). La suite dure une dizaine de secondes.

Le résultat est aussi disponible dans la console du navigateur :

```js
window.testResults   // { passed: 58, total: 58, results: [{ ok: true, text: '…' }, …] }
```

Les tests ont été mis au point avec un petit serveur local (voir [Lancer et déployer](deploiement.md)). Ils sont conçus pour fonctionner aussi en ouvrant le fichier directement (`file://`), puisque le code n'utilise que des scripts classiques, mais ce mode n'a pas été vérifié systématiquement.

## Ce que change le mode test

`?test` est détecté par `js/core.js` (`MouseGame.isTest`) :

- **Les pauses sont 50 fois plus courtes** (`MouseGame.speed = 0.02`). Cela concerne tout ce qui passe par `api.later` : délai entre deux manches, temps limité, délai du double-clic, attente des démos.
- **La progression est enregistrée à part**, sous les clés `test.mouseClicGame.*`. Les vraies étoiles ne sont jamais touchées.
- **Les démos ne s'ouvrent pas automatiquement** à la première visite d'un atelier. Elles sont testées séparément.
- `js/tests.js` est ajouté à la page, et lance `run()` tout de suite.

Attention : les seuils comparés au temps réel, comme le délai maximum entre les deux clics d'un double-clic (`Date.now()`), ne sont **pas** accélérés. Le robot clique instantanément, donc il reste dans les temps.

## Ce qui est vérifié

`run()` enchaîne cinq familles de vérifications :

1. **Le départ** : tous les ateliers sont ouverts, chacun au niveau 1 seulement, avec « 0 / N » badges, et on peut lancer directement le dernier atelier du chemin.
2. **Tous les niveaux de tous les ateliers**, dans l'ordre du chemin. Le robot joue chaque niveau sans faute (20 secondes au plus par niveau), puis le test vérifie :
   - 0 erreur ;
   - « niveau suivant débloqué », sauf au dernier niveau ;
   - « nouvel atelier sur le chemin », après le niveau 1 (sauf pour le dernier atelier) ;
   - « nouveau badge », après le dernier niveau ;
   - « tous les badges » (le diplôme), après le tout dernier niveau.
3. **Le chemin** : à la fin (tous les badges, chemin tout vert, « Atelier suivant » proposé à la fin de chaque atelier) et sans bouton central. Le **mode libre** est vérifié aussi : invisible au départ, débloqué à la fin, puis 25 réussites d'affilée dans au moins 5 ateliers différents, sans que la partie se termine.
4. **Les scénarios d'erreur** : un mauvais geste par atelier, pour vérifier qu'il compte une erreur, ou au contraire qu'un geste refusé n'en compte pas.
5. **Les démonstrations** : chaque scène se joue jusqu'au bout, et « Revoir la démo » relance bien la partie.

## Le robot

La fonction `step()` regarde ce qui est affiché et fait **une** action :

| À l'écran | Action du robot |
| --- | --- |
| Liste avec barre de défilement | Clique la ligne si elle est visible, sinon flèche (niveau 2) ou glisser de l'ascenseur |
| Écran Windows (boutons, barre des tâches, fenêtres, défi) | Lit la tâche (`data-task`) : bouton de la fenêtre, icône de la barre des tâches, double-clic sur la barre de titre, glisser jusqu'au bord ou au coin demandé, puis clic sur la vignette demandée |
| Bureau de la mission | Lit l'action attendue (`data-action`) et la fait : double-clic, menu du clic droit, glisser, Ctrl + clic, rectangle, défilement, sélection de texte |
| Explorateur, liste ou bureau de la sélection multiple | Clic puis Ctrl + clic sur les fichiers demandés, ou clic puis Maj + clic, ou rectangle autour des photos |
| Page de texte | Sélectionne le texte demandé, avec le bon nombre de clics (1, 2 ou 3) |
| Atelier Survol | Survole la cible, ou le menu puis le sous-menu, ou clique le fichier nommé |
| Menu contextuel ouvert | Clique l'action demandée |
| Faux navigateur | Bouton central sur le lien demandé |
| Liste de la molette | Fait défiler jusqu'à l'élément, puis clique |
| Colonne de la molette | Un cran de molette vers le dossier |
| Labyrinthe | Calcule le plus court chemin (`mazePath`) et y fait glisser le fichier |
| Dossiers à trier | Fait glisser le fichier sur le bon dossier |
| Grille avec `.cell.target` | Clique avec le bouton indiqué par la consigne, ou double-clique |

`playLevel()` appelle `step()` toutes les 50 ms, jusqu'à la fenêtre de résultat.

Le robot lit la **consigne** pour savoir quoi faire : les textes entre « guillemets » (`quoted()`) et des mots comme « droit » ou « Double-cliquez ». **Si vous changez la formulation d'une consigne, relancez les tests.**

Attention aux expressions régulières : `\w` ne reconnaît pas les lettres accentuées. Pour un mot comme « deuxième », utilisez `\S+` ou une classe explicite comme `[A-Za-zÀ-ÿ]`.

### Outils pour simuler les gestes

| Outil | Geste simulé |
| --- | --- |
| `press(el, bouton)` | `mousedown` avec le bouton 0 (gauche), 1 (central) ou 2 (droit) |
| `pressWith(el, touches)` | Clic gauche avec des touches enfoncées, par exemple `{ ctrlKey: true }` ou `{ shiftKey: true }` |
| `lassoAround(éléments)` | Trace un rectangle de sélection autour des éléments donnés |
| `pointer(el, type, {x, y})` | Un événement `pointerdown`, `pointermove` ou `pointerup` à une position |
| `hover(el)` | Un `mousemove` sur l'élément |
| `selectText(p, début, fin, clics)` | Sélectionne du texte dans un paragraphe, puis relâche le bouton avec 1, 2 ou 3 clics |
| `dragThumbTo(vue, position)` | Fait glisser l'ascenseur jusqu'à une position de défilement |
| `center(el)` | Centre d'un élément à l'écran |

## Faire tourner les tests dans une vraie fenêtre

Les gestes qui visent un point précis de l'écran (labyrinthe, bords et coins de l'atelier Fenêtres, rectangle de sélection) ont besoin d'une page **affichée**, avec une vraie taille. Dans un onglet caché ou réduit, la page mesure 0 × 0 pixel, et ces tests échouent sans que le jeu soit en cause. Gardez l'onglet visible pendant les tests, idéalement en 1024 × 768 ou plus.

## Limites

Le robot déclenche les événements par programme. Il vérifie **la logique** du jeu, mais pas :

- la sensation avec une vraie souris (vitesse, précision, mouvements rapides) ;
- l'apparence (chevauchements, texte coupé, page qui dépasse de l'écran) ;
- les différences entre navigateurs.

Plusieurs bugs n'ont été trouvés qu'à la main, avec une vraie souris : un glisser rapide qui traversait les murs du labyrinthe, ou le 2e clic d'un triple-clic compté comme une erreur. **Testez toujours à la main** ce que vous modifiez, en plus de `?test`.
