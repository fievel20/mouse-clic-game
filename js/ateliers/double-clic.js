// Atelier double-clic : ouvrir un dossier avec deux clics rapides.
// Options du niveau : delay (ms entre les deux clics), named (dossier à trouver parmi d'autres).
(() => {
    function startDoubleClickGame(game, level) {
        const { board, ICONS } = game;
        const cols = level.named ? 6 : 8;
        const rows = level.named ? 4 : 5;
        const grid = document.createElement('div');
        grid.className = 'grid' + (level.named ? ' named' : '');
        grid.style.setProperty('--cols', cols);
        grid.style.setProperty('--rows', rows);
        grid.style.setProperty('--cell', (level.named ? 84 : 60) + 'px');
        for (let i = 0; i < cols * rows; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            grid.appendChild(cell);
        }
        board.appendChild(grid);

        let targetIndex = -1;
        let targetName = '';
        let firstClickTime = 0;  // 0 : pas de premier clic en attente
        let locked = false;
        let resetTimer = null;

        function label(name) {
            return `<span class="label">${name}</span>`;
        }

        function instruction() {
            return level.named
                ? `Ouvrez le dossier « ${targetName} » avec un double-clic.`
                : 'Ouvrez le dossier : cliquez deux fois rapidement avec le bouton gauche.';
        }

        function nextTarget() {
            Array.from(grid.children).forEach((cell) => {
                cell.className = 'cell';
                cell.innerHTML = '';
            });
            const order = game.shuffle(Array.from({ length: cols * rows }, (_, i) => i).filter((i) => i !== targetIndex));
            targetIndex = order[0];
            const target = grid.children[targetIndex];
            target.classList.add('target');
            if (level.named) {
                const names = game.shuffle(game.FOLDERS);
                targetName = names[0];
                target.innerHTML = ICONS.folder + label(targetName);
                names.slice(1).forEach((name, d) => {
                    const cell = grid.children[order[d + 1]];
                    cell.classList.add('decoy');
                    cell.innerHTML = ICONS.folder + label(name);
                });
            } else {
                target.innerHTML = ICONS.folder;
            }
            firstClickTime = 0;
            locked = false;
            game.setHint('double');
            game.setMessage(instruction());
        }

        function clearSelection() {
            firstClickTime = 0;
            clearTimeout(resetTimer);
            grid.querySelectorAll('.selected').forEach((cell) => cell.classList.remove('selected'));
        }

        function flashError(cell) {
            cell.classList.add('error');
            game.later(() => cell.classList.remove('error'), 600);
        }

        grid.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
            if (locked) return;
            const target = grid.children[targetIndex];
            const cell = e.target.closest('.cell');
            if (cell !== target) {
                clearSelection();
                if (cell && cell.classList.contains('decoy')) {
                    game.error();
                    flashError(cell);
                    game.setMessage(`Ce n’est pas le bon dossier. ${instruction()}`, 'bad');
                } else {
                    game.setMessage('Presque ! Visez bien le dossier, puis cliquez deux fois.', 'bad');
                }
                return;
            }
            if (e.button !== 0) {
                game.error();
                clearSelection();
                flashError(target);
                game.setMessage('Ce n’est pas le bon bouton : le double-clic se fait avec le bouton gauche.', 'bad');
                return;
            }
            const now = Date.now();
            if (firstClickTime && now - firstClickTime <= level.delay) {
                locked = true;
                clearSelection();
                target.classList.add('success');
                target.innerHTML = ICONS.folderOpen + (level.named ? label(targetName) : '');
                game.setMessage('Bravo ! Le dossier s’ouvre.', 'good');
                game.success(nextTarget, 900);
                return;
            }
            // Premier clic : le dossier est seulement sélectionné, comme sur un vrai bureau
            clearSelection();
            firstClickTime = now;
            target.classList.add('selected');
            game.setMessage('Un clic sélectionne le dossier… cliquez encore, vite !');
            resetTimer = game.later(() => {
                if (!firstClickTime) return;
                game.error();
                clearSelection();
                game.setMessage('Trop lent : les deux clics doivent se suivre sans attendre. Réessayez.', 'bad');
            }, level.delay);
        });
        grid.addEventListener('contextmenu', (e) => e.preventDefault());
        grid.addEventListener('auxclick', (e) => e.preventDefault());
        game.onCleanup(() => clearTimeout(resetTimer));

        nextTarget();
    }

    MouseGame.register({
        id: 'double', order: 25, title: 'Double-clic', hint: 'double', badge: 'Ouvreur de dossiers',
        text: 'Ouvrez le dossier avec deux clics rapides.',
        levels: [
            { name: 'Deux clics en moins de 0,8 seconde', rounds: 10, delay: 800 },
            { name: 'Deux clics en moins de 0,5 seconde, comme sous Windows', rounds: 10, delay: 500 },
            { name: 'Trouver le bon dossier et l’ouvrir', rounds: 10, delay: 500, named: true }
        ],
        start: startDoubleClickGame
    });
})();
