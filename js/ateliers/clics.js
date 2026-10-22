// Ateliers de clic : gauche, droit, central et grand défi (mélange).
(() => {
    const BUTTON_NAMES = { 0: 'gauche', 1: 'central (la molette)', 2: 'droit' };
    const BUTTON_PARTS = { 0: 'left', 1: 'middle', 2: 'right' };

    function startClickGame(game, buttons) {
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
        let expected = buttons[0];
        let locked = false;

        function nextTarget() {
            grid.querySelectorAll('.cell').forEach((cell) => {
                cell.className = 'cell';
                cell.innerHTML = '';
            });
            board.querySelectorAll('.context-menu').forEach((m) => m.remove());
            let index;
            do {
                index = game.randomInt(cols * rows);
            } while (index === targetIndex);
            targetIndex = index;
            expected = buttons[game.randomInt(buttons.length)];
            const cell = grid.children[targetIndex];
            cell.classList.add('target');
            cell.innerHTML = ICONS.file;
            game.setHint(BUTTON_PARTS[expected]);
            game.setMessage(`Cliquez sur le fichier avec le bouton ${BUTTON_NAMES[expected]}.`);
            locked = false;
        }

        function showContextMenu(cell) {
            const contextMenu = document.createElement('div');
            contextMenu.className = 'context-menu';
            contextMenu.innerHTML = '<div>Ouvrir</div><div>Copier</div><div>Renommer</div><div>Supprimer</div>';
            contextMenu.style.left = (cell.offsetLeft + 40) + 'px';
            contextMenu.style.top = (cell.offsetTop + 40) + 'px';
            board.appendChild(contextMenu);
        }

        grid.addEventListener('mousedown', (e) => {
            // Empêche le défilement automatique du bouton central
            if (e.button === 1) e.preventDefault();
            if (locked) return;
            const cell = e.target.closest('.cell');
            if (cell !== grid.children[targetIndex]) {
                game.setMessage('Presque ! Visez bien le fichier, puis cliquez.', 'bad');
                return;
            }
            if (e.button === expected) {
                locked = true;
                cell.classList.add('success');
                if (expected === 2) showContextMenu(cell);
                game.setMessage(expected === 2 ? 'Bravo ! Le clic droit ouvre un menu.' : 'Bravo !', 'good');
                // Laisse le temps de voir le menu contextuel
                game.success(nextTarget, expected === 2 ? 1600 : 700);
            } else {
                game.error();
                cell.classList.add('error');
                game.setMessage(`Ce n'est pas le bon bouton : utilisez le bouton ${BUTTON_NAMES[expected]}.`, 'bad');
                game.later(() => cell.classList.remove('error'), 600);
            }
        });
        grid.addEventListener('contextmenu', (e) => e.preventDefault());
        grid.addEventListener('auxclick', (e) => e.preventDefault());

        nextTarget();
    }

    MouseGame.register({
        id: 'gauche', order: 10, title: 'Clic gauche', hint: 'left', rounds: 10,
        text: 'Cliquez sur le fichier avec le bouton gauche.',
        start: (game) => startClickGame(game, [0])
    });
    MouseGame.register({
        id: 'droit', order: 20, title: 'Clic droit', hint: 'right', rounds: 10,
        text: 'Ouvrez le menu du fichier avec le bouton droit.',
        start: (game) => startClickGame(game, [2])
    });
    MouseGame.register({
        id: 'central', order: 30, title: 'Bouton central', hint: 'middle', rounds: 10, usesMiddle: true,
        text: 'Appuyez sur la molette, comme un bouton.',
        start: (game) => startClickGame(game, [1])
    });
    MouseGame.register({
        id: 'melange', order: 90, title: 'Grand défi', hint: 'all', rounds: 15, usesMiddle: true,
        text: 'Tous les boutons mélangés : regardez bien la souris !',
        start: (game) => startClickGame(game, game.getSetting('noMiddle') ? [0, 2] : [0, 1, 2])
    });
})();
