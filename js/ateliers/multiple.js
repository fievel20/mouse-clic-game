// Atelier sélection multiple, comme dans l'explorateur de fichiers de Windows.
// Niveau 1 : Ctrl + clic pour ajouter des fichiers à la sélection.
// Niveau 2 : Maj + clic pour sélectionner une plage dans une liste.
// Niveau 3 : tracer un rectangle de sélection autour d'un groupe de fichiers.
(() => {
    // Ctrl sous Windows, Cmd sur Mac
    const withCtrl = (e) => e.ctrlKey || e.metaKey;

    const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

    function label(name) {
        return `<span class="label">${name}</span>`;
    }

    function listNames(names) {
        const quoted = names.map((n) => `« ${n} »`);
        return quoted.slice(0, -1).join(', ') + ' et ' + quoted[quoted.length - 1];
    }

    // ---------- Niveau 1 : Ctrl + clic ----------
    function startCtrlGame(game) {
        const { ICONS, FILES } = game;
        const area = document.createElement('div');
        area.className = 'ms-explorer';
        game.board.appendChild(area);

        let files = [];
        let wanted = new Set();
        const selected = new Set();
        let locked = false;

        function render() {
            Array.from(area.children).forEach((el, i) => el.classList.toggle('selected', selected.has(i)));
        }

        function nextRound() {
            files = game.shuffle(FILES);
            area.innerHTML = files.map((f, i) => `<div class="ms-item" data-index="${i}">${ICONS[f.icon]}${label(f.name)}</div>`).join('');
            const count = 2 + game.randomInt(2);
            wanted = new Set(game.shuffle(files.map((_, i) => i)).slice(0, count));
            selected.clear();
            locked = false;
            game.setHint('ctrl');
            game.setInstruction(`Sélectionnez ${listNames([...wanted].map((i) => files[i].name))} : maintenez la touche Ctrl et cliquez sur chacun.`);
        }

        area.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || locked) return;
            // Pas de sélection de texte quand on clique avec Ctrl ou Maj
            e.preventDefault();
            const item = e.target.closest('.ms-item');
            if (!item) {
                // Comme sous Windows : un clic dans le vide vide la sélection
                selected.clear();
                render();
                game.setFeedback('Un clic dans le vide enlève toute la sélection. Recommencez avec Ctrl.');
                return;
            }
            const index = Number(item.dataset.index);
            if (withCtrl(e)) {
                if (selected.has(index)) {
                    selected.delete(index);
                    game.setFeedback('Ctrl + clic sur un fichier déjà sélectionné l’enlève de la sélection.');
                } else if (!wanted.has(index)) {
                    game.error();
                    item.classList.add('error');
                    game.later(() => item.classList.remove('error'), 600);
                    game.setFeedback(`« ${files[index].name} » n’est pas demandé.`, 'bad');
                    return;
                } else {
                    selected.add(index);
                    game.setFeedback(selected.size < wanted.size ? 'Bien ! Gardez Ctrl enfoncé pour le suivant.' : '');
                }
            } else {
                // Sans Ctrl, le clic remplace la sélection
                const lost = [...selected].length > 0 && !(selected.size === 1 && selected.has(index));
                selected.clear();
                selected.add(index);
                if (!wanted.has(index)) {
                    game.error();
                    game.setFeedback(`« ${files[index].name} » n’est pas demandé.`, 'bad');
                } else if (lost) {
                    game.error();
                    game.setFeedback('Sans Ctrl, le clic remplace toute la sélection ! Maintenez Ctrl pour ajouter un fichier.', 'bad');
                } else {
                    game.setFeedback('Premier fichier sélectionné. Maintenant, maintenez Ctrl pour ajouter les autres.');
                }
            }
            render();
            if (sameSet(selected, wanted)) {
                locked = true;
                area.querySelectorAll('.selected').forEach((el) => el.classList.add('success'));
                game.setFeedback('Bravo, tous les fichiers sont sélectionnés !', 'good');
                game.success(nextRound, 1200);
            }
        });
        area.addEventListener('contextmenu', (e) => e.preventDefault());
        nextRound();
    }

    // ---------- Niveau 2 : Maj + clic ----------
    function startShiftGame(game) {
        const { ICONS, FILES } = game;
        const names = FILES.map((f) => f.name).sort();
        const icons = {};
        FILES.forEach((f) => { icons[f.name] = f.icon; });
        const list = document.createElement('div');
        list.className = 'ms-list';
        list.innerHTML = names.map((n, i) => `<div class="ms-row" data-index="${i}">${ICONS[icons[n]]}<span>${n}</span></div>`).join('');
        game.board.appendChild(list);
        const rows = Array.from(list.children);

        let from = 0;
        let to = 0;
        let anchor = -1;
        const selected = new Set();
        let locked = false;

        function render() {
            rows.forEach((row, i) => row.classList.toggle('selected', selected.has(i)));
        }

        function nextRound() {
            const size = 3 + game.randomInt(3);
            from = game.randomInt(names.length - size + 1);
            to = from + size - 1;
            selected.clear();
            anchor = -1;
            rows.forEach((row) => row.classList.remove('success'));
            render();
            locked = false;
            game.setHint('shift');
            game.setInstruction(`Sélectionnez de « ${names[from]} » à « ${names[to]} » : cliquez sur le premier, puis maintenez Maj et cliquez sur le dernier.`);
        }

        list.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || locked) return;
            e.preventDefault();
            const row = e.target.closest('.ms-row');
            if (!row) return;
            const index = Number(row.dataset.index);
            if (e.shiftKey && anchor >= 0) {
                selected.clear();
                for (let i = Math.min(anchor, index); i <= Math.max(anchor, index); i++) selected.add(i);
            } else if (withCtrl(e)) {
                if (selected.has(index)) selected.delete(index); else selected.add(index);
                anchor = index;
            } else {
                selected.clear();
                selected.add(index);
                anchor = index;
            }
            render();
            const expected = new Set();
            for (let i = from; i <= to; i++) expected.add(i);
            if (sameSet(selected, expected)) {
                locked = true;
                rows.forEach((r, i) => { if (selected.has(i)) r.classList.add('success'); });
                game.setFeedback('Bravo, toute la plage est sélectionnée !', 'good');
                game.success(nextRound, 1200);
            } else if (e.shiftKey && anchor >= 0) {
                game.error();
                game.setFeedback(`Ce n’est pas la bonne plage. Cliquez sur « ${names[from]} », puis Maj + clic sur « ${names[to]} ».`, 'bad');
            } else if (!e.shiftKey && index === from) {
                game.setFeedback(`Bien ! Maintenant, maintenez Maj et cliquez sur « ${names[to]} ».`);
            } else if (e.shiftKey) {
                game.setFeedback(`Cliquez d’abord sur « ${names[from]} », sans Maj.`);
            }
        });
        list.addEventListener('contextmenu', (e) => e.preventDefault());
        nextRound();
    }

    // ---------- Niveau 3 : rectangle de sélection ----------
    const WIDTH = 620;
    const HEIGHT = 330;
    const ITEM = 76;

    function startLassoGame(game) {
        const { ICONS, FILES } = game;
        const area = document.createElement('div');
        area.className = 'ms-desk';
        game.board.appendChild(area);

        let items = [];          // { el, x, y, wanted }
        let lasso = null;
        let locked = false;

        function overlaps(a, b, margin) {
            return a.x < b.x + b.w + margin && b.x < a.x + a.w + margin && a.y < b.y + b.h + margin && b.y < a.y + a.h + margin;
        }

        function nextRound() {
            area.innerHTML = '';
            items = [];
            // Un groupe de 4 photos, en 2 × 2, quelque part sur le bureau
            const group = { x: 10 + game.randomInt(WIDTH - 2 * 90 - 20), y: 10 + game.randomInt(HEIGHT - 2 * 86 - 20), w: 2 * 90, h: 2 * 86 };
            const photos = game.shuffle(FILES.filter((f) => f.icon === 'image'));
            photos.slice(0, 4).forEach((f, i) => {
                items.push({ name: f.name, icon: f.icon, x: group.x + (i % 2) * 90, y: group.y + Math.floor(i / 2) * 86, wanted: true });
            });
            // Les autres fichiers, éparpillés hors du groupe
            const others = game.shuffle(FILES.filter((f) => f.icon !== 'image')).slice(0, 6);
            others.forEach((f) => {
                for (let tries = 0; tries < 300; tries++) {
                    const spot = { x: 10 + game.randomInt(WIDTH - ITEM - 20), y: 10 + game.randomInt(HEIGHT - ITEM - 20), w: ITEM, h: ITEM };
                    if (overlaps(spot, group, 30)) continue;
                    if (items.some((it) => overlaps(spot, { x: it.x, y: it.y, w: ITEM, h: ITEM }, 10))) continue;
                    items.push({ name: f.name, icon: f.icon, x: spot.x, y: spot.y, wanted: false });
                    break;
                }
            });
            items.forEach((it) => {
                it.el = document.createElement('div');
                it.el.className = 'ms-item ms-free';
                it.el.style.left = it.x + 'px';
                it.el.style.top = it.y + 'px';
                it.el.innerHTML = ICONS[it.icon] + label(it.name);
                area.appendChild(it.el);
            });
            locked = false;
            game.setHint('drag');
            game.setInstruction('Sélectionnez les 4 photos d’un coup : appuyez dans le vide, gardez le bouton enfoncé et tracez un rectangle autour d’elles.');
        }

        function inside(rect) {
            return items.filter((it) => it.x < rect.x + rect.w && rect.x < it.x + ITEM && it.y < rect.y + rect.h && rect.y < it.y + ITEM);
        }

        function point(e) {
            const box = area.getBoundingClientRect();
            return { x: Math.min(WIDTH, Math.max(0, e.clientX - box.left)), y: Math.min(HEIGHT, Math.max(0, e.clientY - box.top)) };
        }

        area.addEventListener('pointerdown', (e) => {
            if (e.button !== 0 || locked) return;
            e.preventDefault();
            if (e.target.closest('.ms-item')) {
                game.setFeedback('Commencez le rectangle dans le vide, à côté des fichiers, pas sur un fichier.');
                return;
            }
            const start = point(e);
            lasso = { start, el: document.createElement('div') };
            lasso.el.className = 'ms-lasso';
            area.appendChild(lasso.el);
            items.forEach((it) => it.el.classList.remove('selected'));
            try {
                area.setPointerCapture(e.pointerId);
            } catch (err) { /* pointeur déjà relâché */ }
        });

        function rectFrom(e) {
            const p = point(e);
            return {
                x: Math.min(p.x, lasso.start.x),
                y: Math.min(p.y, lasso.start.y),
                w: Math.abs(p.x - lasso.start.x),
                h: Math.abs(p.y - lasso.start.y)
            };
        }

        area.addEventListener('pointermove', (e) => {
            if (!lasso) return;
            const r = rectFrom(e);
            Object.assign(lasso.el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
            const hit = inside(r);
            items.forEach((it) => it.el.classList.toggle('selected', hit.includes(it)));
        });

        const finish = (e) => {
            if (!lasso) return;
            const r = rectFrom(e);
            lasso.el.remove();
            lasso = null;
            const hit = inside(r);
            items.forEach((it) => it.el.classList.toggle('selected', hit.includes(it)));
            if (e.type !== 'pointerup' || r.w < 5 || r.h < 5) {
                game.setFeedback('Gardez le bouton enfoncé en déplaçant la souris pour tracer le rectangle.');
                return;
            }
            const wanted = items.filter((it) => it.wanted);
            if (hit.length === wanted.length && hit.every((it) => it.wanted)) {
                locked = true;
                hit.forEach((it) => it.el.classList.add('success'));
                game.setFeedback('Bravo, les 4 photos sont sélectionnées d’un coup !', 'good');
                game.success(nextRound, 1200);
                return;
            }
            game.error();
            const missing = wanted.filter((it) => !hit.includes(it)).length;
            game.setFeedback(missing
                ? `Il manque ${missing} photo${missing > 1 ? 's' : ''} : tracez un rectangle plus grand.`
                : 'Le rectangle prend aussi d’autres fichiers : tracez-le plus près des photos.', 'bad');
        };
        area.addEventListener('pointerup', finish);
        area.addEventListener('pointercancel', finish);
        area.addEventListener('contextmenu', (e) => e.preventDefault());
        nextRound();
    }

    MouseGame.register({
        id: 'multiple', order: 70, title: 'Sélection multiple', hint: 'ctrl', badge: 'Chef d’orchestre',
        text: 'Sélectionnez plusieurs fichiers à la fois.',
        levels: [
            { name: 'Ctrl + clic : ajouter des fichiers un par un', rounds: 6, mode: 'ctrl' },
            { name: 'Maj + clic : sélectionner toute une plage', rounds: 6, mode: 'shift' },
            { name: 'Le rectangle de sélection', rounds: 6, mode: 'lasso' }
        ],
        start: (game, level) => ({ ctrl: startCtrlGame, shift: startShiftGame, lasso: startLassoGame })[level.mode](game)
    });
})();
