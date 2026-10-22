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
    function hover(el) {
        el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    }

    // Sélectionne du texte dans la page puis relâche le bouton (clicks : 1 glisser, 2 double, 3 triple)
    function selectText(paragraph, start, end, clicks) {
        const range = document.createRange();
        range.setStart(paragraph.firstChild, start);
        range.setEnd(paragraph.firstChild, end);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        paragraph.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, detail: clicks }));
    }

    function selectWanted() {
        const paragraphs = $$('.text-page p');
        // \S et non \w, qui ne reconnaît pas les lettres accentuées de « deuxième »
        const triple = message().match(/Triple-cliquez dans le (\S+) paragraphe/);
        if (triple) {
            const p = paragraphs[['premier', 'deuxième', 'troisième'].indexOf(triple[1])];
            selectText(p, 0, p.firstChild.length, 3);
            return;
        }
        const wanted = quoted()[0];
        if (!wanted) return;
        const p = paragraphs.find((el) => el.textContent.includes(wanted));
        const start = p.textContent.indexOf(wanted);
        selectText(p, start, start + wanted.length, /Double-cliquez/.test(message()) ? 2 : 1);
    }

    function step() {
        if ($('.text-page')) {
            selectWanted();
            return;
        }
        if ($('#gameTitle').textContent.startsWith('Survol')) {
            const [first, second] = quoted();
            if ($('.hover-desk')) {
                // Sous-menu : survoler le parent, puis cliquer dans le sous-menu une fois ouvert
                const sub = $(`.desk-sub[data-parent="${first}"]`);
                if (sub) {
                    const item = sub.querySelector(`[data-name="${second}"]`);
                    if (item) press(item, 0);
                } else {
                    const item = $(`.desk-item[data-name="${first}"]`);
                    if (item) hover(item);
                }
                return;
            }
            const named = first && $(`.cell[data-name="${first}"]`);
            if (named) {
                press(named, 0);
                return;
            }
            const target = $('.cell.target');
            if (target) hover(target);
            return;
        }
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
        const detail = $('#resultDetail').textContent;
        const isLastLevel = number === activity.levels.length;
        const isLastActivity = activity === MouseGame.activities[MouseGame.activities.length - 1];
        const problems = [];
        if (!isLastLevel && !detail.includes('débloqué')) problems.push('niveau suivant non débloqué');
        // Niveau 1 réussi : l'atelier suivant du chemin s'ouvre
        if (number === 1 && !isLastActivity && !detail.includes('Nouvel atelier')) problems.push('atelier suivant non annoncé');
        // Dernier niveau réussi : badge gagné
        if (isLastLevel && !detail.includes('Nouveau badge')) problems.push('badge non annoncé');
        if (isLastLevel && isLastActivity && !detail.includes('Tous les badges')) problems.push('diplôme non annoncé');
        log(errors === 0 && !problems.length, `${name} : ${errors} erreur(s)${problems.length ? ', ' + problems.join(', ') : ''}`);
    }

    // Chemin de progression : au départ, seul le premier atelier est ouvert
    function checkStartOfPath() {
        MouseGame.showMenu();
        const locked = $$('.path .card.locked').length;
        const here = $('.path .card.here .card-title');
        log(locked === MouseGame.activities.length - 1 && here && here.textContent === 'Survol'
            && $('.badges-title').textContent.includes('0 / 9'), 'Chemin : au départ, seul « Survol » est ouvert');
    }

    // Progression d'avant l'atelier Survol : les ateliers déjà commencés restent ouverts
    function checkExistingProgress() {
        MouseGame.resetProgress();
        try {
            localStorage.setItem('test.mouseClicGame.stars', JSON.stringify({ 'gauche.1': 3, 'droit.1': 3, 'double.1': 2 }));
        } catch (e) { /* stockage indisponible */ }
        MouseGame.showMenu();
        const open = $$('.path .card:not(.locked) .card-title').map((t) => t.textContent);
        const here = $('.path .card.here .card-title');
        log(open.join(',') === 'Survol,Clic gauche,Clic droit,Double-clic' && here && here.textContent === 'Survol',
            'Progression existante : les ateliers commencés restent ouverts, « Survol » est proposé');
        MouseGame.resetProgress();
    }

    // Après tous les niveaux : 7 badges, diplôme, plus aucun atelier verrouillé
    function checkEndOfPath() {
        MouseGame.showMenu();
        log($('.badges-title').textContent.includes('9 / 9') && $('#badges .diploma') && !$('.path .card.locked')
            && $$('.path .card-badge').length === 9 && $$('.connector.done').length === 7 && $('.turn.done'),
        'Chemin : 9 badges sur 9, diplôme et chemin entièrement vert');
    }

    // Sans bouton central : l'atelier est franchi, et son badge n'est plus demandé
    function checkWithoutMiddle() {
        MouseGame.resetProgress();
        try {
            localStorage.setItem('test.mouseClicGame.stars', JSON.stringify({ 'survol.1': 3, 'gauche.1': 3, 'droit.1': 3, 'double.1': 3 }));
            localStorage.setItem('test.mouseClicGame.settings', JSON.stringify({ noMiddle: true }));
        } catch (e) { /* stockage indisponible */ }
        MouseGame.showMenu();
        const here = $('.path .card.here .card-title');
        log(here && here.textContent === 'Molette' && $('.badges-title').textContent.includes('0 / 8'),
            'Chemin sans bouton central : « Molette » s’ouvre et il reste 8 badges');
    }

    // Scénarios d'erreur : on vérifie que le jeu compte bien les erreurs
    async function scenarios() {
        const byId = (id) => MouseGame.activities.find((a) => a.id === id);

        MouseGame.startActivity(byId('survol'), 1);
        hover($('.cell.target'));
        press($('.cell.target'), 0);
        await wait(100);
        log(errorsCount() === 1 && !$('.tooltip'), 'Survol : cliquer au lieu d’attendre compte une erreur, sans bulle');

        MouseGame.startActivity(byId('survol'), 2);
        const [parentName, childName] = quoted();
        hover($(`.desk-item[data-name="${parentName}"]`));
        await wait(100);
        const wrongChild = $$('.desk-sub-item').find((i) => i.dataset.name !== childName);
        press(wrongChild, 0);
        log(errorsCount() === 1, 'Survol niv. 2 : le mauvais choix du sous-menu compte une erreur');

        MouseGame.startActivity(byId('selection'), 1);
        const word = quoted()[0];
        const wordParagraph = $$('.text-page p').find((el) => el.textContent.includes(word));
        const wordStart = wordParagraph.textContent.indexOf(word);
        selectText(wordParagraph, wordStart, wordStart + 3, 1);
        await wait(30);
        log(errorsCount() === 1 && /Il manque un bout/.test(message()), 'Sélection : un mot sélectionné à moitié compte une erreur');

        // Niveau 3 : la bonne sélection faite en glissant au lieu du raccourci est refusée, sans erreur
        MouseGame.startActivity(byId('selection'), 3);
        const shortcut = message();
        if (/Double-cliquez/.test(shortcut)) {
            const w = quoted()[0];
            const p = $$('.text-page p').find((el) => el.textContent.includes(w));
            selectText(p, p.textContent.indexOf(w), p.textContent.indexOf(w) + w.length, 1);
        } else {
            const p = $$('.text-page p')[['premier', 'deuxième', 'troisième'].indexOf(shortcut.match(/le (\S+) paragraphe/)[1])];
            selectText(p, 0, p.firstChild.length, 1);
        }
        await wait(30);
        log(errorsCount() === 0 && /essayez le (double|triple)-clic/.test(message()) && $('#score').textContent.startsWith('Réussites : 0'),
            'Sélection niv. 3 : sans le raccourci, on propose de réessayer');

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

    // Chaque démonstration se joue jusqu'au bout, puis « C'est parti ! » rend la main
    async function demos() {
        const modal = $('#demoModal');
        for (const activity of MouseGame.activities) {
            let done = false;
            MouseDemo.play(activity, () => { done = true; });
            const deadline = Date.now() + 5000;
            while (modal.dataset.state !== 'finished' && Date.now() < deadline) await wait(20);
            const finishedDemo = modal.dataset.state === 'finished';
            $('#demoGo').click();
            log(finishedDemo && done && modal.style.display === 'none', `Démonstration ${activity.title}`);
        }

        // « Revoir la démo » pendant une partie : la partie recommence ensuite
        const gauche = MouseGame.activities.find((a) => a.id === 'gauche');
        MouseGame.startActivity(gauche, 2);
        press($('.cell.target'), 0);
        $('#demoButton').click();
        const opened = modal.style.display === 'block';
        $('#demoGo').click();
        log(opened && /Niveau 2/.test($('#gameTitle').textContent) && $('#score').textContent.startsWith('Réussites : 0')
            && $$('.cell.target').length === 1, 'Revoir la démo puis reprendre la partie');
    }

    async function run() {
        MouseGame.resetProgress();
        checkStartOfPath();
        for (const activity of MouseGame.activities) {
            for (let n = 1; n <= activity.levels.length; n++) {
                await playLevel(activity, n);
            }
        }
        checkEndOfPath();
        checkWithoutMiddle();
        checkExistingProgress();
        await scenarios();
        await demos();
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
