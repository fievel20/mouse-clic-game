// Atelier fenêtres, à la manière de Windows 11.
// Niveau 1 : double-clic sur la barre de titre pour passer en plein écran, ou revenir à la taille d'origine.
// Niveau 2 : glisser une fenêtre contre un bord gauche ou droit : elle prend la moitié de l'écran,
//            et les autres fenêtres sont proposées pour l'autre moitié (assistance d'ancrage).
// Niveau 3 : glisser une fenêtre dans un coin : elle prend un quart de l'écran.
(() => {
    const W = 640;           // largeur de l'écran
    const H = 330;           // hauteur utile (sans la barre des tâches)
    const TASKBAR = 30;
    const NORMAL = { w: 270, h: 170 };
    const EDGE = 8;          // distance au bord qui déclenche une moitié d'écran
    const CORNER = 34;       // taille de la zone d'un coin

    const APPS = [
        { name: 'Documents', icon: 'folder' },
        { name: 'Photos', icon: 'image' },
        { name: 'Musique', icon: 'music' },
        { name: 'Courrier', icon: 'file' }
    ];

    const ZONE_NAMES = {
        left: 'contre le bord gauche', right: 'contre le bord droit',
        tl: 'dans le coin en haut à gauche', tr: 'dans le coin en haut à droite',
        bl: 'dans le coin en bas à gauche', br: 'dans le coin en bas à droite'
    };

    // Place et taille d'une fenêtre selon son état
    function geometry(mode) {
        const half = W / 2;
        const middle = H / 2;
        return {
            max: { x: 0, y: 0, w: W, h: H },
            left: { x: 0, y: 0, w: half, h: H },
            right: { x: half, y: 0, w: half, h: H },
            tl: { x: 0, y: 0, w: half, h: middle },
            tr: { x: half, y: 0, w: half, h: middle },
            bl: { x: 0, y: middle, w: half, h: middle },
            br: { x: half, y: middle, w: half, h: middle }
        }[mode];
    }

    function startWindowsGame(game, level) {
        const { ICONS } = game;
        const screen = document.createElement('div');
        screen.className = 'win-screen';
        screen.innerHTML = `<div class="win-desktop"></div>
            <div class="win-taskbar">${APPS.map((a) => `<span title="${a.name}">${ICONS[a.icon]}</span>`).join('')}</div>`;
        game.board.appendChild(screen);
        const desktop = screen.querySelector('.win-desktop');

        let windows = [];        // { name, icon, el, x, y, w, h, mode, saved }
        let zTop = 1;
        let task = null;         // { name, zone, assist } : ce qui est demandé dans la manche
        let locked = false;
        let drag = null;
        let preview = null;
        let assist = null;
        const placed = [];       // niveau 3 : fenêtres déjà rangées dans un coin

        // ---------- Fenêtres ----------

        function apply(win) {
            const g = win.mode === 'normal' ? win : geometry(win.mode);
            Object.assign(win.el.style, { left: g.x + 'px', top: g.y + 'px', width: g.w + 'px', height: g.h + 'px' });
            win.el.classList.toggle('maximized', win.mode !== 'normal');
        }

        function front(win) {
            win.el.style.zIndex = ++zTop;
        }

        function openWindows(count) {
            desktop.innerHTML = '';
            windows = APPS.slice(0, count).map((app, i) => {
                const win = Object.assign({ mode: 'normal', x: 30 + i * 70, y: 20 + i * 30 }, NORMAL, app);
                win.el = document.createElement('div');
                win.el.className = 'win-window';
                win.el.dataset.name = win.name;
                win.el.innerHTML = `<div class="win-title">${ICONS[win.icon]}<span>${win.name}</span>
                    <span class="win-buttons"><span>─</span><span>▢</span><span>✕</span></span></div>
                    <div class="win-body"><div></div><div></div><div></div></div>`;
                desktop.appendChild(win.el);
                apply(win);
                front(win);
                return win;
            });
        }

        function byName(name) {
            return windows.find((w) => w.name === name);
        }

        function setMode(win, mode) {
            if (win.mode === 'normal') win.saved = { x: win.x, y: win.y };
            if (mode === 'normal' && win.saved) Object.assign(win, win.saved);
            win.mode = mode;
            apply(win);
        }

        // ---------- Manches ----------

        function nextRound() {
            closeAssist();
            locked = false;
            const r = game.round;
            if (level.mode === 'toggle') {
                openWindows(1);
                const win = windows[0];
                win.x = 20 + game.randomInt(W - NORMAL.w - 40);
                win.y = 10 + game.randomInt(H - NORMAL.h - 20);
                // Une manche sur deux, la fenêtre est déjà en plein écran : il faut lui rendre sa taille
                if (r % 2 === 1) setMode(win, 'max'); else apply(win);
                task = { name: win.name, zone: win.mode === 'max' ? 'normal' : 'max' };
                game.setHint('double');
                game.setInstruction(task.zone === 'max'
                    ? `Double-cliquez sur la barre de titre de « ${win.name} » pour l’afficher en plein écran.`
                    : `Double-cliquez sur la barre de titre de « ${win.name} » pour lui rendre sa taille d’origine.`);
            } else if (level.mode === 'half') {
                openWindows(3);
                const [a, b] = game.shuffle(windows);
                task = { name: a.name, zone: game.randomInt(2) ? 'left' : 'right', assist: b.name };
                game.setHint('drag');
                game.setInstruction(`Faites glisser « ${a.name} » par sa barre de titre ${ZONE_NAMES[task.zone]} de l’écran, puis choisissez « ${b.name} » pour l’autre moitié.`);
            } else {
                if (r === 0) {
                    openWindows(4);
                    placed.length = 0;
                }
                const free = windows.filter((w) => !placed.includes(w));
                const usedCorners = placed.map((w) => w.mode);
                const corners = ['tl', 'tr', 'bl', 'br'].filter((c) => !usedCorners.includes(c));
                task = { name: free[game.randomInt(free.length)].name, zone: corners[game.randomInt(corners.length)] };
                front(byName(task.name));
                game.setHint('drag');
                game.setInstruction(`Faites glisser « ${task.name} » par sa barre de titre ${ZONE_NAMES[task.zone]} : elle prendra un quart de l’écran.`);
            }
            screen.dataset.task = JSON.stringify(task);
        }

        function win() {
            locked = true;
            closeAssist();
            if (level.mode === 'quarter') placed.push(byName(task.name));
            game.setFeedback('Bravo !', 'good');
            game.success(nextRound, 1000);
        }

        // ---------- Double-clic sur la barre de titre ----------

        screen.addEventListener('dblclick', (e) => {
            const title = e.target.closest('.win-title');
            const el = e.target.closest('.win-window');
            if (locked || !el) return;
            if (!title) {
                game.setFeedback('Double-cliquez sur la barre du haut de la fenêtre, celle avec son nom.');
                return;
            }
            const target = byName(el.dataset.name);
            setMode(target, target.mode === 'normal' ? 'max' : 'normal');
            if (level.mode === 'toggle' && target.name === task.name && target.mode === task.zone) win();
        });

        // ---------- Glisser une fenêtre ----------

        function point(e) {
            const box = screen.getBoundingClientRect();
            return { x: e.clientX - box.left, y: e.clientY - box.top };
        }

        // Zone d'ancrage sous la flèche : coin, bord gauche ou droit, haut (plein écran)
        function zoneAt(p) {
            const left = p.x <= CORNER;
            const right = p.x >= W - CORNER;
            const top = p.y <= CORNER;
            const bottom = p.y >= H - CORNER && p.y <= H + 4;
            if (top && left) return 'tl';
            if (top && right) return 'tr';
            if (bottom && left) return 'bl';
            if (bottom && right) return 'br';
            if (p.x <= EDGE) return 'left';
            if (p.x >= W - EDGE) return 'right';
            if (p.y <= 4) return 'max';
            return null;
        }

        function showPreview(zone) {
            if (!zone) {
                if (preview) preview.remove();
                preview = null;
                return;
            }
            if (!preview) {
                preview = document.createElement('div');
                preview.className = 'win-preview';
                desktop.appendChild(preview);
            }
            const g = geometry(zone);
            Object.assign(preview.style, { left: g.x + 'px', top: g.y + 'px', width: g.w + 'px', height: g.h + 'px' });
        }

        screen.addEventListener('pointerdown', (e) => {
            const title = e.target.closest('.win-title');
            if (e.button !== 0 || locked || !title) return;
            e.preventDefault();
            const target = byName(title.closest('.win-window').dataset.name);
            front(target);
            closeAssist();
            const p = point(e);
            drag = { win: target, start: p, pointerId: e.pointerId, moved: false, dx: p.x - target.el.offsetLeft, dy: p.y - target.el.offsetTop };
        });

        screen.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const p = point(e);
            if (!drag.moved) {
                if (Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 4) return;
                drag.moved = true;
                // La souris n'est capturée qu'au début d'un vrai glisser, pour ne pas gêner le double-clic
                try {
                    screen.setPointerCapture(drag.pointerId);
                } catch (err) { /* pointeur déjà relâché */ }
                drag.win.el.classList.add('dragging');
                if (drag.win.mode !== 'normal') {
                    // Comme sous Windows : une fenêtre agrandie qu'on attrape reprend sa taille normale
                    const ratio = drag.dx / drag.win.el.offsetWidth;
                    drag.win.mode = 'normal';
                    drag.dx = NORMAL.w * ratio;
                    drag.dy = 14;
                    // Niveau 3 : une fenêtre déjà rangée qu'on reprend n'est plus rangée
                    if (placed.includes(drag.win)) placed.splice(placed.indexOf(drag.win), 1);
                }
            }
            drag.win.x = Math.min(W - 40, Math.max(-NORMAL.w + 40, p.x - drag.dx));
            drag.win.y = Math.min(H - 24, Math.max(0, p.y - drag.dy));
            apply(drag.win);
            showPreview(zoneAt(p));
        });

        function endDrag(e) {
            if (!drag) return;
            const current = drag;
            drag = null;
            current.win.el.classList.remove('dragging');
            showPreview(null);
            if (!current.moved || e.type !== 'pointerup') return;
            const zone = zoneAt(point(e));
            if (!zone) return;
            // Taille d'origine retrouvée plus tard (double-clic) : là où la fenêtre a été lâchée, dans l'écran
            current.win.saved = {
                x: Math.max(0, Math.min(W - NORMAL.w, current.win.x)),
                y: Math.max(0, Math.min(H - NORMAL.h, current.win.y))
            };
            current.win.mode = zone;
            apply(current.win);
            judgeSnap(current.win, zone);
            if (zone === 'left' || zone === 'right') openAssist(current.win, zone === 'left' ? 'right' : 'left');
        }
        screen.addEventListener('pointerup', endDrag);
        screen.addEventListener('pointercancel', endDrag);

        function judgeSnap(target, zone) {
            if (locked || level.mode === 'toggle') return;
            if (target.name !== task.name) {
                game.error();
                game.setFeedback(`Ce n’est pas la bonne fenêtre : il faut déplacer « ${task.name} ».`, 'bad');
                return;
            }
            if (zone !== task.zone) {
                game.error();
                game.setFeedback(`Pas là : il faut la placer ${ZONE_NAMES[task.zone]}. Attrapez-la de nouveau par sa barre de titre.`, 'bad');
                return;
            }
            if (level.mode === 'quarter') {
                win();
                return;
            }
            game.setFeedback(`Bien ! Maintenant, choisissez « ${task.assist} » dans les vignettes, pour l’autre moitié.`, 'good');
        }

        // ---------- Assistance d'ancrage : les autres fenêtres proposées pour l'autre moitié ----------

        function closeAssist() {
            if (assist) assist.remove();
            assist = null;
        }

        function openAssist(snapped, side) {
            closeAssist();
            const others = windows.filter((w) => w !== snapped);
            if (!others.length) return;
            assist = document.createElement('div');
            assist.className = 'win-assist';
            const g = geometry(side);
            Object.assign(assist.style, { left: g.x + 'px', top: g.y + 'px', width: g.w + 'px', height: g.h + 'px' });
            assist.innerHTML = others.map((w) => `<div class="win-thumb" data-name="${w.name}">${ICONS[w.icon]}<span>${w.name}</span></div>`).join('');
            desktop.appendChild(assist);
            assist.addEventListener('pointerdown', (e) => e.stopPropagation());
            assist.addEventListener('mousedown', (e) => {
                const thumb = e.target.closest('.win-thumb');
                if (e.button !== 0 || !thumb) {
                    if (!thumb) closeAssist();
                    return;
                }
                const chosen = byName(thumb.dataset.name);
                const expected = level.mode === 'half' && !locked && snapped.name === task.name && snapped.mode === task.zone;
                if (expected && chosen.name !== task.assist) {
                    game.error();
                    thumb.classList.add('error');
                    game.later(() => thumb.classList.remove('error'), 600);
                    game.setFeedback(`Ce n’est pas « ${chosen.name} » qu’il faut choisir.`, 'bad');
                    return;
                }
                setMode(chosen, side);
                front(chosen);
                closeAssist();
                if (expected) win();
            });
        }

        screen.addEventListener('contextmenu', (e) => e.preventDefault());
        nextRound();
    }

    MouseGame.register({
        id: 'fenetres', order: 55, title: 'Fenêtres', hint: 'drag', badge: 'Chef des fenêtres',
        text: 'Agrandissez et rangez les fenêtres, comme sous Windows.',
        levels: [
            { name: 'Double-clic sur la barre de titre : plein écran', rounds: 6, mode: 'toggle' },
            { name: 'Contre un bord : la moitié de l’écran', rounds: 4, mode: 'half' },
            { name: 'Dans un coin : un quart de l’écran', rounds: 4, mode: 'quarter' }
        ],
        start: startWindowsGame
    });
})();
