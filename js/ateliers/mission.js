// Mission finale « Ranger le bureau » : un petit bureau façon Windows, où les gestes appris
// servent à de vraies tâches (ouvrir, renommer, ranger, supprimer, sélectionner, lire).
// Chaque niveau est une mission : une liste de tâches à faire dans l'ordre.
// Une action qui ne correspond pas à la tâche en cours (supprimer, renommer, ranger) est refusée
// et compte une erreur ; ouvrir, fermer ou sélectionner ne sont jamais refusés.
(() => {
    const WIDTH = 620;
    const HEIGHT = 340;
    const ICON_W = 76;
    const ICON_H = 80;

    const LETTER = [
        'Chère Marie,',
        'Je t’écris depuis la mer, où il fait un temps magnifique. Le matin, je me promène sur la plage et je ramasse des coquillages pour les petits-enfants.',
        'L’après-midi, je lis sur la terrasse. J’ai enfin terminé le roman que tu m’avais prêté : quelle belle histoire ! Je te le rapporterai à mon retour.',
        'Hier, nous sommes allés au marché du port. Il y avait des poissons de toutes les couleurs et un marchand de glaces très bavard.',
        'Les soirées sont douces. Nous dînons dehors et nous regardons le soleil se coucher derrière le phare.',
        'J’ai pris beaucoup de photos avec ma tablette. Mon petit-fils m’a montré comment les envoyer par courriel : je t’en enverrai quelques-unes.',
        'Je rentre samedi prochain. Nous pourrions prendre un café ensemble dimanche, si tu es libre ?',
        'Je t’embrasse bien fort,',
        'Jeanne'
    ];

    // Les 3 missions. Pour chaque fichier : nom, type d'icône, position ; pour un dossier : son contenu.
    // Chaque tâche décrit l'action attendue (action) ; le robot des tests s'en sert aussi.
    const MISSIONS = [
        {
            items: [
                { name: 'Photos', kind: 'folder', x: 24, y: 20, contents: ['vacances.jpg', 'chat.jpg'] },
                { name: 'Nouveau dossier', kind: 'folder', x: 24, y: 150, contents: [] },
                { name: 'plage.jpg', icon: 'image', x: 190, y: 40 },
                { name: 'recette.txt', icon: 'file', x: 330, y: 60 },
                { name: 'brouillon.txt', icon: 'file', x: 250, y: 220 },
                { name: 'chanson.mp3', icon: 'music', x: 470, y: 200 }
            ],
            tasks: [
                { hint: 'double', text: 'Ouvrez le dossier « Photos » : double-cliquez dessus.', action: { type: 'open', name: 'Photos' } },
                { hint: 'left', text: 'Fermez la fenêtre : cliquez sur la croix ✕, en haut à droite de la fenêtre.', action: { type: 'close' } },
                { hint: 'right', text: 'Renommez « Nouveau dossier » en « Vacances » : clic droit dessus, puis « Renommer ».', action: { type: 'rename', name: 'Nouveau dossier', to: 'Vacances' } },
                { hint: 'drag', text: 'Rangez « plage.jpg » dans le dossier « Vacances » : faites-le glisser dessus.', action: { type: 'move', names: ['plage.jpg'], into: 'Vacances' } },
                { hint: 'right', text: 'Supprimez « brouillon.txt » : clic droit dessus, puis « Supprimer ».', action: { type: 'delete', name: 'brouillon.txt' } }
            ]
        },
        {
            items: [
                { name: 'Photos', kind: 'folder', x: 20, y: 20, contents: [] },
                { name: 'Factures', kind: 'folder', x: 20, y: 160, contents: [] },
                { name: 'photo.jpg', icon: 'image', x: 150, y: 30 },
                { name: 'vieux.txt', icon: 'file', x: 150, y: 150 },
                { name: 'chat.jpg', icon: 'image', x: 270, y: 240 },
                { name: 'recette.txt', icon: 'file', x: 260, y: 70 },
                { name: 'fleur.jpg', icon: 'image', x: 390, y: 240 },
                { name: 'facture-1.pdf', icon: 'file', x: 430, y: 20 },
                { name: 'facture-2.pdf', icon: 'file', x: 520, y: 20 },
                { name: 'facture-3.pdf', icon: 'file', x: 430, y: 110 },
                { name: 'facture-4.pdf', icon: 'file', x: 520, y: 110 }
            ],
            tasks: [
                { hint: 'ctrl', text: 'Sélectionnez « photo.jpg », « chat.jpg » et « fleur.jpg » : un clic sur la première, puis Ctrl + clic sur les autres.', action: { type: 'select', names: ['photo.jpg', 'chat.jpg', 'fleur.jpg'] } },
                { hint: 'drag', text: 'Faites glisser les 3 photos ensemble dans le dossier « Photos » : attrapez l’une d’elles, les autres suivent.', action: { type: 'move', names: ['photo.jpg', 'chat.jpg', 'fleur.jpg'], into: 'Photos' } },
                { hint: 'drag', text: 'Sélectionnez les 4 factures d’un coup : tracez un rectangle autour d’elles, en partant du vide.', action: { type: 'select', names: ['facture-1.pdf', 'facture-2.pdf', 'facture-3.pdf', 'facture-4.pdf'] } },
                { hint: 'drag', text: 'Faites glisser les 4 factures ensemble dans le dossier « Factures ».', action: { type: 'move', names: ['facture-1.pdf', 'facture-2.pdf', 'facture-3.pdf', 'facture-4.pdf'], into: 'Factures' } },
                { hint: 'right', text: 'Supprimez « vieux.txt » : clic droit dessus, puis « Supprimer ».', action: { type: 'delete', name: 'vieux.txt' } }
            ]
        },
        {
            items: [
                { name: 'Courrier', kind: 'folder', x: 24, y: 24, contents: ['facture-eau.pdf'] },
                { name: 'lettre.txt', icon: 'file', x: 150, y: 170 },
                { name: 'photo.jpg', icon: 'image', x: 24, y: 210 },
                { name: 'notes.txt', icon: 'file', x: 160, y: 30 }
            ],
            tasks: [
                { hint: 'double', text: 'Ouvrez la lettre « lettre.txt » : double-cliquez dessus.', action: { type: 'open', name: 'lettre.txt' } },
                { hint: 'wheel', text: 'Lisez la lettre jusqu’au bout : faites-la défiler avec la molette ou la barre de défilement.', action: { type: 'scroll-end' } },
                { hint: 'double', text: 'Sélectionnez la signature « Jeanne », tout en bas : double-cliquez sur le mot.', action: { type: 'textselect', text: 'Jeanne' } },
                { hint: 'left', text: 'Fermez la lettre : cliquez sur la croix ✕.', action: { type: 'close' } },
                { hint: 'drag', text: 'Rangez « lettre.txt » dans le dossier « Courrier ».', action: { type: 'move', names: ['lettre.txt'], into: 'Courrier' } }
            ]
        }
    ];

    // Actions qui modifient le bureau : refusées (avec une erreur) si ce n'est pas la tâche en cours
    const CHANGES = ['rename', 'delete', 'move'];

    const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
    const normalize = (text) => text.replace(/\s+/g, ' ').trim().replace(/[.,;:!?]+$/, '');

    function matches(event, action) {
        if (event.type !== action.type) return false;
        switch (event.type) {
            case 'open':
            case 'rename':
            case 'delete':
                return event.name === action.name;
            case 'move':
                return event.into === action.into && sameSet(event.names, action.names);
            case 'select':
                return sameSet(event.names, action.names);
            case 'textselect':
                return normalize(event.text).toLowerCase() === action.text.toLowerCase();
            default:
                return true;
        }
    }

    function startMission(game, level) {
        const { ICONS } = game;
        const mission = MISSIONS[level.mission];
        level.rounds = mission.tasks.length;

        const layout = document.createElement('div');
        layout.className = 'mi-layout';
        layout.innerHTML = `<ol class="mi-tasks">${mission.tasks.map((t) => `<li>${t.text.split(' : ')[0]}</li>`).join('')}</ol>
            <div class="mi-desk"></div>`;
        game.board.appendChild(layout);
        const taskItems = Array.from(layout.querySelectorAll('.mi-tasks li'));
        const desk = layout.querySelector('.mi-desk');

        const items = new Map();     // nom → { name, kind, icon, x, y, contents, el }
        let selected = [];
        let taskIndex = 0;
        let locked = false;
        let menu = null;
        let windowElement = null;
        let drag = null;
        let lasso = null;

        // ---------- Tâches ----------

        function task() {
            return mission.tasks[taskIndex];
        }

        function showTask() {
            taskItems.forEach((li, i) => {
                li.classList.toggle('done', i < taskIndex);
                li.classList.toggle('current', i === taskIndex);
            });
            desk.dataset.action = JSON.stringify(task().action);
            game.setHint(task().hint);
            game.setInstruction(task().text);
        }

        function nextTask() {
            taskIndex++;
            locked = false;
            showTask();
        }

        // Toute action passe par ici. Renvoie true si elle peut s'appliquer.
        function attempt(event) {
            if (locked) return false;
            const ok = matches(event, task().action);
            if (!ok && CHANGES.includes(event.type)) {
                game.error();
                game.setFeedback('Pas maintenant ! Ce n’est pas la tâche en cours.', 'bad');
                return false;
            }
            if (ok) {
                locked = true;
                taskItems[taskIndex].classList.add('done');
                game.setFeedback(taskIndex < mission.tasks.length - 1 ? 'Bravo ! Tâche suivante…' : 'Bravo, mission accomplie !', 'good');
                game.success(nextTask, 1000);
            }
            return true;
        }

        // ---------- Icônes ----------

        function iconHtml(item) {
            return (item.kind === 'folder' ? ICONS.folder : ICONS[item.icon]) + `<span class="label">${item.name}</span>`;
        }

        function place(item) {
            item.el.style.left = item.x + 'px';
            item.el.style.top = item.y + 'px';
        }

        mission.items.forEach((data) => {
            const item = Object.assign({ kind: 'file' }, data, { contents: (data.contents || []).slice() });
            item.el = document.createElement('div');
            item.el.className = 'mi-icon';
            item.el.dataset.name = item.name;
            item.el.dataset.kind = item.kind;
            item.el.innerHTML = iconHtml(item);
            place(item);
            desk.appendChild(item.el);
            items.set(item.name, item);
        });

        function setSelection(names) {
            selected = names;
            items.forEach((item) => item.el.classList.toggle('selected', selected.includes(item.name)));
        }

        function select(names) {
            setSelection(names);
            if (names.length) attempt({ type: 'select', names: names.slice() });
        }

        function iconAt(el) {
            const icon = el && el.closest('.mi-icon');
            return icon ? items.get(icon.dataset.name) : null;
        }

        function deskPoint(e) {
            const box = desk.getBoundingClientRect();
            return { x: e.clientX - box.left, y: e.clientY - box.top };
        }

        // ---------- Fenêtres ----------

        function closeWindow() {
            if (!windowElement) return;
            windowElement.remove();
            windowElement = null;
        }

        function openWindow(item) {
            closeWindow();
            windowElement = document.createElement('div');
            windowElement.className = 'mi-window';
            let body;
            if (item.kind === 'folder') {
                body = item.contents.length
                    ? `<div class="mi-folder">${item.contents.map((name) => `<div class="mi-row">${name.endsWith('.jpg') ? ICONS.image : ICONS.file}<span>${name}</span></div>`).join('')}</div>`
                    : '<div class="mi-folder mi-empty">Ce dossier est vide.</div>';
            } else {
                body = `<div class="mi-doc">${LETTER.map((p) => `<p>${p}</p>`).join('')}</div>`;
            }
            windowElement.innerHTML = `<div class="mi-titlebar"><span>${item.name}</span><button class="mi-close" title="Fermer">✕</button></div>${body}`;
            desk.appendChild(windowElement);
            windowElement.querySelector('.mi-close').addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                closeWindow();
                attempt({ type: 'close' });
            });
            // La fenêtre a ses propres gestes : rien ne passe au bureau en dessous
            windowElement.addEventListener('pointerdown', (e) => e.stopPropagation());
            windowElement.addEventListener('dblclick', (e) => e.stopPropagation());
            const doc = windowElement.querySelector('.mi-doc');
            if (doc) watchDocument(doc);
        }

        function watchDocument(doc) {
            let reachedEnd = false;
            doc.addEventListener('scroll', () => {
                if (reachedEnd || doc.scrollTop + doc.clientHeight < doc.scrollHeight - 4) return;
                reachedEnd = true;
                attempt({ type: 'scroll-end' });
            });
            // Comme dans l'atelier sélection de texte : on juge une fois la série de clics finie
            let judgeTimer = null;
            doc.addEventListener('mousedown', () => clearTimeout(judgeTimer));
            doc.addEventListener('mouseup', () => {
                clearTimeout(judgeTimer);
                judgeTimer = game.later(() => {
                    const text = window.getSelection() ? window.getSelection().toString() : '';
                    if (!normalize(text)) return;
                    if (!attempt({ type: 'textselect', text }) || task().action.type !== 'textselect') return;
                    if (!locked) game.setFeedback(`Vous avez sélectionné « ${normalize(text).slice(0, 40)} ». Ce n’est pas ce qui est demandé.`, 'bad');
                }, 450);
            });
        }

        // ---------- Menu du clic droit ----------

        function closeMenu() {
            if (menu) menu.remove();
            menu = null;
        }

        function openMenu(item, point) {
            closeMenu();
            menu = document.createElement('div');
            menu.className = 'context-menu interactive';
            menu.innerHTML = '<div data-action="open">Ouvrir</div><div data-action="rename">Renommer</div><div data-action="delete">Supprimer</div>';
            menu.style.left = Math.min(point.x, WIDTH - 160) + 'px';
            menu.style.top = Math.min(point.y, HEIGHT - 110) + 'px';
            desk.appendChild(menu);
            menu.addEventListener('pointerdown', (e) => e.stopPropagation());
            menu.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                const entry = e.target.closest('[data-action]');
                if (!entry || e.button !== 0) return;
                const action = entry.dataset.action;
                closeMenu();
                if (action === 'open') {
                    openWindow(item);
                    attempt({ type: 'open', name: item.name });
                } else if (action === 'rename') {
                    const wanted = task().action;
                    if (!attempt({ type: 'rename', name: item.name })) return;
                    // Le jeu tape le nouveau nom à la place du joueur
                    items.delete(item.name);
                    item.name = wanted.to;
                    item.el.dataset.name = item.name;
                    item.el.innerHTML = iconHtml(item);
                    items.set(item.name, item);
                } else if (action === 'delete') {
                    if (!attempt({ type: 'delete', name: item.name })) return;
                    item.el.remove();
                    items.delete(item.name);
                    setSelection([]);
                }
            });
        }

        // ---------- Gestes sur le bureau ----------

        desk.addEventListener('contextmenu', (e) => e.preventDefault());

        desk.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
            if (e.button !== 2) return;
            const item = iconAt(e.target);
            if (!item) {
                closeMenu();
                return;
            }
            setSelection([item.name]);
            openMenu(item, deskPoint(e));
        });

        desk.addEventListener('dblclick', (e) => {
            const item = iconAt(e.target);
            if (!item) return;
            openWindow(item);
            attempt({ type: 'open', name: item.name });
        });

        desk.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            closeMenu();
            const item = iconAt(e.target);
            const point = deskPoint(e);
            if (!item) {
                // Dans le vide : début d'un rectangle de sélection
                capture(e.pointerId);
                lasso = { start: point, el: document.createElement('div') };
                lasso.el.className = 'ms-lasso';
                desk.appendChild(lasso.el);
                return;
            }
            if (e.ctrlKey || e.metaKey) {
                select(selected.includes(item.name) ? selected.filter((n) => n !== item.name) : selected.concat(item.name));
                return;
            }
            if (!selected.includes(item.name)) select([item.name]);
            // Un appui sur un fichier sélectionné peut devenir un glisser : toute la sélection suit
            drag = {
                start: point,
                moved: false,
                pointerId: e.pointerId,
                items: selected.map((n) => items.get(n)).filter(Boolean)
            };
        });

        // On ne capture la souris qu'au début d'un vrai glisser : capturée dès l'appui,
        // le double-clic serait envoyé au bureau au lieu de l'icône, et le dossier ne s'ouvrirait pas
        function capture(pointerId) {
            try {
                desk.setPointerCapture(pointerId);
            } catch (err) { /* pointeur déjà relâché */ }
        }

        function folderUnder(e, excluded) {
            return document.elementsFromPoint(e.clientX, e.clientY)
                .map((el) => iconAt(el))
                .find((it) => it && it.kind === 'folder' && !excluded.includes(it));
        }

        function lassoRect(point) {
            return {
                x: Math.min(point.x, lasso.start.x),
                y: Math.min(point.y, lasso.start.y),
                w: Math.abs(point.x - lasso.start.x),
                h: Math.abs(point.y - lasso.start.y)
            };
        }

        function inRect(r) {
            return [...items.values()].filter((it) => it.x < r.x + r.w && r.x < it.x + ICON_W && it.y < r.y + r.h && r.y < it.y + ICON_H)
                .map((it) => it.name);
        }

        desk.addEventListener('pointermove', (e) => {
            const point = deskPoint(e);
            if (lasso) {
                const r = lassoRect(point);
                Object.assign(lasso.el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
                setSelection(inRect(r));
                return;
            }
            if (!drag) return;
            const dx = point.x - drag.start.x;
            const dy = point.y - drag.start.y;
            if (!drag.moved && Math.hypot(dx, dy) < 5) return;
            if (!drag.moved) capture(drag.pointerId);
            drag.moved = true;
            drag.items.forEach((it) => {
                it.el.classList.add('dragging');
                it.el.style.left = (it.x + dx) + 'px';
                it.el.style.top = (it.y + dy) + 'px';
            });
            const folder = folderUnder(e, drag.items);
            items.forEach((it) => it.el.classList.toggle('drop-hover', it === folder));
        });

        function endGesture(e) {
            if (lasso) {
                const r = lassoRect(deskPoint(e));
                lasso.el.remove();
                lasso = null;
                select(r.w < 5 && r.h < 5 ? [] : inRect(r));
                return;
            }
            if (!drag) return;
            const current = drag;
            drag = null;
            items.forEach((it) => it.el.classList.remove('drop-hover'));
            current.items.forEach((it) => it.el.classList.remove('dragging'));
            const folder = e.type === 'pointerup' && current.moved ? folderUnder(e, current.items) : null;
            const names = current.items.map((it) => it.name);
            if (folder && attempt({ type: 'move', names, into: folder.name })) {
                current.items.forEach((it) => {
                    folder.contents.push(it.name);
                    it.el.remove();
                    items.delete(it.name);
                });
                setSelection([]);
                return;
            }
            // Lâché à côté (ou refusé) : les fichiers reviennent à leur place
            current.items.forEach(place);
            if (current.moved && !folder) game.setFeedback('Les fichiers sont revenus à leur place : lâchez-les bien sur le dossier.', 'bad');
        }
        desk.addEventListener('pointerup', endGesture);
        desk.addEventListener('pointercancel', endGesture);

        game.onCleanup(() => {
            const selection = window.getSelection();
            if (selection) selection.removeAllRanges();
        });
        showTask();
    }

    MouseGame.register({
        id: 'mission', order: 95, title: 'Ranger le bureau', hint: 'all', badge: 'As du bureau',
        text: 'La mission finale : tous les gestes, pour de vrai.',
        levels: [
            { name: 'Mission 1 : premier rangement', rounds: 5, mission: 0 },
            { name: 'Mission 2 : le grand ménage', rounds: 5, mission: 1 },
            { name: 'Mission 3 : la lettre de Jeanne', rounds: 5, mission: 2 }
        ],
        start: startMission
    });
})();
