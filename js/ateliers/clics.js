// Ateliers de clic : gauche, droit, central et grand défi (mélange).
(() => {
    const BUTTON_NAMES = { 0: 'gauche', 1: 'central (la molette)', 2: 'droit' };
    const BUTTON_PARTS = { 0: 'left', 1: 'middle', 2: 'right' };
    const MENU_ITEMS = ['Ouvrir', 'Copier', 'Renommer', 'Supprimer'];
    const DECOY_ICONS = ['folder', 'image', 'music'];

    // Grille de cases avec un fichier à cliquer.
    // Options du niveau : cols, rows, cell (px), distractors (icônes leurres),
    // named (fichiers nommés), timeLimit (ms), menuAction (clic droit puis action du menu).
    function startClickGame(game, level, buttons) {
        const { board, ICONS, FILES } = game;
        const cols = level.cols || 8;
        const rows = level.rows || 5;
        const grid = document.createElement('div');
        grid.className = 'grid' + (level.named ? ' named' : '') + ((level.cell || 60) < 50 ? ' small' : '');
        grid.style.setProperty('--cols', cols);
        grid.style.setProperty('--rows', rows);
        grid.style.setProperty('--cell', (level.cell || 60) + 'px');
        for (let i = 0; i < cols * rows; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            grid.appendChild(cell);
        }
        let timeBar = null;
        if (level.timeLimit) {
            timeBar = document.createElement('div');
            timeBar.className = 'time-bar';
            timeBar.innerHTML = '<div></div>';
            board.appendChild(timeBar);
        }
        board.appendChild(grid);

        let targetIndex = -1;
        let targetName = '';
        let expected = buttons[0];
        let action = '';         // action attendue dans le menu (niveau menuAction)
        let contextMenu = null;
        let locked = false;
        let timeLimitTimer = null;

        function label(name) {
            return `<span class="label">${name}</span>`;
        }

        function instruction() {
            const what = level.named ? `« ${targetName} »` : 'le fichier';
            if (level.menuAction) {
                return `Faites un clic droit sur ${what}, puis choisissez « ${action} ».`;
            }
            return `Cliquez sur ${what} avec le bouton ${BUTTON_NAMES[expected]}.`;
        }

        function startTimeLimit() {
            if (!level.timeLimit) return;
            const bar = timeBar.firstChild;
            bar.style.transition = 'none';
            bar.style.width = '100%';
            bar.getBoundingClientRect();
            bar.style.transition = `width ${level.timeLimit}ms linear`;
            bar.style.width = '0%';
            clearTimeout(timeLimitTimer);
            timeLimitTimer = game.later(() => {
                if (locked) return;
                game.error();
                nextTarget();
                game.setMessage('Trop tard, le fichier a changé de place ! ' + instruction(), 'bad');
            }, level.timeLimit);
        }

        function closeMenu() {
            if (contextMenu) contextMenu.remove();
            contextMenu = null;
        }

        function nextTarget() {
            closeMenu();
            Array.from(grid.children).forEach((cell) => {
                cell.className = 'cell';
                cell.innerHTML = '';
            });
            const order = game.shuffle(Array.from({ length: cols * rows }, (_, i) => i).filter((i) => i !== targetIndex));
            targetIndex = order[0];
            expected = buttons[game.randomInt(buttons.length)];
            action = MENU_ITEMS[game.randomInt(MENU_ITEMS.length)];
            const files = game.shuffle(FILES);
            const target = grid.children[targetIndex];
            target.classList.add('target');
            if (level.named) {
                targetName = files[0].name;
                target.innerHTML = ICONS[files[0].icon] + label(targetName);
            } else {
                target.innerHTML = ICONS.file;
            }
            for (let d = 0; d < (level.distractors || 0); d++) {
                const cell = grid.children[order[d + 1]];
                cell.classList.add('decoy');
                cell.innerHTML = level.named
                    ? ICONS[files[d + 1].icon] + label(files[d + 1].name)
                    : ICONS[DECOY_ICONS[game.randomInt(DECOY_ICONS.length)]];
            }
            game.setHint(BUTTON_PARTS[expected]);
            game.setMessage(instruction());
            locked = false;
            startTimeLimit();
        }

        function win(cell, text, delay) {
            locked = true;
            clearTimeout(timeLimitTimer);
            cell.classList.add('success');
            game.setMessage(text, 'good');
            game.success(nextTarget, delay);
        }

        function openMenu(cell, interactive) {
            closeMenu();
            contextMenu = document.createElement('div');
            contextMenu.className = 'context-menu' + (interactive ? ' interactive' : '');
            contextMenu.innerHTML = MENU_ITEMS.map((item) => `<div data-item="${item}">${item}</div>`).join('');
            contextMenu.style.left = (cell.offsetLeft + cell.offsetWidth * 0.6) + 'px';
            contextMenu.style.top = (cell.offsetTop + cell.offsetHeight * 0.6) + 'px';
            board.appendChild(contextMenu);
            if (!interactive) return;
            contextMenu.addEventListener('contextmenu', (e) => e.preventDefault());
            contextMenu.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                if (e.button === 1) e.preventDefault();
                const item = e.target.closest('[data-item]');
                if (!item || locked) return;
                if (e.button !== 0) {
                    game.setMessage('Dans le menu, on choisit avec le bouton gauche.', 'bad');
                    return;
                }
                if (item.dataset.item === action) {
                    item.classList.add('chosen');
                    win(grid.children[targetIndex], `Bravo ! Vous avez choisi « ${action} ».`, 1000);
                } else {
                    game.error();
                    item.classList.add('wrong');
                    game.later(() => item.classList.remove('wrong'), 600);
                    game.setMessage(`Ce n’est pas « ${item.dataset.item} » qu’il faut choisir, mais « ${action} ».`, 'bad');
                }
            });
        }

        grid.addEventListener('mousedown', (e) => {
            // Empêche le défilement automatique du bouton central
            if (e.button === 1) e.preventDefault();
            if (locked) return;
            if (contextMenu) {
                closeMenu();
                game.setMessage('Le menu s’est fermé. ' + instruction());
                if (e.button !== 2) return;
            }
            const cell = e.target.closest('.cell');
            const target = grid.children[targetIndex];
            if (cell !== target) {
                if (cell && cell.classList.contains('decoy')) {
                    game.error();
                    cell.classList.add('error');
                    game.later(() => cell.classList.remove('error'), 600);
                    game.setMessage('Ce n’est pas le bon fichier. ' + instruction(), 'bad');
                } else {
                    game.setMessage('Presque ! Visez bien, puis cliquez. ' + instruction(), 'bad');
                }
                return;
            }
            if (e.button !== expected) {
                game.error();
                cell.classList.add('error');
                game.later(() => cell.classList.remove('error'), 600);
                game.setMessage(`Ce n'est pas le bon bouton : utilisez le bouton ${BUTTON_NAMES[expected]}.`, 'bad');
                return;
            }
            if (level.menuAction) {
                openMenu(cell, true);
                game.setHint('left');
                game.setMessage(`Le menu est ouvert : cliquez sur « ${action} » avec le bouton gauche.`, 'good');
                return;
            }
            if (expected === 2) {
                openMenu(cell, false);
                // Laisse le temps de voir le menu contextuel
                win(cell, 'Bravo ! Le clic droit ouvre un menu.', 1600);
            } else {
                win(cell, 'Bravo !', 700);
            }
        });
        grid.addEventListener('contextmenu', (e) => e.preventDefault());
        grid.addEventListener('auxclick', (e) => e.preventDefault());
        game.onCleanup(() => clearTimeout(timeLimitTimer));

        nextTarget();
    }

    // Bouton central, niveau 3 : ouvrir des liens dans de nouveaux onglets
    function startTabsGame(game, level) {
        const { board } = game;
        const links = ['Météo', 'Actualités', 'Recettes', 'Sport', 'Cinéma', 'Jardinage', 'Voyages', 'Santé'];
        const browser = document.createElement('div');
        browser.className = 'browser';
        browser.innerHTML = `<div class="tabs"><div class="tab active">Portail</div></div>
            <div class="page"><div class="page-title">Portail d’informations</div><div class="links"></div></div>`;
        board.appendChild(browser);
        const tabs = browser.querySelector('.tabs');
        const linkList = browser.querySelector('.links');
        let wanted = '';
        let locked = false;

        function nextRound() {
            linkList.innerHTML = game.shuffle(links)
                .map((name) => `<a href="#" class="fake-link" data-name="${name}">${name}</a>`).join('');
            do {
                wanted = links[game.randomInt(links.length)];
            } while (tabs.textContent.includes(wanted));
            locked = false;
            game.setHint('middle');
            game.setMessage(`Ouvrez « ${wanted} » dans un nouvel onglet : bouton central sur le lien.`);
        }

        browser.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
            const link = e.target.closest('.fake-link');
            if (!link || locked) return;
            if (e.button !== 1) {
                game.error();
                game.setMessage(e.button === 0
                    ? 'Le clic gauche remplacerait cette page. Le bouton central ouvre le lien à côté, dans un nouvel onglet.'
                    : 'Ce n’est pas le bon bouton : appuyez sur la molette (bouton central).', 'bad');
                return;
            }
            if (link.dataset.name !== wanted) {
                game.error();
                game.setMessage(`Ce n’est pas le bon lien : cherchez « ${wanted} ».`, 'bad');
                return;
            }
            locked = true;
            const tab = document.createElement('div');
            tab.className = 'tab new';
            tab.textContent = wanted;
            tabs.appendChild(tab);
            // Garde au plus 5 onglets visibles
            while (tabs.children.length > 5) tabs.children[1].remove();
            game.setMessage(`Bravo ! « ${wanted} » s’est ouvert dans un nouvel onglet, en haut.`, 'good');
            game.success(nextRound, 1200);
        });
        browser.addEventListener('click', (e) => e.preventDefault());
        browser.addEventListener('auxclick', (e) => e.preventDefault());
        browser.addEventListener('contextmenu', (e) => e.preventDefault());
        nextRound();
    }

    const SMALL = { cols: 10, rows: 6, cell: 46 };

    MouseGame.register({
        id: 'gauche', order: 10, title: 'Clic gauche', hint: 'left', badge: 'As du clic gauche',
        text: 'Cliquez sur le fichier avec le bouton gauche.',
        levels: [
            { name: 'Un grand fichier à cliquer', rounds: 10 },
            { name: 'Cases plus petites, attention aux autres icônes', rounds: 10, ...SMALL, distractors: 8 },
            { name: 'Cliquez avant que le fichier ne change de place', rounds: 10, ...SMALL, distractors: 10, timeLimit: 4000 }
        ],
        start: (game, level) => startClickGame(game, level, [0])
    });
    MouseGame.register({
        id: 'droit', order: 20, title: 'Clic droit', hint: 'right', badge: 'Maître du menu',
        text: 'Ouvrez le menu du fichier avec le bouton droit.',
        levels: [
            { name: 'Ouvrir le menu du fichier', rounds: 10 },
            { name: 'Ouvrir le menu, puis choisir une action', rounds: 10, menuAction: true },
            { name: 'Trouver le bon fichier, puis choisir une action', rounds: 10, menuAction: true, named: true, distractors: 7, cols: 6, rows: 4, cell: 84 }
        ],
        start: (game, level) => startClickGame(game, level, [2])
    });
    MouseGame.register({
        id: 'central', order: 30, title: 'Bouton central', hint: 'middle', usesMiddle: true, badge: 'Pro des onglets',
        text: 'Appuyez sur la molette, comme un bouton.',
        levels: [
            { name: 'Appuyer sur la molette', rounds: 10 },
            { name: 'Cases plus petites, attention aux autres icônes', rounds: 10, ...SMALL, distractors: 8 },
            { name: 'Ouvrir des liens dans un nouvel onglet', rounds: 8, tabs: true }
        ],
        start: (game, level) => (level.tabs ? startTabsGame(game, level) : startClickGame(game, level, [1]))
    });
    MouseGame.register({
        id: 'melange', order: 90, title: 'Grand défi', hint: 'all', usesMiddle: true, badge: 'Champion du Grand défi',
        text: 'Tous les boutons mélangés : regardez bien la souris !',
        levels: [
            { name: 'Les boutons mélangés', rounds: 15 },
            { name: 'Cases plus petites et icônes leurres', rounds: 15, ...SMALL, distractors: 8 },
            { name: 'Contre la montre', rounds: 15, ...SMALL, distractors: 10, timeLimit: 5000 }
        ],
        start: (game, level) => startClickGame(game, level, game.getSetting('noMiddle') ? [0, 2] : [0, 1, 2])
    });
})();
