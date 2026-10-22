// Atelier glisser-déposer : ranger un fichier, puis trier documents et images.
(() => {
    function startDragGame(game) {
        const { board, ICONS } = game;
        const area = document.createElement('div');
        area.className = 'dropzone-board';
        board.appendChild(area);
        const width = 650;
        const height = 390;

        let piece = null;
        let pieceType = 'doc';
        let folders = [];
        let home = { x: 0, y: 0 };
        let drag = null;

        function makePiece(className, html, x, y) {
            const el = document.createElement('div');
            el.className = 'piece ' + className;
            el.innerHTML = html;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            area.appendChild(el);
            return el;
        }

        function farFrom(x, y, others, distance) {
            return others.every((o) => Math.hypot(o.x - x, o.y - y) > distance);
        }

        function randomSpot(size, others, distance) {
            let x, y, tries = 0;
            do {
                x = 10 + game.randomInt(width - size - 20);
                y = 10 + game.randomInt(height - size - 20);
                tries++;
            } while (!farFrom(x, y, others, distance) && tries < 200);
            return { x, y };
        }

        function nextRound() {
            area.innerHTML = '';
            const sorting = game.round >= 5;
            const spots = [];
            folders = [];
            const kinds = sorting ? ['doc', 'image'] : ['doc'];
            kinds.forEach((kind) => {
                const spot = randomSpot(100, spots, 180);
                spots.push(spot);
                const label = sorting ? (kind === 'doc' ? 'Documents' : 'Images') : 'Dossier';
                const el = makePiece('folder', ICONS.folder + `<span>${label}</span>`, spot.x, spot.y);
                folders.push({ el, kind });
            });
            pieceType = sorting ? kinds[game.randomInt(2)] : 'doc';
            home = randomSpot(70, spots, 230);
            const label = pieceType === 'doc' ? 'lettre.txt' : 'photo.jpg';
            piece = makePiece('draggable', (pieceType === 'doc' ? ICONS.file : ICONS.image) + `<span>${label}</span>`, home.x, home.y);
            piece.addEventListener('pointerdown', onDown);
            game.setHint('drag');
            game.setMessage(sorting
                ? (pieceType === 'doc'
                    ? 'Rangez le document dans le dossier « Documents ».'
                    : 'Rangez la photo dans le dossier « Images ».')
                : 'Maintenez le bouton gauche sur le fichier, déplacez-le et lâchez-le dans le dossier.');
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

        function onDown(e) {
            if (e.button !== 0) {
                game.setMessage('Utilisez le bouton gauche pour attraper le fichier.', 'bad');
                return;
            }
            e.preventDefault();
            const rect = piece.getBoundingClientRect();
            drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
            try {
                piece.setPointerCapture(e.pointerId);
            } catch (err) { /* pointeur déjà relâché */ }
            piece.classList.add('dragging');
            piece.addEventListener('pointermove', onMove);
            piece.addEventListener('pointerup', onUp);
            piece.addEventListener('pointercancel', onUp);
            game.setMessage('Gardez le bouton enfoncé et amenez le fichier sur le dossier.');
        }

        function onMove(e) {
            if (!drag) return;
            const areaRect = area.getBoundingClientRect();
            const x = Math.min(width - 70, Math.max(0, e.clientX - areaRect.left - drag.dx));
            const y = Math.min(height - 70, Math.max(0, e.clientY - areaRect.top - drag.dy));
            piece.style.left = x + 'px';
            piece.style.top = y + 'px';
            const over = folderUnder(e.clientX, e.clientY);
            folders.forEach(({ el }) => el.classList.toggle('hover', over && over.el === el));
        }

        function onUp(e) {
            if (!drag) return;
            drag = null;
            piece.classList.remove('dragging');
            piece.removeEventListener('pointermove', onMove);
            piece.removeEventListener('pointerup', onUp);
            piece.removeEventListener('pointercancel', onUp);
            folders.forEach(({ el }) => el.classList.remove('hover'));
            const over = e.type === 'pointerup' ? folderUnder(e.clientX, e.clientY) : null;
            if (!over) {
                moveHome();
                game.setMessage('Le fichier est revenu à sa place. Lâchez-le bien au-dessus du dossier.', 'bad');
                return;
            }
            if (over.kind !== pieceType) {
                game.error();
                over.el.classList.add('error');
                game.later(() => over.el.classList.remove('error'), 600);
                moveHome();
                game.setMessage('Ce n’est pas le bon dossier, regardez le nom du dossier.', 'bad');
                return;
            }
            piece.remove();
            over.el.classList.add('success');
            game.setMessage('Bravo ! Le fichier est rangé.', 'good');
            game.success(nextRound);
        }

        area.addEventListener('contextmenu', (e) => e.preventDefault());
        nextRound();
    }

    MouseGame.register({
        id: 'glisser', order: 50, title: 'Glisser-déposer', hint: 'drag', rounds: 10,
        text: 'Attrapez le fichier et lâchez-le dans le dossier.',
        start: startDragGame
    });
})();
