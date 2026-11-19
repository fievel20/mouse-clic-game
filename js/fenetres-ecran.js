// Petit écran façon Windows 11, partagé par les ateliers de fenêtres
// (boutons de fenêtre, barre des tâches, fenêtres, défi fenêtres).
//
// Chaque geste du joueur devient un « événement » { type, name, via, zone, side } :
//   minimize  (via 'button' ou 'taskbar')    réduire dans la barre des tâches
//   maximize  (via 'button', 'dblclick', 'snap')  plein écran
//   restore   (via 'button' ou 'dblclick')    retour à la taille d'origine
//   close     (via 'button')                  fermer
//   reopen    (via 'taskbar')                 faire réapparaître une fenêtre réduite
//   front     (via 'taskbar' ou 'click')      mettre une fenêtre au premier plan
//   snap      (zone : left, right, tl, tr, bl, br)  moitié ou quart d'écran
//   assist    (side)                          fenêtre choisie dans l'assistance d'ancrage
// Avant un geste, l'atelier peut le refuser (allow) ; après, il est prévenu (notify).
window.WindowsScreen = (() => {
    const W = 640;           // largeur de l'écran
    const H = 330;           // hauteur utile (sans la barre des tâches)
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

    const BUTTON_NAMES = {
        minimize: '« Réduire » (─)', maximize: '« Agrandir » (▢)', restore: '« Rétrécir » (❐)', close: '« Fermer » (✕)'
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

    // Un événement correspond-il à la tâche demandée ?
    function matches(event, task) {
        return Boolean(task) && event.type === task.type && event.name === task.name
            && (!task.via || task.via.includes(event.via))
            && (!task.zone || event.zone === task.zone)
            && (!task.side || event.side === task.side);
    }

    // options : { allow(event) → booléen, notify(event) }
    function create(game, options = {}) {
        const { ICONS } = game;
        const allow = options.allow || (() => true);
        const notify = options.notify || (() => {});

        const screen = document.createElement('div');
        screen.className = 'win-screen';
        screen.innerHTML = '<div class="win-desktop"></div><div class="win-taskbar"></div>';
        game.board.appendChild(screen);
        const desktop = screen.querySelector('.win-desktop');
        const taskbar = screen.querySelector('.win-taskbar');

        let windows = [];        // { name, icon, el, x, y, w, h, mode, minimized, saved }
        let zTop = 1;
        let drag = null;
        let preview = null;
        let assist = null;

        // ---------- Fenêtres ----------

        function apply(win) {
            const g = win.mode === 'normal' ? win : geometry(win.mode);
            Object.assign(win.el.style, { left: g.x + 'px', top: g.y + 'px', width: g.w + 'px', height: g.h + 'px' });
            win.el.classList.toggle('maximized', win.mode !== 'normal');
            win.el.classList.toggle('minimized', win.minimized);
            // Agrandir (▢) devient Rétrécir (❐) quand la fenêtre n'est plus à sa taille d'origine
            const max = win.el.querySelector('.win-btn.max');
            max.textContent = win.mode === 'normal' ? '▢' : '❐';
            max.title = win.mode === 'normal' ? 'Agrandir' : 'Rétrécir';
            renderTaskbar();
        }

        function front(win) {
            win.el.style.zIndex = ++zTop;
            renderTaskbar();
        }

        // Fenêtre visible au premier plan
        function frontmost() {
            return windows.filter((w) => !w.minimized).sort((a, b) => b.el.style.zIndex - a.el.style.zIndex)[0] || null;
        }

        function makeWindow(app, i) {
            const win = Object.assign({ mode: 'normal', minimized: false, x: 30 + i * 70, y: 20 + i * 30 }, NORMAL, app);
            win.el = document.createElement('div');
            win.el.className = 'win-window';
            win.el.dataset.name = win.name;
            win.el.innerHTML = `<div class="win-title">${ICONS[win.icon]}<span class="win-name">${win.name}</span>
                <span class="win-buttons">
                    <button class="win-btn min" title="Réduire">─</button><button class="win-btn max" title="Agrandir">▢</button><button class="win-btn close" title="Fermer">✕</button>
                </span></div>
                <div class="win-body"><div></div><div></div><div></div></div>`;
            desktop.appendChild(win.el);
            return win;
        }

        // Ouvre des fenêtres : names (noms d'applications) ; states : { nom: 'max' | 'min' }
        function open(names, states = {}) {
            closeAssist();
            desktop.innerHTML = '';
            windows = names.map((name, i) => makeWindow(APPS.find((a) => a.name === name), i));
            windows.forEach((win) => {
                if (states[win.name] === 'max') setMode(win, 'max');
                if (states[win.name] === 'min') win.minimized = true;
                apply(win);
                front(win);
            });
            return windows;
        }

        // Ajoute une fenêtre sans toucher aux autres
        function add(name) {
            const win = makeWindow(APPS.find((a) => a.name === name), windows.length);
            win.x = 40 + game.randomInt(W - NORMAL.w - 80);
            win.y = 10 + game.randomInt(H - NORMAL.h - 20);
            windows.push(win);
            apply(win);
            front(win);
            return win;
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

        function remove(win) {
            win.el.remove();
            windows = windows.filter((w) => w !== win);
            renderTaskbar();
        }

        // ---------- Barre des tâches : une icône par fenêtre ouverte ----------

        function renderTaskbar() {
            const top = frontmost();
            taskbar.innerHTML = windows.map((w) => `<button class="win-task${w === top ? ' active' : ''}${w.minimized ? ' minimized' : ''}"
                data-name="${w.name}" title="${w.name}">${ICONS[w.icon]}</button>`).join('');
        }

        taskbar.addEventListener('click', (e) => {
            const button = e.target.closest('.win-task');
            if (!button) return;
            closeAssist();
            const win = byName(button.dataset.name);
            // Comme sous Windows : icône d'une fenêtre réduite → elle revient ;
            // icône de la fenêtre au premier plan → elle se réduit ; sinon → elle passe au premier plan
            let event;
            if (win.minimized) event = { type: 'reopen', name: win.name, via: 'taskbar' };
            else if (win === frontmost()) event = { type: 'minimize', name: win.name, via: 'taskbar' };
            else event = { type: 'front', name: win.name, via: 'taskbar' };
            if (!allow(event)) return;
            if (event.type === 'reopen') {
                win.minimized = false;
                apply(win);
                front(win);
            } else if (event.type === 'minimize') {
                win.minimized = true;
                apply(win);
            } else {
                front(win);
            }
            notify(event);
        });

        // ---------- Boutons de la fenêtre ----------

        desktop.addEventListener('click', (e) => {
            const button = e.target.closest('.win-btn');
            if (!button) return;
            const win = byName(button.closest('.win-window').dataset.name);
            let event;
            if (button.classList.contains('min')) event = { type: 'minimize', name: win.name, via: 'button' };
            else if (button.classList.contains('close')) event = { type: 'close', name: win.name, via: 'button' };
            else event = { type: win.mode === 'normal' ? 'maximize' : 'restore', name: win.name, via: 'button' };
            if (!allow(event)) return;
            closeAssist();
            if (event.type === 'minimize') {
                win.minimized = true;
                apply(win);
            } else if (event.type === 'close') {
                remove(win);
            } else {
                setMode(win, event.type === 'maximize' ? 'max' : 'normal');
                front(win);
            }
            notify(event);
        });

        // ---------- Double-clic sur la barre de titre ----------

        desktop.addEventListener('dblclick', (e) => {
            const el = e.target.closest('.win-window');
            if (!el || e.target.closest('.win-btn')) return;
            if (!e.target.closest('.win-title')) {
                game.setFeedback('Double-cliquez sur la barre du haut de la fenêtre, celle avec son nom.');
                return;
            }
            const win = byName(el.dataset.name);
            const event = { type: win.mode === 'normal' ? 'maximize' : 'restore', name: win.name, via: 'dblclick' };
            if (!allow(event)) return;
            setMode(win, event.type === 'maximize' ? 'max' : 'normal');
            notify(event);
        });

        // ---------- Glisser une fenêtre par sa barre de titre ----------

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

        desktop.addEventListener('pointerdown', (e) => {
            const el = e.target.closest('.win-window');
            if (e.button !== 0 || !el || e.target.closest('.win-btn')) return;
            const win = byName(el.dataset.name);
            const wasFront = win === frontmost();
            front(win);
            closeAssist();
            if (!wasFront) notify({ type: 'front', name: win.name, via: 'click' });
            if (!e.target.closest('.win-title')) return;
            e.preventDefault();
            const p = point(e);
            drag = { win, start: p, pointerId: e.pointerId, moved: false, dx: p.x - win.el.offsetLeft, dy: p.y - win.el.offsetTop };
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
                    if (options.onUnsnap) options.onUnsnap(drag.win);
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
            // Taille d'origine retrouvée plus tard : là où la fenêtre a été lâchée, dans l'écran
            current.win.saved = {
                x: Math.max(0, Math.min(W - NORMAL.w, current.win.x)),
                y: Math.max(0, Math.min(H - NORMAL.h, current.win.y))
            };
            current.win.mode = zone;
            apply(current.win);
            notify(zone === 'max'
                ? { type: 'maximize', name: current.win.name, via: 'snap' }
                : { type: 'snap', name: current.win.name, zone });
            if ((zone === 'left' || zone === 'right') && byName(current.win.name)) {
                openAssist(current.win, zone === 'left' ? 'right' : 'left');
            }
        }
        screen.addEventListener('pointerup', endDrag);
        screen.addEventListener('pointercancel', endDrag);

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
                if (e.button !== 0) return;
                if (!thumb) {
                    closeAssist();
                    return;
                }
                const chosen = byName(thumb.dataset.name);
                const event = { type: 'assist', name: chosen.name, side };
                if (!allow(event)) {
                    thumb.classList.add('error');
                    game.later(() => thumb.classList.remove('error'), 600);
                    return;
                }
                chosen.minimized = false;
                setMode(chosen, side);
                front(chosen);
                closeAssist();
                notify(event);
            });
        }

        screen.addEventListener('contextmenu', (e) => e.preventDefault());

        return {
            screen,
            get windows() { return windows; },
            open,
            add,
            byName,
            setMode,
            front,
            frontmost,
            apply,
            closeAssist,
            // Tâche en cours, lisible par les tests automatiques
            setTask(task) {
                screen.dataset.task = JSON.stringify(task);
            }
        };
    }

    // Message d'erreur par défaut : dit ce qui ne va pas (mauvaise fenêtre, mauvais bouton, mauvais moyen)
    function defaultRefusal(event, task) {
        if (!task) return 'Pas maintenant.';
        if (event.name !== task.name) return `Ce n’est pas la bonne fenêtre : il s’agit de « ${task.name} ».`;
        if (event.type === task.type && task.via && !task.via.includes(event.via)) {
            if (task.via.includes('taskbar')) return 'Ici, passez par la barre des tâches, en bas de l’écran.';
            if (task.via.includes('button')) return 'Ici, utilisez les boutons en haut à droite de la fenêtre.';
            return 'Ici, double-cliquez sur la barre de titre.';
        }
        if (event.via === 'button') return `Ce n’est pas le bon bouton : vous avez cliqué sur ${BUTTON_NAMES[event.type]}.`;
        return 'Ce n’est pas ce qui est demandé.';
    }

    // Aide commune : juge les gestes par rapport à une tâche { type, name, via?, zone?, side?, then? }.
    // strict : types d'événements refusés (avec une erreur) s'ils ne correspondent pas à la tâche.
    // Une tâche peut avoir une suite (then) : par exemple ancrer une fenêtre, puis choisir l'autre moitié.
    function judge(game, { strict, refusal = defaultRefusal, onDone, onStep }) {
        let task = null;
        let locked = false;
        return {
            set(newTask) {
                task = newTask;
                locked = false;
            },
            get task() { return task; },
            allow(event) {
                if (locked) return false;
                if (matches(event, task) || !strict.includes(event.type)) return true;
                game.error();
                game.setFeedback(refusal(event, task), 'bad');
                return false;
            },
            notify(event) {
                if (locked || !matches(event, task)) return;
                if (task.then) {
                    task = task.then;
                    if (onStep) onStep(task);
                    return;
                }
                locked = true;
                onDone(event);
            }
        };
    }

    return { create, judge, matches, defaultRefusal, APPS, ZONE_NAMES, BUTTON_NAMES, W, H };
})();
