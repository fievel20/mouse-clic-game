// Tests automatiques : ouvrir index.html?test
// Un « robot » joue chaque niveau de chaque atelier sans erreur, puis quelques
// scénarios vérifient que les erreurs sont bien comptées.
(() => {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => Array.from(document.querySelectorAll(s));
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const report = document.createElement('div');
    report.className = 'test-report';
    report.innerHTML = '<strong>Tests automatiques</strong><div id="testLines"></div>';
    document.body.appendChild(report);
    const lines = report.querySelector('#testLines');
    const results = [];

    function log(ok, text) {
        results.push({ ok, text });
        const line = document.createElement('div');
        line.textContent = (ok ? '✅ ' : '❌ ') + text;
        lines.appendChild(line);
    }

    function center(el) {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function press(el, button) {
        el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button }));
    }

    function pointer(el, type, { x, y }) {
        el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y, pointerId: 1 }));
    }

    function message() {
        return $('#message').textContent;
    }

    function quoted() {
        const match = message().match(/« ([^»]+) »/g);
        return match ? match.map((m) => m.slice(2, -2)) : [];
    }

    function errorsCount() {
        return Number($('#errors').textContent.replace(/\D/g, ''));
    }

    function finished() {
        return $('#resultModal').style.display === 'block';
    }

    // Plus court chemin dans le labyrinthe, de case en case
    function mazePath() {
        const cells = $$('.grid.maze .cell');
        const size = Math.round(Math.sqrt(cells.length));
        const startIndex = size + 1;
        const goalIndex = cells.findIndex((c) => c.classList.contains('goal'));
        const previous = { [startIndex]: -1 };
        const queue = [startIndex];
        while (queue.length) {
            const i = queue.shift();
            if (i === goalIndex) break;
            [i - 1, i + 1, i - size, i + size].forEach((n) => {
                if (n < 0 || n >= cells.length || previous[n] !== undefined) return;
                if (Math.abs((n % size) - (i % size)) > 1) return;
                if (cells[n].classList.contains('wall')) return;
                previous[n] = i;
                queue.push(n);
            });
        }
        const path = [];
        for (let i = goalIndex; i !== -1; i = previous[i]) path.unshift(cells[i]);
        return path;
    }

    // Une action du robot, selon ce qui est à l'écran
    function step() {
        const interactiveMenu = $('.context-menu.interactive');
        if (interactiveMenu) {
            const wanted = quoted().pop();
            const item = interactiveMenu.querySelector(`[data-item="${wanted}"]`);
            if (item) press(item, 0);
            return;
        }
        if ($('.browser')) {
            const link = $(`.fake-link[data-name="${quoted()[0]}"]`);
            if (link) press(link, 1);
            return;
        }
        if ($('.scroll-list')) {
            const name = quoted()[0];
            const row = $$('.scroll-list .row').find((r) => (name ? r.textContent === name : r.textContent === 'Mon dossier'));
            if (row) {
                row.scrollIntoView({ block: 'center' });
                press(row, 0);
            }
            return;
        }
        if ($('.wheel-layout')) {
            const cells = $$('.wheel-layout .cell');
            const position = cells.findIndex((c) => c.innerHTML.includes('M8 9'));
            const goal = cells.findIndex((c) => c.classList.contains('goal'));
            if (position !== goal) {
                document.body.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: goal > position ? 100 : -100 }));
            }
            return;
        }
        if ($('.grid.maze')) {
            const piece = $('.maze-piece');
            if (!piece) return;
            pointer(piece, 'pointerdown', center(piece));
            const path = mazePath();
            path.forEach((cell) => pointer(piece, 'pointermove', center(cell)));
            pointer(piece, 'pointerup', center(path[path.length - 1]));
            return;
        }
        if ($('.dropzone-board')) {
            const piece = $('.piece.draggable');
            if (!piece) return;
            const folders = $$('.piece.folder');
            const name = quoted()[0];
            const folder = folders.length === 1 ? folders[0] : folders.find((f) => f.textContent === name);
            pointer(piece, 'pointerdown', center(piece));
            pointer(piece, 'pointermove', center(folder));
            pointer(piece, 'pointerup', center(folder));
            return;
        }
        const target = $('.cell.target');
        if (!target) return;
        if ($('#mouseHint .arrow-text')) {
            // Double-clic : deux clics immédiats
            press(target, 0);
            press(target, 0);
            return;
        }
        const text = message();
        press(target, /clic droit|bouton droit/.test(text) ? 2 : /central/.test(text) ? 1 : 0);
    }

    async function playLevel(activity, number) {
        MouseGame.startActivity(activity, number);
        const deadline = Date.now() + 20000;
        while (!finished() && Date.now() < deadline) {
            step();
            await wait(50);
        }
        const name = `${activity.title} · niveau ${number}`;
        if (!finished()) {
            log(false, `${name} : pas terminé (message : « ${message()} »)`);
            return;
        }
        const errors = errorsCount();
        const unlocked = number === activity.levels.length || $('#resultDetail').textContent.includes('débloqué');
        log(errors === 0 && unlocked, `${name} : ${errors} erreur(s)${unlocked ? '' : ', niveau suivant non débloqué'}`);
    }

    // Scénarios d'erreur : on vérifie que le jeu compte bien les erreurs
    async function scenarios() {
        const byId = (id) => MouseGame.activities.find((a) => a.id === id);

        MouseGame.startActivity(byId('gauche'), 1);
        press($('.cell.target'), 2);
        log(errorsCount() === 1, 'Clic gauche : le mauvais bouton compte une erreur');

        MouseGame.startActivity(byId('gauche'), 3);
        await wait(200);
        log(errorsCount() >= 1 && /Trop tard/.test(message()), 'Clic gauche niv. 3 : le temps écoulé compte une erreur');

        MouseGame.startActivity(byId('droit'), 2);
        press($('.cell.target'), 2);
        const action = quoted().pop();
        const wrongItem = $$('.context-menu.interactive [data-item]').find((i) => i.dataset.item !== action);
        press(wrongItem, 0);
        log(errorsCount() === 1, 'Clic droit niv. 2 : la mauvaise action du menu compte une erreur');

        MouseGame.startActivity(byId('double'), 1);
        press($('.cell.target'), 0);
        await wait(100);
        log(errorsCount() === 1 && /Trop lent/.test(message()), 'Double-clic : un double-clic trop lent compte une erreur');

        MouseGame.startActivity(byId('central'), 3);
        press($(`.fake-link[data-name="${quoted()[0]}"]`), 0);
        log(errorsCount() === 1, 'Bouton central niv. 3 : le clic gauche sur le lien compte une erreur');

        MouseGame.startActivity(byId('glisser'), 3);
        const piece = $('.maze-piece');
        const wall = $('.grid.maze .cell.wall');
        pointer(piece, 'pointerdown', center(piece));
        pointer(piece, 'pointermove', center(wall));
        pointer(piece, 'pointerup', center(wall));
        log(errorsCount() === 1, 'Labyrinthe : toucher un mur compte une erreur');

        MouseGame.startActivity(byId('molette'), 3);
        const wrongRow = $$('.scroll-list .row').find((r) => r.textContent !== quoted()[0]);
        press(wrongRow, 0);
        log(errorsCount() === 1, 'Molette niv. 3 : cliquer sur le mauvais fichier compte une erreur');
    }

    async function run() {
        MouseGame.resetProgress();
        for (const activity of MouseGame.activities) {
            for (let n = 1; n <= activity.levels.length; n++) {
                await playLevel(activity, n);
            }
        }
        await scenarios();
        MouseGame.resetProgress();
        MouseGame.showMenu();
        const passed = results.filter((r) => r.ok).length;
        const summary = document.createElement('strong');
        summary.textContent = `${passed === results.length ? '✅' : '❌'} ${passed} / ${results.length} tests réussis`;
        report.appendChild(summary);
        window.testResults = { passed, total: results.length, results };
    }

    run();
})();
