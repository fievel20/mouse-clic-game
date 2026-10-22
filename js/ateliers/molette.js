// Atelier molette.
// Niveau 1 : chaque cran déplace le fichier d'une case.
// Niveaux 2 et 3 : faire défiler une vraie liste pour trouver un élément, puis cliquer dessus.
(() => {
    function startWheelGame(game) {
        const { board, ICONS } = game;
        const size = 7;
        const layout = document.createElement('div');
        layout.className = 'wheel-layout';
        const grid = document.createElement('div');
        grid.className = 'grid';
        grid.style.setProperty('--cols', 1);
        grid.style.setProperty('--rows', size);
        for (let i = 0; i < size; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            grid.appendChild(cell);
        }
        const help = document.createElement('div');
        help.className = 'wheel-help';
        help.innerHTML = '<span>↑ Molette vers l’écran</span><span>↓ Molette vers vous</span>';
        layout.appendChild(grid);
        layout.appendChild(help);
        board.appendChild(layout);

        let position = 0;
        let goal = 0;
        let accumulated = 0;
        let locked = false;
        let settleTimer = null;

        function draw() {
            Array.from(grid.children).forEach((cell, i) => {
                cell.className = 'cell' + (i === goal ? ' goal' : '');
                cell.innerHTML = i === position ? ICONS.file : (i === goal ? ICONS.folder : '');
            });
        }

        function nextRound() {
            do {
                goal = game.randomInt(size);
            } while (Math.abs(goal - position) < 2);
            locked = false;
            accumulated = 0;
            const down = goal > position;
            game.setHint(down ? 'wheel-down' : 'wheel-up');
            game.setMessage(down
                ? 'Tournez la molette vers vous pour descendre le fichier jusqu’au dossier.'
                : 'Tournez la molette vers l’écran pour monter le fichier jusqu’au dossier.');
            draw();
        }

        function onWheel(e) {
            e.preventDefault();
            if (locked) return;
            // Normalise lignes / pages en pixels
            const factor = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
            accumulated += e.deltaY * factor;
            const threshold = 80;
            let moved = false;
            while (Math.abs(accumulated) >= threshold) {
                const step = accumulated > 0 ? 1 : -1;
                accumulated -= step * threshold;
                const nextPosition = Math.min(size - 1, Math.max(0, position + step));
                if (nextPosition !== position) {
                    position = nextPosition;
                    moved = true;
                }
            }
            if (!moved) return;
            draw();
            clearTimeout(settleTimer);
            if (position === goal) {
                game.setMessage('Vous y êtes… ne bougez plus !', 'good');
                // Le fichier doit rester un instant sur le dossier
                settleTimer = game.later(() => {
                    if (position !== goal || locked) return;
                    locked = true;
                    grid.children[goal].classList.add('success');
                    game.setMessage('Bravo !', 'good');
                    game.success(nextRound);
                }, 500);
            } else {
                const down = goal > position;
                game.setHint(down ? 'wheel-down' : 'wheel-up');
                game.setMessage(down ? 'Encore un peu : molette vers vous.' : 'Encore un peu : molette vers l’écran.');
            }
        }

        document.addEventListener('wheel', onWheel, { passive: false });
        game.onCleanup(() => {
            document.removeEventListener('wheel', onWheel);
            clearTimeout(settleTimer);
        });

        position = game.randomInt(size);
        nextRound();
    }

    const BASES = ['anniversaire', 'banque', 'budget', 'chanson', 'courses', 'cv', 'ecole', 'facture', 'impots', 'jardin',
        'lettre', 'medecin', 'notes', 'photo', 'plage', 'recette', 'vacances', 'voiture', 'assurance', 'mutuelle'];
    const YEARS = ['2022', '2023', '2024'];

    // Options du niveau : count (éléments dans la liste), named (trouver par le nom, liste triée)
    function startListGame(game, level) {
        const { board, ICONS } = game;
        const list = document.createElement('div');
        list.className = 'scroll-list';
        board.appendChild(list);

        let items = [];
        let wanted = -1;
        let locked = false;

        function buildList() {
            if (level.named) {
                // Comme dans l'explorateur de fichiers : tri par ordre alphabétique
                const names = [];
                BASES.forEach((base) => YEARS.forEach((year) => names.push(`${base}-${year}.txt`)));
                items = names.slice(0, level.count).sort().map((name) => ({ name, icon: 'file' }));
            } else {
                items = Array.from({ length: level.count }, (_, i) => ({ name: `Document ${i + 1}`, icon: 'file' }));
            }
            list.innerHTML = items.map((item, i) => `<div class="row" data-index="${i}">${ICONS[item.icon]}<span>${item.name}</span></div>`).join('');
        }

        function isVisible(row) {
            const r = row.getBoundingClientRect();
            const l = list.getBoundingClientRect();
            return r.bottom > l.top && r.top < l.bottom;
        }

        function nextRound() {
            const rows = Array.from(list.children);
            if (!level.named) {
                // Un seul dossier caché dans la liste, ailleurs que dans la partie visible
                rows.forEach((row, i) => {
                    row.className = 'row';
                    row.innerHTML = `${ICONS.file}<span>${items[i].name}</span>`;
                });
            } else {
                rows.forEach((row) => { row.className = 'row'; });
            }
            const hidden = rows.map((row, i) => i).filter((i) => !isVisible(rows[i]) && Math.abs(i - wanted) > 3);
            wanted = hidden[game.randomInt(hidden.length)];
            const row = rows[wanted];
            if (!level.named) {
                row.innerHTML = `${ICONS.folder}<span>Mon dossier</span>`;
            }
            const below = row.getBoundingClientRect().top > list.getBoundingClientRect().bottom;
            locked = false;
            game.setHint('wheel');
            if (level.named) {
                game.setMessage(`Trouvez « ${items[wanted].name} » dans la liste, puis cliquez dessus.`);
            } else {
                game.setMessage(below
                    ? 'Un dossier est caché plus bas : molette vers vous, puis cliquez sur le dossier.'
                    : 'Un dossier est caché plus haut : molette vers l’écran, puis cliquez sur le dossier.');
            }
        }

        list.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
            const row = e.target.closest('.row');
            if (!row || locked || e.button !== 0) return;
            if (Number(row.dataset.index) === wanted) {
                locked = true;
                row.classList.add('success');
                game.setMessage('Bravo, vous l’avez trouvé !', 'good');
                game.success(nextRound, 900);
            } else {
                game.error();
                row.classList.add('error');
                game.later(() => row.classList.remove('error'), 600);
                game.setMessage(level.named
                    ? `Ce n’est pas « ${items[wanted].name} ». Lisez bien le nom.`
                    : 'Ce n’est pas le dossier. Continuez à faire défiler.', 'bad');
            }
        });
        list.addEventListener('contextmenu', (e) => e.preventDefault());

        buildList();
        nextRound();
    }

    MouseGame.register({
        id: 'molette', order: 40, title: 'Molette', hint: 'wheel-down', badge: 'Roi du défilement',
        text: 'Faites tourner la molette pour faire défiler.',
        levels: [
            { name: 'Déplacer le fichier cran par cran', rounds: 10 },
            { name: 'Faire défiler une liste pour trouver le dossier', rounds: 8, count: 30 },
            { name: 'Trouver un fichier par son nom dans une longue liste', rounds: 8, count: 60, named: true }
        ],
        start: (game, level) => (level.count ? startListGame(game, level) : startWheelGame(game))
    });
})();
