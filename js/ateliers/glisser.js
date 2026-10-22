// Atelier glisser-déposer.
// Niveaux 1 et 2 : ranger des fichiers dans le bon dossier.
// Niveau 3 : le labyrinthe de OCN-mouse-campus, sans toucher les murs.
(() => {
    const KINDS = {
        doc: { folder: 'Documents', icon: 'file', file: 'lettre.txt', what: 'le document' },
        image: { folder: 'Images', icon: 'image', file: 'photo.jpg', what: 'la photo' },
        music: { folder: 'Musique', icon: 'music', file: 'chanson.mp3', what: 'la chanson' }
    };

    // Rend un élément déplaçable au bouton gauche.
    // onMove(clientX, clientY) et onDrop(clientX, clientY) sont appelés pendant et à la fin.
    function makeDraggable(game, el, container, { onMove, onDrop }) {
        let drag = null;

        function end(e) {
            if (!drag) return;
            drag = null;
            el.classList.remove('dragging');
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', end);
            el.removeEventListener('pointercancel', end);
            onDrop(e.type === 'pointerup' ? e.clientX : null, e.clientY);
        }

        function move(e) {
            if (!drag) return;
            const box = container.getBoundingClientRect();
            const x = Math.min(box.width - el.offsetWidth, Math.max(0, e.clientX - box.left - drag.dx));
            const y = Math.min(box.height - el.offsetHeight, Math.max(0, e.clientY - box.top - drag.dy));
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            onMove(e.clientX, e.clientY);
        }

        el.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) {
                game.setFeedback('Utilisez le bouton gauche pour attraper le fichier.', 'bad');
                return;
            }
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
            try {
                el.setPointerCapture(e.pointerId);
            } catch (err) { /* pointeur déjà relâché */ }
            el.classList.add('dragging');
            el.addEventListener('pointermove', move);
            el.addEventListener('pointerup', end);
            el.addEventListener('pointercancel', end);
        });
        el.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Options du niveau : kinds (types de fichiers, donc de dossiers)
    function startSortGame(game, level) {
        const { board, ICONS } = game;
        const area = document.createElement('div');
        area.className = 'dropzone-board';
        board.appendChild(area);
        const width = 650;
        const height = 390;
        const single = level.kinds.length === 1;

        let piece = null;
        let pieceKind = 'doc';
        let folders = [];
        let home = { x: 0, y: 0 };

        function makePiece(className, html, x, y) {
            const el = document.createElement('div');
            el.className = 'piece ' + className;
            el.innerHTML = html;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            area.appendChild(el);
            return el;
        }

        function randomSpot(size, others, distance) {
            let x, y, tries = 0;
            do {
                x = 10 + game.randomInt(width - size - 20);
                y = 10 + game.randomInt(height - size - 20);
                tries++;
            } while (!others.every((o) => Math.hypot(o.x - x, o.y - y) > distance) && tries < 300);
            return { x, y };
        }

        function folderUnder(clientX, clientY) {
            return folders.find(({ el }) => {
                const r = el.getBoundingClientRect();
                return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
            });
        }

        function moveHome() {
            piece.style.left = home.x + 'px';
            piece.style.top = home.y + 'px';
        }

        function instruction() {
            return single
                ? 'Maintenez le bouton gauche sur le fichier, déplacez-le et lâchez-le dans le dossier.'
                : `Rangez ${KINDS[pieceKind].what} dans le dossier « ${KINDS[pieceKind].folder} ».`;
        }

        function nextRound() {
            area.innerHTML = '';
            const spots = [];
            folders = level.kinds.map((kind) => {
                const spot = randomSpot(100, spots, 170);
                spots.push(spot);
                const name = single ? 'Dossier' : KINDS[kind].folder;
                return { el: makePiece('folder', ICONS.folder + `<span>${name}</span>`, spot.x, spot.y), kind };
            });
            pieceKind = level.kinds[game.randomInt(level.kinds.length)];
            home = randomSpot(70, spots, 200);
            const kind = KINDS[pieceKind];
            piece = makePiece('draggable', ICONS[kind.icon] + `<span>${kind.file}</span>`, home.x, home.y);
            makeDraggable(game, piece, area, {
                onMove(x, y) {
                    const over = folderUnder(x, y);
                    folders.forEach(({ el }) => el.classList.toggle('hover', !!over && over.el === el));
                },
                onDrop(x, y) {
                    folders.forEach(({ el }) => el.classList.remove('hover'));
                    const over = x === null ? null : folderUnder(x, y);
                    if (!over) {
                        moveHome();
                        game.setFeedback('Le fichier est revenu à sa place. Lâchez-le bien au-dessus du dossier.', 'bad');
                        return;
                    }
                    if (over.kind !== pieceKind) {
                        game.error();
                        over.el.classList.add('error');
                        game.later(() => over.el.classList.remove('error'), 600);
                        moveHome();
                        game.setFeedback(`Ce n’est pas le bon dossier : regardez son nom.`, 'bad');
                        return;
                    }
                    piece.remove();
                    over.el.classList.add('success');
                    game.setFeedback('Bravo ! Le fichier est rangé.', 'good');
                    game.success(nextRound);
                }
            });
            game.setHint('drag');
            game.setInstruction(instruction());
        }

        area.addEventListener('contextmenu', (e) => e.preventDefault());
        nextRound();
    }

    // Labyrinthe : même algorithme que OCN-mouse-campus (exploration en profondeur)
    function generateMaze(size) {
        const maze = Array.from({ length: size }, () => Array(size).fill(1));
        const stack = [[1, 1]];
        maze[1][1] = 0;
        while (stack.length) {
            const [x, y] = stack[stack.length - 1];
            const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]].sort(() => Math.random() - 0.5);
            const next = directions.find(([dx, dy]) => {
                const nx = x + dx * 2;
                const ny = y + dy * 2;
                return nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && maze[nx][ny] === 1;
            });
            if (!next) {
                stack.pop();
                continue;
            }
            maze[x + next[0]][y + next[1]] = 0;
            maze[x + next[0] * 2][y + next[1] * 2] = 0;
            stack.push([x + next[0] * 2, y + next[1] * 2]);
        }
        return maze;
    }

    // Options du niveau : size (côté du labyrinthe, impair)
    function startMazeGame(game, level) {
        const { board, ICONS } = game;
        const size = level.size;
        const wrap = document.createElement('div');
        wrap.className = 'maze-wrap';
        board.appendChild(wrap);
        let start = null;
        let piece = null;

        function cellUnder(x, y) {
            return document.elementsFromPoint(x, y).find((el) => el.classList.contains('cell') && wrap.contains(el));
        }

        function moveHome() {
            piece.style.left = (start.offsetLeft + (start.offsetWidth - piece.offsetWidth) / 2) + 'px';
            piece.style.top = (start.offsetTop + (start.offsetHeight - piece.offsetHeight) / 2) + 'px';
        }

        function nextRound() {
            wrap.innerHTML = '';
            const maze = generateMaze(size);
            const grid = document.createElement('div');
            grid.className = 'grid maze';
            grid.style.setProperty('--cols', size);
            grid.style.setProperty('--rows', size);
            grid.style.setProperty('--cell', '34px');
            maze.forEach((row, i) => row.forEach((wall, j) => {
                const cell = document.createElement('div');
                cell.className = 'cell' + (wall ? ' wall' : '');
                if (i === size - 2 && j === size - 2) {
                    cell.classList.add('goal');
                    cell.innerHTML = ICONS.folder;
                }
                grid.appendChild(cell);
            }));
            wrap.appendChild(grid);
            start = grid.children[size + 1];
            piece = document.createElement('div');
            piece.className = 'piece draggable maze-piece';
            piece.innerHTML = ICONS.file;
            wrap.appendChild(piece);
            moveHome();

            let lost = false;
            let last = null;     // dernier point vérifié pendant le glisser

            // Vérifie tout le trajet depuis le dernier point : une souris rapide
            // n'envoie que quelques mouvements et pourrait sauter par-dessus un mur
            function checkPath(x, y) {
                if (lost) return;
                const from = last || { x, y };
                const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / 6));
                for (let s = 1; s <= steps; s++) {
                    const cell = cellUnder(from.x + (x - from.x) * s / steps, from.y + (y - from.y) * s / steps);
                    if (cell && cell.classList.contains('wall')) {
                        // Comme dans le jeu d'origine : toucher un mur renvoie au départ
                        lost = true;
                        game.error();
                        cell.classList.add('error');
                        game.later(() => cell.classList.remove('error'), 600);
                        game.setFeedback('Oups ! Vous avez touché un mur. Lâchez le bouton et recommencez depuis le départ.', 'bad');
                        return;
                    }
                }
                last = { x, y };
            }

            piece.addEventListener('pointerdown', (e) => {
                last = { x: e.clientX, y: e.clientY };
            });
            makeDraggable(game, piece, wrap, {
                onMove: checkPath,
                onDrop(x, y) {
                    if (x !== null) checkPath(x, y);
                    last = null;
                    const cell = x === null ? null : cellUnder(x, y);
                    if (!lost && cell && cell.classList.contains('goal')) {
                        cell.classList.add('success');
                        piece.remove();
                        game.setFeedback('Bravo ! Vous avez atteint le dossier.', 'good');
                        game.success(nextRound, 900);
                        return;
                    }
                    if (!lost) {
                        game.setFeedback('Le fichier est revenu au départ : lâchez-le bien sur le dossier.');
                    }
                    lost = false;
                    moveHome();
                }
            });
            game.setHint('drag');
            game.setInstruction('Guidez le fichier jusqu’au dossier sans toucher les murs gris, puis lâchez-le.');
        }

        wrap.addEventListener('contextmenu', (e) => e.preventDefault());
        nextRound();
    }

    MouseGame.register({
        id: 'glisser', order: 50, title: 'Glisser-déposer', hint: 'drag', badge: 'Expert du rangement',
        text: 'Attrapez le fichier et lâchez-le dans le dossier.',
        levels: [
            { name: 'Ranger le fichier dans le dossier', rounds: 10, kinds: ['doc'] },
            { name: 'Trier dans trois dossiers', rounds: 10, kinds: ['doc', 'image', 'music'] },
            { name: 'Le labyrinthe : sans toucher les murs', rounds: 5, size: 11 }
        ],
        start: (game, level) => (level.size ? startMazeGame(game, level) : startSortGame(game, level))
    });
})();
