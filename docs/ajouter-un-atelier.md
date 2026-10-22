# Ajouter un atelier

Ce guide crée pas à pas un atelier d'exemple, **« Cible »** : cliquer sur une cible ronde, de plus en plus petite d'un niveau à l'autre. Le code ci-dessous fonctionne tel quel.

Récapitulatif des étapes :

1. Écrire l'atelier dans `js/ateliers/`.
2. Ajouter son style dans `style.css`.
3. Charger le fichier dans `index.html`.
4. Écrire sa démonstration dans `js/demo.js`.
5. Apprendre au robot de `js/tests.js` à y jouer.
6. Mettre à jour le `README.md` et cette documentation.

## 1. L'atelier : `js/ateliers/cible.js`

```js
// Atelier cible : cliquer sur une cible ronde, de plus en plus petite.
(() => {
    function startTargetGame(game, level) {
        const area = document.createElement('div');
        area.className = 'target-area';
        game.board.appendChild(area);
        let locked = false;

        function nextRound() {
            area.innerHTML = '';
            const target = document.createElement('div');
            target.className = 'round-target';
            target.style.width = target.style.height = level.size + 'px';
            target.style.left = game.randomInt(600 - level.size) + 'px';
            target.style.top = game.randomInt(300 - level.size) + 'px';
            area.appendChild(target);
            locked = false;
            game.setHint('left');
            game.setInstruction('Cliquez sur la cible avec le bouton gauche.');
        }

        area.addEventListener('mousedown', (e) => {
            // Empêche le défilement automatique du bouton central
            if (e.button === 1) e.preventDefault();
            if (locked) return;
            const target = e.target.closest('.round-target');
            if (!target) {
                // Geste raté : un conseil, mais pas d'erreur
                game.setFeedback('Presque ! Visez bien la cible.', 'bad');
                return;
            }
            if (e.button !== 0) {
                // Mauvais geste : une erreur, toujours expliquée
                game.error();
                game.setFeedback('Ce n’est pas le bon bouton : utilisez le bouton gauche.', 'bad');
                return;
            }
            // Bloque les clics jusqu'à la manche suivante, pour ne pas compter deux réussites
            locked = true;
            target.classList.add('success');
            game.setFeedback('Bravo !', 'good');
            game.success(nextRound);
        });
        area.addEventListener('contextmenu', (e) => e.preventDefault());
        nextRound();
    }

    MouseGame.register({
        id: 'cible', order: 15, title: 'Cible', hint: 'left', badge: 'Tireur d’élite',
        text: 'Cliquez sur la cible, de plus en plus petite.',
        levels: [
            { name: 'Une grande cible', rounds: 10, size: 80 },
            { name: 'Une cible moyenne', rounds: 10, size: 50 },
            { name: 'Une toute petite cible', rounds: 10, size: 28 }
        ],
        start: startTargetGame
    });
})();
```

Points à retenir :

- **Tout le code est dans une fonction appelée immédiatement** `(() => { … })()`, pour ne rien ajouter à l'espace global.
- **Le plateau est construit dans `game.board`.** Le noyau le vide à chaque nouvelle partie.
- **Les réglages de difficulté sont dans `levels`** (ici `size`), et non dans le code. Pour rendre un niveau plus dur, il suffit de changer un nombre.
- **`order: 15`** place l'atelier entre « Clic gauche » (10) et « Clic droit » (20). Les joueurs qui avaient déjà commencé les ateliers suivants les gardent ouverts.
- **Si l'atelier pose une minuterie**, utilisez `game.later(…)`. **S'il écoute `document` ou `window`**, retirez l'écouteur dans `game.onCleanup(…)`. Voir [Architecture](architecture.md#arrêt-propre--runid-later-et-oncleanup).

## 2. Le style : `style.css`

Reprenez les codes de la [charte graphique](charte-graphique.md) : fond blanc, coins arrondis de 5 px, ombre légère.

```css
/* Atelier cible */
.target-area {
    position: relative;
    width: 600px;
    height: 300px;
    background-color: #ffffff;
    border-radius: 5px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.round-target {
    position: absolute;
    border-radius: 50%;
    background-color: #808080;
    cursor: pointer;
}
```

La classe `success` (fond vert) existe déjà, comme `error` (fond rouge).

## 3. Le chargement : `index.html`

Ajoutez une balise avec les autres ateliers, après `js/core.js` et `js/demo.js` :

```html
<script src="js/ateliers/cible.js"></script>
```

L'atelier apparaît sur le chemin, à la place donnée par `order`.

## 4. La démonstration : `js/demo.js`

Sans scène, la fenêtre de démo resterait vide à la première visite. Ajoutez une scène dans `SCENES`, sous le nom de l'`id` de l'atelier :

```js
        async cible() {
            setMouse('left');
            const target = put('', 240, 95, 'demo-target');
            await caption('Une cible apparaît : il faut cliquer dessus.', 2400);
            captionElement.textContent = 'Amenez la flèche sur la cible…';
            await moveToEl(target);
            captionElement.textContent = '…puis appuyez et relâchez le bouton gauche.';
            await wait(800);
            await press('left');
            target.classList.add('done');
            await caption('Bravo ! À chaque niveau, la cible est plus petite.', 2400);
        },
```

Et son style :

```css
.demo-target {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: #808080;
}

.demo-target.done {
    background-color: #4caf50;
}
```

Les outils disponibles (`put`, `moveTo`, `press`…) sont décrits dans la [référence](reference-api.md#outils-pour-écrire-une-scène-internes-à-demojs). Une bonne scène dure 8 à 15 secondes : elle montre le geste, avec une phrase courte par étape.

## 5. Les tests : `js/tests.js`

Le robot doit savoir jouer à l'atelier. Ajoutez un cas au **début** de la fonction `step()` :

```js
        const roundTarget = $('.round-target');
        if (roundTarget) {
            press(roundTarget, 0);
            return;
        }
```

C'est tout pour le cas général : `run()` joue automatiquement chaque niveau de chaque atelier enregistré, et vérifie qu'il se termine sans erreur avec les bonnes annonces (niveau débloqué, atelier suivant, badge). Les vérifications du chemin (nombre de badges, de liaisons, étape proposée) se calculent à partir des ateliers enregistrés : elles s'adaptent seules.

Ajoutez aussi au moins un **scénario d'erreur** dans `scenarios()`, pour vérifier qu'un mauvais geste est bien compté :

```js
        MouseGame.startActivity(byId('cible'), 1);
        press($('.round-target'), 2);
        log(errorsCount() === 1, 'Cible : le mauvais bouton compte une erreur');
```

Ouvrez ensuite `index.html?test` : tout doit être ✅. Voir [Tests automatiques](tests.md).

## 6. La documentation

- Dans le `README.md` à la racine : une ligne dans le tableau des ateliers et le nombre de badges.
- Dans [Architecture](architecture.md) : une ligne dans le tableau des ateliers.
- Dans la [référence](reference-api.md#réglages-des-niveaux-atelier-par-atelier) : les réglages de niveau de l'atelier.

## Vérifier à la main

Les tests simulent les gestes par programme. Ils vérifient la logique, pas la sensation avec une vraie souris. Avant de proposer la pull request :

- jouez au moins un niveau avec la vraie souris ;
- regardez la démo en entier, à vitesse réelle ;
- vérifiez que le menu tient toujours dans un écran de 1024 × 768, sans barre de défilement.
