// Atelier molette : chaque cran déplace le fichier d'une case.
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
                settleTimer = setTimeout(() => {
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

    MouseGame.register({
        id: 'molette', order: 40, title: 'Molette', hint: 'wheel-down', rounds: 10,
        text: 'Faites tourner la molette pour déplacer le fichier.',
        start: startWheelGame
    });
})();
