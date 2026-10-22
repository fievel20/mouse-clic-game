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

    // Énoncé de la manche (en gras)
    function instruction() {
        return $('#instruction').textContent;
    }

    // Commentaire sous l'énoncé (vert, rouge ou conseil)
    function feedback() {
        return $('#feedback').textContent;
    }

    // Énoncé et commentaire ensemble, pour chercher un mot dans l'un ou l'autre
    function message() {
        return instruction() + '\n' + feedback();
    }

    // Textes entre « guillemets » de l'énoncé : fichiers, mots ou actions demandés
    function quoted() {
        const match = instruction().match(/« ([^»]+) »/g);
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
        const triple = instruction().match(/Triple-cliquez dans le (\S+) paragraphe/);
        if (triple) {
            const p = paragraphs[['premier', 'deuxième', 'troisième'].indexOf(triple[1])];
            selectText(p, 0, p.firstChild.length, 3);
            return;
        }
        const wanted = quoted()[0];
        if (!wanted) return;
        const p = paragraphs.find((el) => el.textContent.includes(wanted));
        const start = p.textContent.indexOf(wanted);
        selectText(p, start, start + wanted.length, /Double-cliquez/.test(instruction()) ? 2 : 1);
    }

    // Fait glisser l'ascenseur pour amener la liste à la position voulue (en pixels de défilement)
    function dragThumbTo(view, target) {
        const thumb = view.querySelector('.sb-thumb');
        const rows = view.querySelectorAll('.sb-row').length;
        const max = rows * 40 - 320;
        const travel = view.querySelector('.sb-track').offsetHeight - thumb.offsetHeight;
        const from = center(thumb);
        const scroll = Number(view.dataset.scroll);
        pointer(thumb, 'pointerdown', from);
        pointer(thumb, 'pointermove', { x: from.x, y: from.y + (target - scroll) * travel / max });
        pointer(thumb, 'pointerup', from);
    }

    function stepScrollbar(view) {
        const name = quoted()[0];
        const row = $$('#board .sb-row').find((r) => r.textContent === (name || 'Mon dossier'));
        if (!row) return;
        const top = Number(row.dataset.index) * 40;
        const scroll = Number(view.dataset.scroll);
        if (top >= scroll && top + 40 <= scroll + 320) {
            press(row, 0);
        } else if ($('#board').dataset.level === '2') {
            press(view.querySelector(top > scroll ? '.sb-arrow.down' : '.sb-arrow.up'), 0);
        } else {
            dragThumbTo(view, top - 140);
        }
    }

    // Clic gauche avec touches du clavier : { ctrlKey: true } ou { shiftKey: true }
    function pressWith(el, keys) {
        el.dispatchEvent(new MouseEvent('mousedown', Object.assign({ bubbles: true, cancelable: true, button: 0 }, keys)));
    }

    const isPhoto = (el) => el.innerHTML.includes('<circle cx="9"');

    // Trace un rectangle de sélection autour des photos du bureau (ou d'une partie)
    function lassoAround(targets) {
        const desk = $('.ms-desk');
        const boxes = targets.map((el) => el.getBoundingClientRect());
        const from = { x: Math.min(...boxes.map((b) => b.left)) - 8, y: Math.min(...boxes.map((b) => b.top)) - 8 };
        const to = { x: Math.max(...boxes.map((b) => b.right)) + 8, y: Math.max(...boxes.map((b) => b.bottom)) + 8 };
        pointer(desk, 'pointerdown', from);
        pointer(desk, 'pointermove', to);
        pointer(desk, 'pointerup', to);
    }

    function stepMultiple() {
        const names = quoted();
        if ($('.ms-explorer')) {
            names.forEach((name, i) => {
                const item = $$('.ms-explorer .ms-item').find((el) => el.textContent === name);
                if (item) pressWith(item, i === 0 ? {} : { ctrlKey: true });
            });
        } else if ($('.ms-list') && names.length === 2) {
            const row = (name) => $$('.ms-row').find((el) => el.textContent === name);
            pressWith(row(names[0]), {});
            pressWith(row(names[1]), { shiftKey: true });
        } else if ($('.ms-desk') && !$('.ms-desk .success')) {
            lassoAround($$('.ms-free').filter(isPhoto));
        }
    }

    // ---------- Mission finale : le bureau expose l'action attendue dans data-action ----------
    function pointerWith(el, type, { x, y }, keys = {}) {
        el.dispatchEvent(new PointerEvent(type, Object.assign({ bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y, pointerId: 1 }, keys)));
    }

    function missionIcon(name) {
        return $(`.mi-desk .mi-icon[data-name="${name}"]`);
    }

    // Glisse un fichier (et la sélection qui le suit) sur un dossier
    function missionDrag(name, into) {
        const desk = $('.mi-desk');
        const from = center(missionIcon(name));
        const to = center(missionIcon(into));
        pointerWith(missionIcon(name), 'pointerdown', from);
        pointerWith(desk, 'pointermove', to);
        pointerWith(desk, 'pointerup', to);
    }

    function missionMenu(name, action) {
        press(missionIcon(name), 2);
        const entry = $(`.mi-desk .context-menu [data-action="${action}"]`);
        if (entry) press(entry, 0);
    }

    function stepMission(desk) {
        const action = JSON.parse(desk.dataset.action);
        switch (action.type) {
            case 'open':
                missionIcon(action.name).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                break;
            case 'close':
                press($('.mi-close'), 0);
                break;
            case 'rename':
            case 'delete':
                if (missionIcon(action.name)) missionMenu(action.name, action.type);
                break;
            case 'select': {
                const icons = action.names.map(missionIcon);
                if (icons.length >= 4) {
                    // Rectangle de sélection, en partant du vide
                    const boxes = icons.map((el) => el.getBoundingClientRect());
                    const from = { x: Math.min(...boxes.map((b) => b.left)) - 8, y: Math.min(...boxes.map((b) => b.top)) - 8 };
                    const to = { x: Math.max(...boxes.map((b) => b.right)) + 8, y: Math.max(...boxes.map((b) => b.bottom)) + 8 };
                    pointerWith(desk, 'pointerdown', from);
                    pointerWith(desk, 'pointermove', to);
                    pointerWith(desk, 'pointerup', to);
                } else {
                    // Un clic, puis Ctrl + clic sur les autres
                    icons.forEach((el, i) => {
                        pointerWith(el, 'pointerdown', center(el), i ? { ctrlKey: true } : {});
                        pointerWith(desk, 'pointerup', center(el));
                    });
                }
                break;
            }
            case 'move':
                if (missionIcon(action.names[0])) missionDrag(action.names[0], action.into);
                break;
            case 'scroll-end': {
                const doc = $('.mi-doc');
                doc.scrollTop = doc.scrollHeight;
                doc.dispatchEvent(new Event('scroll'));
                break;
            }
            case 'textselect': {
                const p = $$('.mi-doc p').find((el) => el.textContent.includes(action.text));
                const range = document.createRange();
                const start = p.textContent.indexOf(action.text);
                range.setStart(p.firstChild, start);
                range.setEnd(p.firstChild, start + action.text.length);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
                p.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
                break;
            }
            default:
                break;
        }
    }

    function step() {
        const missionDesk = $('.mi-desk');
        if (missionDesk) {
            stepMission(missionDesk);
            return;
        }
        if ($('.ms-explorer, .ms-list, .ms-desk')) {
            stepMultiple();
            return;
        }
        const scrollView = $('#board .sb-view');
        if (scrollView) {
            stepScrollbar(scrollView);
            return;
        }
        if ($('.text-page')) {
            selectWanted();
            return;
        }
        // L'atelier se lit sur le plateau : en mode libre, le titre ne le donne pas
        if ($('#board').dataset.activity === 'survol') {
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
        const text = instruction();
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
        if (isLastLevel && isLastActivity && !detail.includes('mode libre est débloqué')) problems.push('mode libre non annoncé');
        log(errors === 0 && !problems.length, `${name} : ${errors} erreur(s)${problems.length ? ', ' + problems.join(', ') : ''}`);
    }

    // Les vérifications du chemin se calculent à partir des ateliers enregistrés :
    // ajouter un atelier ne demande pas de les modifier
    const activities = () => MouseGame.activities;

    // Chemin de progression : au départ, seul le premier atelier est ouvert
    function checkStartOfPath() {
        MouseGame.showMenu();
        const total = activities().length;
        const first = activities()[0].title;
        const locked = $$('.path .card.locked').length;
        const here = $('.path .card.here .card-title');
        log(locked === total - 1 && here && here.textContent === first
            && $('.badges-title').textContent.includes(`0 / ${total}`), `Chemin : au départ, seul « ${first} » est ouvert`);
        log(!$('#freeButton'), 'Mode libre : invisible tant que tous les niveaux ne sont pas terminés');
    }

    // Mode libre : des exercices tirés au hasard s'enchaînent sans fin
    async function checkFreeMode() {
        MouseGame.showMenu();
        const button = $('#freeButton');
        log(Boolean(button), 'Mode libre : le bouton apparaît quand tous les niveaux sont terminés');
        if (!button) return;
        button.click();
        const played = new Set();
        const deadline = Date.now() + 40000;
        const total = () => Number(($('#score').textContent.match(/Réussites : (\d+)/) || [0, 0])[1]);
        while (total() < 25 && !finished() && Date.now() < deadline) {
            played.add($('#board').dataset.activity);
            step();
            await wait(50);
        }
        log(total() >= 25 && !finished() && errorsCount() === 0 && /Mode libre/.test($('#gameTitle').textContent)
            && /Record : (\d+)/.test($('#score').textContent) && Number($('#score').textContent.match(/Record : (\d+)/)[1]) >= 25,
        `Mode libre : ${total()} réussites d’affilée, sans fin de partie, record enregistré`);
        log(played.size >= 5, `Mode libre : ${played.size} ateliers différents tirés au hasard`);
        MouseGame.showMenu();
    }

    // Ateliers déjà commencés (progression d'avant un nouvel atelier) : ils restent ouverts
    function checkExistingProgress() {
        const started = ['gauche', 'droit', 'double'];
        MouseGame.resetProgress();
        try {
            localStorage.setItem('test.mouseClicGame.stars', JSON.stringify({ 'gauche.1': 3, 'droit.1': 3, 'double.1': 2 }));
        } catch (e) { /* stockage indisponible */ }
        MouseGame.showMenu();
        const expected = activities().filter((a, i) => i === 0 || started.includes(a.id)).map((a) => a.title);
        const open = $$('.path .card:not(.locked) .card-title').map((t) => t.textContent);
        const here = $('.path .card.here .card-title');
        log(open.join(',') === expected.join(',') && here && here.textContent === expected[0],
            `Progression existante : les ateliers commencés restent ouverts, « ${expected[0]} » est proposé`);
        MouseGame.resetProgress();
    }

    // Après tous les niveaux : tous les badges, diplôme, plus aucun atelier verrouillé, chemin tout vert
    function checkEndOfPath() {
        MouseGame.showMenu();
        const total = activities().length;
        // Une liaison entre deux cartes d'une même ligne ; un virage entre deux lignes
        const links = total - $$('.path-row').length;
        log($('.badges-title').textContent.includes(`${total} / ${total}`) && $('#badges .diploma') && !$('.path .card.locked')
            && $$('.path .card-badge').length === total && $$('.connector.done').length === links
            && $$('.turn').every((turn) => turn.classList.contains('done')),
        `Chemin : ${total} badges sur ${total}, diplôme et chemin entièrement vert`);
    }

    // Sans bouton central : l'atelier est franchi, et son badge n'est plus demandé
    function checkWithoutMiddle() {
        const centralIndex = activities().findIndex((a) => a.id === 'central');
        const before = {};
        activities().slice(0, centralIndex).forEach((a) => { before[`${a.id}.1`] = 3; });
        MouseGame.resetProgress();
        try {
            localStorage.setItem('test.mouseClicGame.stars', JSON.stringify(before));
            localStorage.setItem('test.mouseClicGame.settings', JSON.stringify({ noMiddle: true }));
        } catch (e) { /* stockage indisponible */ }
        MouseGame.showMenu();
        const next = activities()[centralIndex + 1].title;
        const here = $('.path .card.here .card-title');
        const remaining = activities().length - 1;
        log(here && here.textContent === next && $('.badges-title').textContent.includes(`0 / ${remaining}`),
            `Chemin sans bouton central : « ${next} » s’ouvre et il reste ${remaining} badges`);
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
        log(errorsCount() === 1 && /Il manque un bout/.test(feedback()), 'Sélection : un mot sélectionné à moitié compte une erreur');

        // Niveau 3 : la bonne sélection faite en glissant au lieu du raccourci est refusée, sans erreur
        MouseGame.startActivity(byId('selection'), 3);
        const shortcut = instruction();
        if (/Double-cliquez/.test(shortcut)) {
            const w = quoted()[0];
            const p = $$('.text-page p').find((el) => el.textContent.includes(w));
            selectText(p, p.textContent.indexOf(w), p.textContent.indexOf(w) + w.length, 1);
        } else {
            const p = $$('.text-page p')[['premier', 'deuxième', 'troisième'].indexOf(shortcut.match(/le (\S+) paragraphe/)[1])];
            selectText(p, 0, p.firstChild.length, 1);
        }
        await wait(30);
        log(errorsCount() === 0 && /essayez le (double|triple)-clic/.test(feedback()) && $('#score').textContent.startsWith('Réussites : 0'),
            'Sélection niv. 3 : sans le raccourci, on propose de réessayer');

        MouseGame.startActivity(byId('barre'), 1);
        const sbView = $('#board .sb-view');
        sbView.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 100 }));
        const wheelRefused = sbView.dataset.scroll === '0' && /pas de molette/.test(feedback());
        press($$('#board .sb-row').find((r) => r.textContent !== 'Mon dossier' && Number(r.dataset.index) < 8), 0);
        log(wheelRefused && errorsCount() === 1, 'Barre : la molette est désactivée, et une mauvaise ligne compte une erreur');

        MouseGame.startActivity(byId('barre'), 2);
        dragThumbTo($('#board .sb-view'), 400);
        log($('#board .sb-view').dataset.scroll === '0' && /flèches/.test(feedback()) && errorsCount() === 0,
            'Barre niv. 2 : l’ascenseur est refusé, sans erreur, au profit des flèches');

        MouseGame.startActivity(byId('multiple'), 1);
        const [firstName, secondName] = quoted();
        const msItem = (name) => $$('.ms-explorer .ms-item').find((el) => el.textContent === name);
        pressWith(msItem(firstName), {});
        pressWith(msItem(secondName), {});
        log(errorsCount() === 1 && /Sans Ctrl/.test(feedback()) && $$('.ms-item.selected').length === 1,
            'Sélection multiple : un clic sans Ctrl remplace la sélection et compte une erreur');

        MouseGame.startActivity(byId('multiple'), 2);
        const [rangeFrom, rangeTo] = quoted();
        const msRows = $$('.ms-row');
        const toIndex = msRows.findIndex((el) => el.textContent === rangeTo);
        pressWith(msRows.find((el) => el.textContent === rangeFrom), {});
        pressWith(msRows[toIndex + 1] || msRows[toIndex - 1], { shiftKey: true });
        log(errorsCount() === 1, 'Sélection multiple niv. 2 : une mauvaise plage compte une erreur');

        MouseGame.startActivity(byId('multiple'), 3);
        lassoAround($$('.ms-free').filter(isPhoto).slice(0, 1));
        log(errorsCount() === 1 && /Il manque 3 photos/.test(feedback()),
            'Sélection multiple niv. 3 : un rectangle trop petit compte une erreur');

        // Mission : une action qui n'est pas la tâche en cours est refusée, et le bureau n'est pas abîmé
        MouseGame.startActivity(byId('mission'), 1);
        missionMenu('recette.txt', 'delete');
        const refusedDelete = errorsCount() === 1 && missionIcon('recette.txt') && /Pas maintenant/.test(feedback());
        missionDrag('plage.jpg', 'Photos');
        log(refusedDelete && errorsCount() === 2 && missionIcon('plage.jpg') && $('#score').textContent.startsWith('Réussites : 0'),
            'Mission : supprimer ou ranger hors de la tâche en cours est refusé et compte une erreur');

        MouseGame.startActivity(byId('gauche'), 1);
        const statement = instruction();
        press($('.cell.target'), 2);
        log(errorsCount() === 1, 'Clic gauche : le mauvais bouton compte une erreur');
        log(instruction() === statement && /bon bouton/.test(feedback()) && $('#feedback').classList.contains('bad'),
            'Après une erreur, l’énoncé reste affiché et le commentaire rouge s’ajoute en dessous');

        MouseGame.startActivity(byId('gauche'), 3);
        await wait(200);
        log(errorsCount() >= 1 && /Trop tard/.test(feedback()), 'Clic gauche niv. 3 : le temps écoulé compte une erreur');

        MouseGame.startActivity(byId('droit'), 2);
        press($('.cell.target'), 2);
        const action = quoted().pop();
        const wrongItem = $$('.context-menu.interactive [data-item]').find((i) => i.dataset.item !== action);
        press(wrongItem, 0);
        log(errorsCount() === 1, 'Clic droit niv. 2 : la mauvaise action du menu compte une erreur');

        MouseGame.startActivity(byId('double'), 1);
        press($('.cell.target'), 0);
        await wait(100);
        log(errorsCount() === 1 && /Trop lent/.test(feedback()), 'Double-clic : un double-clic trop lent compte une erreur');

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
        await checkFreeMode();
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
