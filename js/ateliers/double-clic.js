// Atelier double-clic : ouvrir un dossier avec deux clics rapides.
// Le délai entre les deux clics se resserre : 800 ms d'abord, puis 500 ms
// (le réglage par défaut de Windows) à partir de la 6e manche.
(() => {
    function startDoubleClickGame(game) {
        const { board, ICONS } = game;
        const cols = 8;
        const rows = 5;
        const grid = document.createElement('div');
        grid.className = 'grid';
        grid.style.setProperty('--cols', cols);
        grid.style.setProperty('--rows', rows);
        for (let i = 0; i < cols * rows; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            grid.appendChild(cell);
        }
        board.appendChild(grid);

        let targetIndex = -1;
        let firstClickTime = 0;  // 0 : pas de premier clic en attente
        let locked = false;
        let resetTimer = null;

        function delay() {
            return game.round >= 5 ? 500 : 800;
        }

        function nextTarget() {
            Array.from(grid.children).forEach((cell) => {
                cell.className = 'cell';
                cell.innerHTML = '';
            });
            let index;
            do {
                index = game.randomInt(cols * rows);
            } while (index === targetIndex);
            targetIndex = index;
            const cell = grid.children[targetIndex];
            cell.classList.add('target');
            cell.innerHTML = ICONS.folder;
            firstClickTime = 0;
            locked = false;
            game.setHint('double');
            game.setMessage(game.round === 5
                ? 'Plus rapide maintenant : ouvrez le dossier avec un double-clic.'
                : 'Ouvrez le dossier : cliquez deux fois rapidement avec le bouton gauche.');
        }

        function clearSelection(cell) {
            firstClickTime = 0;
            cell.classList.remove('selected');
        }

        grid.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
            if (locked) return;
            const target = grid.children[targetIndex];
            const cell = e.target.closest('.cell');
            if (cell !== target) {
                clearSelection(target);
                game.setMessage('Presque ! Visez bien le dossier, puis cliquez deux fois.', 'bad');
                return;
            }
            if (e.button !== 0) {
                game.error();
                clearSelection(target);
                target.classList.add('error');
                game.later(() => target.classList.remove('error'), 600);
                game.setMessage('Ce n’est pas le bon bouton : le double-clic se fait avec le bouton gauche.', 'bad');
                return;
            }
            const now = Date.now();
            clearTimeout(resetTimer);
            if (firstClickTime && now - firstClickTime <= delay()) {
                locked = true;
                clearSelection(target);
                target.classList.add('success');
                target.innerHTML = ICONS.folderOpen;
                game.setMessage('Bravo ! Le dossier s’ouvre.', 'good');
                game.success(nextTarget, 900);
                return;
            }
            // Premier clic : le dossier est seulement sélectionné, comme sur un vrai bureau
            firstClickTime = now;
            target.classList.add('selected');
            game.setMessage('Un clic sélectionne le dossier… cliquez encore, vite !');
            resetTimer = game.later(() => {
                if (!firstClickTime) return;
                game.error();
                clearSelection(target);
                game.setMessage('Trop lent : les deux clics doivent se suivre sans attendre. Réessayez.', 'bad');
            }, delay());
        });
        grid.addEventListener('contextmenu', (e) => e.preventDefault());
        grid.addEventListener('auxclick', (e) => e.preventDefault());
        game.onCleanup(() => clearTimeout(resetTimer));

        nextTarget();
    }

    MouseGame.register({
        id: 'double', order: 25, title: 'Double-clic', hint: 'double', rounds: 10,
        text: 'Ouvrez le dossier avec deux clics rapides.',
        start: startDoubleClickGame
    });
})();
