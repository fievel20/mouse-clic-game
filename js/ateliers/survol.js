// Atelier survol : pointer sans cliquer.
// Niveau 1 : laisser la flèche sur le fichier pour faire apparaître sa bulle d'aide.
// Niveau 2 : survoler un menu pour ouvrir un sous-menu, puis y cliquer.
// Niveau 3 : des fichiers identiques ; lire les bulles pour trouver le bon.
(() => {
    const DWELL_MS = 700;    // temps à rester sur le fichier pour la bulle (niveau 1)
    const TOOLTIP_MS = 400;  // délai d'apparition de la bulle (niveau 3)
    const SUBMENU_MS = 300;  // délai d'ouverture ou de fermeture d'un sous-menu

    function makeGrid(game, cols, rows) {
        const grid = document.createElement('div');
        grid.className = 'grid';
        grid.style.setProperty('--cols', cols);
        grid.style.setProperty('--rows', rows);
        for (let i = 0; i < cols * rows; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            grid.appendChild(cell);
        }
        game.board.appendChild(grid);
        return grid;
    }

    // Bulle d'aide sous une case, comme celles de Windows
    function showTooltip(game, cell, text) {
        hideTooltip(game);
        const tip = document.createElement('div');
        tip.className = 'tooltip';
        tip.textContent = text;
        tip.style.left = (cell.offsetLeft + cell.offsetWidth / 2) + 'px';
        game.board.appendChild(tip);
        // Sous la case, ou au-dessus pour la dernière ligne (sinon la bulle cache les compteurs)
        const below = cell.offsetTop + cell.offsetHeight + 6;
        tip.style.top = (below + tip.offsetHeight > game.board.offsetHeight
            ? cell.offsetTop - tip.offsetHeight - 6
            : below) + 'px';
    }

    function hideTooltip(game) {
        game.board.querySelectorAll('.tooltip').forEach((tip) => tip.remove());
    }

    // Appelle onEnter(cell) quand la flèche arrive sur une nouvelle case (ou null quand elle sort)
    function trackHover(grid, onEnter) {
        let hovered = null;
        const update = (cell) => {
            if (cell === hovered) return;
            hovered = cell;
            onEnter(cell);
        };
        grid.addEventListener('mousemove', (e) => update(e.target.closest('.cell')));
        grid.addEventListener('mouseleave', () => update(null));
        return { reset: () => { hovered = null; } };
    }

    function startTooltipGame(game) {
        const { ICONS, FILES } = game;
        const grid = makeGrid(game, 8, 5);
        let targetIndex = -1;
        let name = '';
        let locked = false;
        let dwellTimer = null;

        function nextRound() {
            hideTooltip(game);
            Array.from(grid.children).forEach((cell) => {
                cell.className = 'cell';
                cell.innerHTML = '';
            });
            let index;
            do {
                index = game.randomInt(grid.children.length);
            } while (index === targetIndex);
            targetIndex = index;
            const file = FILES[game.randomInt(FILES.length)];
            name = file.name;
            const target = grid.children[targetIndex];
            target.classList.add('target');
            target.innerHTML = ICONS[file.icon];
            hover.reset();
            locked = false;
            game.setHint('move');
            game.setMessage('Posez la flèche sur le fichier, sans cliquer, et attendez : une bulle va apparaître.');
        }

        const hover = trackHover(grid, (cell) => {
            clearTimeout(dwellTimer);
            if (locked) return;
            if (cell !== grid.children[targetIndex]) return;
            game.setMessage('Ne bougez plus… et surtout, ne cliquez pas !');
            dwellTimer = game.later(() => {
                locked = true;
                cell.classList.add('success');
                showTooltip(game, cell, name);
                game.setMessage(`Bravo ! La bulle donne le nom du fichier : « ${name} ».`, 'good');
                game.success(nextRound, 1400);
            }, DWELL_MS);
        });

        grid.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
            const cell = e.target.closest('.cell');
            if (locked || cell !== grid.children[targetIndex]) return;
            clearTimeout(dwellTimer);
            hover.reset();
            game.error();
            cell.classList.add('error');
            game.later(() => cell.classList.remove('error'), 600);
            game.setMessage('Pas besoin de cliquer ! Bougez un peu la flèche, puis laissez-la sur le fichier.', 'bad');
        });
        grid.addEventListener('contextmenu', (e) => e.preventDefault());
        game.onCleanup(() => clearTimeout(dwellTimer));
        nextRound();
    }

    // Menu du bureau (clic droit sur le bureau de Windows), avec des sous-menus
    const MENU = [
        { name: 'Affichage', sub: ['Grandes icônes', 'Icônes moyennes', 'Liste'] },
        { name: 'Trier par', sub: ['Nom', 'Date', 'Taille'] },
        { name: 'Actualiser' },
        { name: 'Nouveau', sub: ['Dossier', 'Raccourci', 'Document texte'] },
        { name: 'Propriétés' }
    ];

    function startSubmenuGame(game) {
        const desk = document.createElement('div');
        desk.className = 'hover-desk';
        desk.innerHTML = '<div class="desk-menu">' + MENU.map((item) => `<div class="desk-item${item.sub ? ' has-sub' : ''}" data-name="${item.name}">
            <span>${item.name}</span>${item.sub ? '<span>▸</span>' : ''}</div>`).join('') + '</div>';
        game.board.appendChild(desk);
        const menuElement = desk.querySelector('.desk-menu');

        let parent = '';
        let child = '';
        let openName = '';
        let hoverKey = null;
        let hoverTimer = null;
        let locked = false;

        function closeSub() {
            openName = '';
            desk.querySelectorAll('.desk-sub').forEach((sub) => sub.remove());
            desk.querySelectorAll('.desk-item.open').forEach((item) => item.classList.remove('open'));
        }

        function openSub(name) {
            if (openName === name) return;
            closeSub();
            const item = desk.querySelector(`.desk-item[data-name="${name}"]`);
            const entry = MENU.find((m) => m.name === name);
            const sub = document.createElement('div');
            sub.className = 'desk-sub';
            sub.dataset.parent = name;
            sub.innerHTML = entry.sub.map((s) => `<div class="desk-sub-item" data-name="${s}">${s}</div>`).join('');
            sub.style.left = (menuElement.offsetLeft + menuElement.offsetWidth - 4) + 'px';
            sub.style.top = (menuElement.offsetTop + item.offsetTop - 6) + 'px';
            desk.appendChild(sub);
            item.classList.add('open');
            openName = name;
        }

        // Comme dans Windows : le sous-menu s'ouvre ou se ferme après un court instant de survol
        function onHover(key) {
            if (key === hoverKey) return;
            hoverKey = key;
            clearTimeout(hoverTimer);
            if (locked || key === 'sub') return;
            hoverTimer = game.later(() => {
                const entry = MENU.find((m) => m.name === key);
                if (entry && entry.sub) {
                    openSub(key);
                } else {
                    closeSub();
                }
            }, key ? SUBMENU_MS : SUBMENU_MS * 2);
        }

        function nextRound() {
            closeSub();
            desk.querySelectorAll('.success').forEach((el) => el.classList.remove('success'));
            const withSub = MENU.filter((m) => m.sub);
            const entry = withSub[game.randomInt(withSub.length)];
            parent = entry.name;
            child = entry.sub[game.randomInt(entry.sub.length)];
            hoverKey = null;
            locked = false;
            game.setHint('move');
            game.setMessage(`Survolez « ${parent} » pour ouvrir le sous-menu, puis cliquez sur « ${child} ».`);
        }

        desk.addEventListener('mousemove', (e) => {
            if (e.target.closest('.desk-sub')) {
                onHover('sub');
                return;
            }
            const item = e.target.closest('.desk-item');
            onHover(item ? item.dataset.name : null);
        });
        desk.addEventListener('mouseleave', () => onHover(null));

        desk.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
            if (locked || e.button !== 0) return;
            const subItem = e.target.closest('.desk-sub-item');
            const item = e.target.closest('.desk-item');
            if (subItem) {
                const sub = subItem.closest('.desk-sub');
                if (sub.dataset.parent === parent && subItem.dataset.name === child) {
                    locked = true;
                    subItem.classList.add('success');
                    game.setMessage(`Bravo ! Vous avez choisi « ${parent} ▸ ${child} ».`, 'good');
                    game.success(nextRound, 1000);
                } else {
                    game.error();
                    subItem.classList.add('error');
                    game.later(() => subItem.classList.remove('error'), 600);
                    game.setMessage(`Ce n’est pas le bon choix. Il faut « ${child} », dans « ${parent} ».`, 'bad');
                }
            } else if (item && item.classList.contains('has-sub')) {
                // Cliquer ouvre aussi le sous-menu, mais ce n'est pas nécessaire
                clearTimeout(hoverTimer);
                openSub(item.dataset.name);
                game.setMessage(`Pas besoin de cliquer ici : il suffit de laisser la flèche dessus. Cliquez ensuite sur « ${child} ».`);
            } else if (item) {
                game.error();
                item.classList.add('error');
                game.later(() => item.classList.remove('error'), 600);
                game.setMessage(`« ${item.dataset.name} » n’a pas de sous-menu. Survolez « ${parent} ».`, 'bad');
            }
        });
        desk.addEventListener('contextmenu', (e) => e.preventDefault());
        game.onCleanup(() => clearTimeout(hoverTimer));
        nextRound();
    }

    function startReadGame(game) {
        const { ICONS, FILES } = game;
        const grid = makeGrid(game, 8, 5);
        let wanted = '';
        let locked = false;
        let tipTimer = null;

        function nextRound() {
            hideTooltip(game);
            Array.from(grid.children).forEach((cell) => {
                cell.className = 'cell';
                cell.innerHTML = '';
                delete cell.dataset.name;
            });
            const spots = game.shuffle(Array.from({ length: grid.children.length }, (_, i) => i));
            const files = game.shuffle(FILES).slice(0, 10);
            files.forEach((file, i) => {
                const cell = grid.children[spots[i]];
                cell.classList.add('decoy');
                // Toutes les icônes se ressemblent : seul le nom, dans la bulle, les distingue
                cell.innerHTML = ICONS.file;
                cell.dataset.name = file.name;
            });
            wanted = files[game.randomInt(files.length)].name;
            hover.reset();
            locked = false;
            game.setHint('move');
            game.setMessage(`Trouvez « ${wanted} » : survolez les fichiers pour lire leur nom, puis cliquez dessus.`);
        }

        const hover = trackHover(grid, (cell) => {
            clearTimeout(tipTimer);
            hideTooltip(game);
            if (locked || !cell || !cell.dataset.name) return;
            tipTimer = game.later(() => showTooltip(game, cell, cell.dataset.name), TOOLTIP_MS);
        });

        grid.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
            const cell = e.target.closest('.cell');
            if (locked || e.button !== 0 || !cell || !cell.dataset.name) return;
            if (cell.dataset.name === wanted) {
                locked = true;
                clearTimeout(tipTimer);
                cell.classList.add('success');
                showTooltip(game, cell, wanted);
                game.setMessage(`Bravo, c’est bien « ${wanted} » !`, 'good');
                game.success(nextRound, 1000);
            } else {
                game.error();
                cell.classList.add('error');
                game.later(() => cell.classList.remove('error'), 600);
                game.setMessage(`Celui-ci s’appelle « ${cell.dataset.name} ». Lisez les bulles pour trouver « ${wanted} ».`, 'bad');
            }
        });
        grid.addEventListener('contextmenu', (e) => e.preventDefault());
        game.onCleanup(() => clearTimeout(tipTimer));
        nextRound();
    }

    MouseGame.register({
        id: 'survol', order: 5, title: 'Survol', hint: 'move', badge: 'Lecteur de bulles',
        text: 'Posez la flèche sans cliquer : une bulle apparaît.',
        levels: [
            { name: 'Faire apparaître la bulle d’aide', rounds: 10, mode: 'tooltip' },
            { name: 'Ouvrir un sous-menu en le survolant', rounds: 8, mode: 'submenu' },
            { name: 'Lire les bulles pour trouver le bon fichier', rounds: 8, mode: 'read' }
        ],
        start: (game, level) => ({ tooltip: startTooltipGame, submenu: startSubmenuGame, read: startReadGame })[level.mode](game)
    });
})();
