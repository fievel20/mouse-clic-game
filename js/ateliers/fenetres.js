// Ateliers Fenêtres et Défi fenêtres, sur le petit écran façon Windows 11 (js/fenetres-ecran.js).
// Fenêtres, niveau 1 : double-clic sur la barre de titre (ou bouton ▢ / ❐) : plein écran, taille d'origine.
// Fenêtres, niveau 2 : glisser contre un bord = moitié d'écran, puis choisir l'autre moitié (assistance d'ancrage).
// Fenêtres, niveau 3 : glisser dans un coin = quart d'écran.
// Défi fenêtres : les 3 boutons, la barre des tâches et le glisser-déposer de fenêtres, mélangés.
(() => {
    const { ZONE_NAMES } = WindowsScreen;
    const OTHER_SIDE = { left: 'right', right: 'left' };

    // Un ancrage (ou un plein écran par glisser) qui ne correspond pas à la tâche compte une erreur
    function isSnap(event) {
        return event.type === 'snap' || (event.type === 'maximize' && event.via === 'snap');
    }

    function startWindowsGame(game, level) {
        let ui = null;
        const placed = [];       // niveau 3 : fenêtres déjà rangées dans un coin
        const judge = WindowsScreen.judge(game, {
            // Ici, on garde les fenêtres ouvertes : les fermer est refusé
            strict: ['close', 'assist'],
            refusal: (event, task) => (event.type === 'close'
                ? 'Ici, on garde les fenêtres ouvertes : ne la fermez pas.'
                : WindowsScreen.defaultRefusal(event, task)),
            onStep: (task) => game.setFeedback(`Bien ! Maintenant, choisissez « ${task.name} » dans les vignettes, pour l’autre moitié.`, 'good'),
            onDone: () => {
                if (level.mode === 'quarter') placed.push(ui.byName(judge.task.name));
                game.setFeedback('Bravo !', 'good');
                game.success(nextRound, 1000);
            }
        });

        ui = WindowsScreen.create(game, {
            allow: judge.allow,
            notify(event) {
                const task = judge.task;
                if (isSnap(event) && task && task.type === 'snap' && !WindowsScreen.matches(event, task)) {
                    game.error();
                    game.setFeedback(event.name !== task.name
                        ? `Ce n’est pas la bonne fenêtre : il faut déplacer « ${task.name} ».`
                        : `Pas là : il faut la placer ${ZONE_NAMES[task.zone]}. Attrapez-la de nouveau par sa barre de titre.`, 'bad');
                    return;
                }
                judge.notify(event);
            },
            onUnsnap(win) {
                // Une fenêtre déjà rangée qu'on reprend n'est plus rangée
                if (placed.includes(win)) placed.splice(placed.indexOf(win), 1);
            }
        });

        function setTask(task, hint, text) {
            judge.set(task);
            ui.setTask(task);
            game.setHint(hint);
            game.setInstruction(text);
        }

        function nextRound() {
            ui.closeAssist();
            const r = game.round;
            if (level.mode === 'toggle') {
                const app = WindowsScreen.APPS[game.randomInt(WindowsScreen.APPS.length)].name;
                const [win] = ui.open([app]);
                win.x = 20 + game.randomInt(WindowsScreen.W - 310);
                win.y = 10 + game.randomInt(WindowsScreen.H - 190);
                // Une manche sur deux, la fenêtre est déjà en plein écran : il faut lui rendre sa taille
                if (r % 2 === 1) ui.setMode(win, 'max'); else ui.apply(win);
                const maximize = win.mode !== 'max';
                setTask({ type: maximize ? 'maximize' : 'restore', name: win.name, via: ['dblclick', 'button'] }, 'double', maximize
                    ? `Double-cliquez sur la barre de titre de « ${win.name} » pour l’afficher en plein écran.`
                    : `Double-cliquez sur la barre de titre de « ${win.name} » pour lui rendre sa taille d’origine.`);
            } else if (level.mode === 'half') {
                const [a, b] = game.shuffle(ui.open(['Documents', 'Photos', 'Musique']));
                const zone = game.randomInt(2) ? 'left' : 'right';
                setTask({ type: 'snap', name: a.name, zone, then: { type: 'assist', name: b.name, side: OTHER_SIDE[zone] } }, 'drag',
                    `Faites glisser « ${a.name} » par sa barre de titre ${ZONE_NAMES[zone]} de l’écran, puis choisissez « ${b.name} » pour l’autre moitié.`);
            } else {
                if (r === 0) {
                    ui.open(['Documents', 'Photos', 'Musique', 'Courrier']);
                    placed.length = 0;
                }
                const free = ui.windows.filter((w) => !placed.includes(w));
                const usedCorners = placed.map((w) => w.mode);
                const corners = ['tl', 'tr', 'bl', 'br'].filter((c) => !usedCorners.includes(c));
                const target = free[game.randomInt(free.length)];
                target.minimized = false;
                ui.apply(target);
                ui.front(target);
                const zone = corners[game.randomInt(corners.length)];
                setTask({ type: 'snap', name: target.name, zone }, 'drag',
                    `Faites glisser « ${target.name} » par sa barre de titre ${ZONE_NAMES[zone]} : elle prendra un quart de l’écran.`);
            }
        }

        nextRound();
    }

    // ---------- Défi fenêtres : tous les gestes mélangés ----------

    function startChallenge(game, level) {
        let ui = null;
        const judge = WindowsScreen.judge(game, {
            // Tout geste qui modifie une fenêtre doit être celui demandé ; passer une fenêtre devant reste libre
            strict: ['minimize', 'maximize', 'restore', 'close', 'reopen', 'assist'],
            onStep: (task) => game.setFeedback(`Bien ! Maintenant, choisissez « ${task.name} » dans les vignettes, pour l’autre moitié.`, 'good'),
            onDone: () => {
                game.setFeedback('Bravo !', 'good');
                game.success(nextRound, 900);
            }
        });
        ui = WindowsScreen.create(game, {
            allow: judge.allow,
            notify(event) {
                const task = judge.task;
                if (isSnap(event) && !WindowsScreen.matches(event, task)) {
                    game.error();
                    game.setFeedback(task.type === 'snap'
                        ? `Pas là : il faut placer « ${task.name} » ${ZONE_NAMES[task.zone]}.`
                        : 'Ce n’est pas ce qui est demandé : relisez la consigne.', 'bad');
                    return;
                }
                judge.notify(event);
            }
        });
        ui.open(level.mode === 'all' ? ['Documents', 'Photos', 'Musique', 'Courrier'] : ['Documents', 'Photos', 'Musique']);

        // Tâches possibles pour une fenêtre, selon son état et le niveau
        function choices(win) {
            if (win.minimized) return ['reopen'];
            const list = ['minimize', win.mode === 'normal' ? 'maximize' : 'restore'];
            if (ui.windows.length >= 3) list.push('close');
            if (win !== ui.frontmost()) list.push('front');
            if (level.mode !== 'buttons' && win.mode === 'normal' && ui.windows.length >= 2) list.push('half');
            if (level.mode === 'all' && win.mode === 'normal') list.push('quarter');
            return list;
        }

        function nextRound() {
            ui.closeAssist();
            // Toujours au moins 2 fenêtres ouvertes : on rouvre une application fermée si besoin
            if (ui.windows.length < 2) {
                const missing = WindowsScreen.APPS.find((a) => !ui.byName(a.name));
                ui.add(missing.name);
            }
            const win = ui.windows[game.randomInt(ui.windows.length)];
            const choice = game.shuffle(choices(win))[0];
            const name = win.name;
            if (choice === 'half') {
                const zone = game.randomInt(2) ? 'left' : 'right';
                const other = game.shuffle(ui.windows.filter((w) => w !== win))[0].name;
                judge.set({ type: 'snap', name, zone, then: { type: 'assist', name: other, side: OTHER_SIDE[zone] } });
                game.setHint('drag');
                game.setInstruction(`Placez « ${name} » sur la moitié ${zone === 'left' ? 'gauche' : 'droite'} de l’écran, puis « ${other} » sur l’autre moitié.`);
            } else if (choice === 'quarter') {
                const zone = ['tl', 'tr', 'bl', 'br'][game.randomInt(4)];
                judge.set({ type: 'snap', name, zone });
                game.setHint('drag');
                game.setInstruction(`Placez « ${name} » ${ZONE_NAMES[zone]} de l’écran.`);
            } else {
                const texts = {
                    minimize: `Réduisez « ${name} » dans la barre des tâches.`,
                    maximize: `Affichez « ${name} » en plein écran.`,
                    restore: `Rendez à « ${name} » sa taille d’origine.`,
                    close: `Fermez « ${name} ».`,
                    reopen: `Faites réapparaître « ${name} », réduite dans la barre des tâches.`,
                    front: `Mettez « ${name} » au premier plan.`
                };
                judge.set({ type: choice, name });
                game.setHint('left');
                game.setInstruction(texts[choice]);
            }
            ui.setTask(judge.task);
        }

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
    MouseGame.register({
        id: 'defi-fenetres', order: 57, title: 'Défi fenêtres', hint: 'all', badge: 'Maître des fenêtres',
        text: 'Boutons, barre des tâches et glisser-déposer mélangés.',
        levels: [
            { name: 'Les boutons et la barre des tâches', rounds: 8, mode: 'buttons' },
            { name: 'Avec les moitiés d’écran', rounds: 8, mode: 'halves' },
            { name: 'Tout mélangé, avec 4 fenêtres', rounds: 10, mode: 'all' }
        ],
        start: startChallenge
    });
})();
