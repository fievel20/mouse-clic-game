document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('menu');
    const cards = document.getElementById('cards');
    const game = document.getElementById('game');
    const board = document.getElementById('board');
    const gameTitle = document.getElementById('gameTitle');
    const mouseHint = document.getElementById('mouseHint');
    const messageElement = document.getElementById('message');
    const scoreElement = document.getElementById('score');
    const errorsElement = document.getElementById('errors');
    const timerElement = document.getElementById('timer');
    const resultModal = document.getElementById('resultModal');
    const resultMessageElement = document.getElementById('resultMessage');
    const resultDetailElement = document.getElementById('resultDetail');

    const STORAGE_KEY = 'mouseClicGame.stars';

    // Icônes au trait, dans le style de file-icon.png / folder-icon.png
    const ICONS = {
        file: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M8 9h4M8 13h8M8 17h8"/></svg>',
        folder: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
        image: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M3 18l5-5 4 4 3-3 6 6"/></svg>'
    };

    const BUTTON_NAMES = { 0: 'gauche', 1: 'central (la molette)', 2: 'droit' };
    const BUTTON_PARTS = { 0: 'left', 1: 'middle', 2: 'right' };

    const ACTIVITIES = [
        { id: 'gauche', title: 'Clic gauche', text: 'Cliquez sur le fichier avec le bouton gauche.', hint: 'left', rounds: 10, start: () => startClickGame([0]) },
        { id: 'droit', title: 'Clic droit', text: 'Ouvrez le menu du fichier avec le bouton droit.', hint: 'right', rounds: 10, start: () => startClickGame([2]) },
        { id: 'central', title: 'Bouton central', text: 'Appuyez sur la molette, comme un bouton.', hint: 'middle', rounds: 10, start: () => startClickGame([1]) },
        { id: 'molette', title: 'Molette', text: 'Faites tourner la molette pour déplacer le fichier.', hint: 'wheel-down', rounds: 10, start: startWheelGame },
        { id: 'glisser', title: 'Glisser-déposer', text: 'Attrapez le fichier et lâchez-le dans le dossier.', hint: 'drag', rounds: 10, start: startDragGame },
        { id: 'melange', title: 'Grand défi', text: 'Tous les boutons mélangés : regardez bien la souris !', hint: 'all', rounds: 15, start: () => startClickGame([0, 1, 2]) }
    ];

    let current = null;      // activité en cours
    let round = 0;           // réussites
    let errors = 0;
    let startTime = 0;
    let timerInterval = null;
    let runId = 0;           // invalide les minuteries d'une partie abandonnée
    let cleanup = null;      // nettoyage propre à chaque activité

    // ---------- Outils ----------

    function later(fn, ms) {
        const id = runId;
        setTimeout(() => { if (id === runId) fn(); }, ms);
    }

    function randomInt(max) {
        return Math.floor(Math.random() * max);
    }

    function loadStars() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    function saveStars(id, stars) {
        const all = loadStars();
        if ((all[id] || 0) >= stars) return;
        all[id] = stars;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        } catch (e) { /* stockage indisponible : on continue sans sauvegarder */ }
    }

    // Dessin de souris, avec la partie à utiliser en vert
    function mouseSvg(active) {
        const on = (part) => (active === part || active === 'all'
            || (part === 'middle' && active.startsWith('wheel'))
            || (part === 'left' && active === 'drag')) ? ' active' : '';
        let arrow = '';
        if (active === 'wheel-up') arrow = '<path class="arrow" d="M80 6 L90 22 H70 Z"/>';
        if (active === 'wheel-down') arrow = '<path class="arrow" d="M80 34 L90 18 H70 Z"/>';
        if (active === 'drag') arrow = '<path class="arrow" d="M72 44 H80 V36 L90 50 L80 64 V56 H72 Z"/>';
        const viewBox = arrow ? '12 0 80 84' : '12 0 60 84';
        return `<svg class="mouse-svg" viewBox="${viewBox}" style="width:${arrow ? 80 : 60}px">
            <path class="part" d="M15 36 V54 A27 27 0 0 0 69 54 V36 Z"/>
            <path class="part${on('left')}" d="M15 36 V30 A27 27 0 0 1 42 3 V36 Z"/>
            <path class="part${on('right')}" d="M69 36 V30 A27 27 0 0 0 42 3 V36 Z"/>
            <rect class="part${on('middle')}" x="37" y="10" width="10" height="20" rx="5"/>${arrow}
        </svg>`;
    }

    function setHint(part) {
        mouseHint.innerHTML = mouseSvg(part);
    }

    function setMessage(text, kind) {
        messageElement.textContent = text;
        messageElement.className = 'message' + (kind ? ' ' + kind : '');
    }

    function updateStats() {
        scoreElement.textContent = `Réussites : ${round} / ${current.rounds}`;
        errorsElement.textContent = `Erreurs : ${errors}`;
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // ---------- Menu ----------

    function renderMenu() {
        const stars = loadStars();
        cards.innerHTML = '';
        ACTIVITIES.forEach((activity) => {
            const card = document.createElement('button');
            card.className = 'card';
            const count = stars[activity.id] || 0;
            const starHtml = [1, 2, 3].map((n) => `<span class="${n <= count ? 'on' : ''}">★</span>`).join('');
            card.innerHTML = `${mouseSvg(activity.hint)}
                <span class="card-title">${activity.title}</span>
                <span class="card-text">${activity.text}</span>
                <span class="stars" aria-label="${count} étoile(s) sur 3">${starHtml}</span>`;
            card.addEventListener('click', () => startActivity(activity));
            cards.appendChild(card);
        });
    }

    function showMenu() {
        stopActivity();
        resultModal.style.display = 'none';
        game.classList.add('hidden');
        menu.classList.remove('hidden');
        renderMenu();
    }

    // ---------- Déroulement d'une partie ----------

    function startActivity(activity) {
        stopActivity();
        current = activity;
        round = 0;
        errors = 0;
        resultModal.style.display = 'none';
        menu.classList.add('hidden');
        game.classList.remove('hidden');
        gameTitle.textContent = activity.title;
        board.innerHTML = '';
        updateStats();
        startTime = Date.now();
        timerElement.textContent = 'Temps : 00:00';
        timerInterval = setInterval(() => {
            timerElement.textContent = 'Temps : ' + formatTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        activity.start();
    }

    function stopActivity() {
        runId++;
        clearInterval(timerInterval);
        if (cleanup) cleanup();
        cleanup = null;
    }

    function addSuccess(next, delay = 700) {
        round++;
        updateStats();
        later(round >= current.rounds ? endActivity : next, delay);
    }

    function addError() {
        errors++;
        updateStats();
    }

    function endActivity() {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        stopActivity();
        const stars = errors <= 1 ? 3 : errors <= 4 ? 2 : 1;
        saveStars(current.id, stars);
        if (stars === 3) {
            resultMessageElement.innerHTML = '🤩 Bravo ! 🤩<br>★★★';
        } else if (stars === 2) {
            resultMessageElement.innerHTML = '👍 Très bien ! 👍<br>★★☆';
        } else {
            resultMessageElement.innerHTML = '😌 Bon début ! 😌<br>★☆☆';
        }
        resultDetailElement.innerHTML = `${current.rounds} réussites en ${formatTime(seconds)}, avec ${errors} erreur${errors > 1 ? 's' : ''}.`
            + (stars < 3 ? '<br>Rejouez pour gagner plus d’étoiles.' : '');
        resultModal.style.display = 'block';
    }

    // ---------- Clic gauche / droit / central / mélange ----------

    function startClickGame(buttons) {
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
                index = randomInt(cols * rows);
            } while (index === targetIndex);
            targetIndex = index;
            expected = buttons[randomInt(buttons.length)];
            const cell = grid.children[targetIndex];
            cell.classList.add('target');
            cell.innerHTML = ICONS.file;
            setHint(BUTTON_PARTS[expected]);
            setMessage(`Cliquez sur le fichier avec le bouton ${BUTTON_NAMES[expected]}.`);
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
                setMessage('Presque ! Visez bien le fichier, puis cliquez.', 'bad');
                return;
            }
            if (e.button === expected) {
                locked = true;
                cell.classList.add('success');
                if (expected === 2) showContextMenu(cell);
                setMessage(expected === 2 ? 'Bravo ! Le clic droit ouvre un menu.' : 'Bravo !', 'good');
                // Laisse le temps de voir le menu contextuel
                addSuccess(nextTarget, expected === 2 ? 1600 : 700);
            } else {
                addError();
                cell.classList.add('error');
                setMessage(`Ce n'est pas le bon bouton : utilisez le bouton ${BUTTON_NAMES[expected]}.`, 'bad');
                later(() => cell.classList.remove('error'), 600);
            }
        });
        grid.addEventListener('contextmenu', (e) => e.preventDefault());
        grid.addEventListener('auxclick', (e) => e.preventDefault());

        nextTarget();
    }

    // ---------- Molette ----------

    function startWheelGame() {
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
            if (position === goal) {
                grid.children[goal].innerHTML = ICONS.file;
            }
        }

        function nextRound() {
            do {
                goal = randomInt(size);
            } while (Math.abs(goal - position) < 2);
            locked = false;
            accumulated = 0;
            const down = goal > position;
            setHint(down ? 'wheel-down' : 'wheel-up');
            setMessage(down
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
                setMessage('Vous y êtes… ne bougez plus !', 'good');
                // Le fichier doit rester un instant sur le dossier
                settleTimer = setTimeout(() => {
                    if (position !== goal || locked) return;
                    locked = true;
                    grid.children[goal].classList.add('success');
                    setMessage('Bravo !', 'good');
                    addSuccess(nextRound);
                }, 500);
            } else {
                const down = goal > position;
                setHint(down ? 'wheel-down' : 'wheel-up');
                setMessage(down ? 'Encore un peu : molette vers vous.' : 'Encore un peu : molette vers l’écran.');
            }
        }

        document.addEventListener('wheel', onWheel, { passive: false });
        cleanup = () => {
            document.removeEventListener('wheel', onWheel);
            clearTimeout(settleTimer);
        };

        position = randomInt(size);
        nextRound();
    }

    // ---------- Glisser-déposer ----------

    function startDragGame() {
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
                x = 10 + randomInt(width - size - 20);
                y = 10 + randomInt(height - size - 20);
                tries++;
            } while (!farFrom(x, y, others, distance) && tries < 200);
            return { x, y };
        }

        function nextRound() {
            area.innerHTML = '';
            const sorting = round >= 5;
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
            pieceType = sorting ? kinds[randomInt(2)] : 'doc';
            home = randomSpot(70, spots, 230);
            const label = pieceType === 'doc' ? 'lettre.txt' : 'photo.jpg';
            piece = makePiece('draggable', (pieceType === 'doc' ? ICONS.file : ICONS.image) + `<span>${label}</span>`, home.x, home.y);
            piece.addEventListener('pointerdown', onDown);
            setHint('drag');
            setMessage(sorting
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
                setMessage('Utilisez le bouton gauche pour attraper le fichier.', 'bad');
                return;
            }
            e.preventDefault();
            const rect = piece.getBoundingClientRect();
            drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, pointerId: e.pointerId };
            try {
                piece.setPointerCapture(e.pointerId);
            } catch (err) { /* pointeur déjà relâché */ }
            piece.classList.add('dragging');
            piece.addEventListener('pointermove', onMove);
            piece.addEventListener('pointerup', onUp);
            piece.addEventListener('pointercancel', onUp);
            setMessage('Gardez le bouton enfoncé et amenez le fichier sur le dossier.');
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
                setMessage('Le fichier est revenu à sa place. Lâchez-le bien au-dessus du dossier.', 'bad');
                return;
            }
            if (over.kind !== pieceType) {
                addError();
                over.el.classList.add('error');
                later(() => over.el.classList.remove('error'), 600);
                moveHome();
                setMessage('Ce n’est pas le bon dossier, regardez le nom du dossier.', 'bad');
                return;
            }
            piece.remove();
            over.el.classList.add('success');
            setMessage('Bravo ! Le fichier est rangé.', 'good');
            addSuccess(nextRound);
        }

        area.addEventListener('contextmenu', (e) => e.preventDefault());
        nextRound();
    }

    // ---------- Boutons ----------

    document.getElementById('backButton').addEventListener('click', showMenu);
    document.getElementById('menuButton').addEventListener('click', showMenu);
    document.getElementById('replayButton').addEventListener('click', () => startActivity(current));
    document.getElementById('resetProgress').addEventListener('click', () => {
        if (!confirm('Effacer toutes les étoiles gagnées ?')) return;
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) { /* rien à effacer */ }
        renderMenu();
    });

    renderMenu();
});
