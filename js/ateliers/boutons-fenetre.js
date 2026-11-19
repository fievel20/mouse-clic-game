// Ateliers Boutons de fenêtre et Barre des tâches, sur le petit écran façon Windows 11 (js/fenetres-ecran.js).
// Boutons de fenêtre : Réduire (─), Agrandir (▢) / Rétrécir (❐), Fermer (✕).
// Barre des tâches : retrouver une fenêtre réduite, passer d'une fenêtre à l'autre.
(() => {
    const { BUTTON_NAMES } = WindowsScreen;
    const ALL_GESTURES = ['minimize', 'maximize', 'restore', 'close', 'reopen', 'front'];

    // Ce que fait chaque bouton, dit simplement (affiché après la réussite)
    const EFFECTS = {
        minimize: 'La fenêtre est réduite : elle attend dans la barre des tâches, en bas.',
        maximize: 'La fenêtre est en plein écran.',
        restore: 'La fenêtre a repris sa taille d’origine.',
        close: 'La fenêtre est fermée.'
    };

    // Consigne qui donne le but sans nommer le bouton (niveaux 2 et 3)
    const GOALS = {
        minimize: (name) => `Faites disparaître « ${name} » dans la barre des tâches, sans la fermer.`,
        maximize: (name) => `Affichez « ${name} » en plein écran, avec un de ses boutons.`,
        restore: (name) => `Rendez à « ${name} » sa taille d’origine, avec un de ses boutons.`,
        close: (name) => `Fermez « ${name} ».`
    };

    function randomApps(game, count) {
        return game.shuffle(WindowsScreen.APPS).slice(0, count).map((a) => a.name);
    }

    // ---------- Boutons de fenêtre ----------

    function startButtonsGame(game, level) {
        let ui = null;
        const judge = WindowsScreen.judge(game, {
            strict: ALL_GESTURES,
            onDone: (event) => {
                game.setFeedback(`Bravo ! ${EFFECTS[event.type]}`, 'good');
                game.success(nextRound, 1400);
            }
        });
        ui = WindowsScreen.create(game, { allow: judge.allow, notify: judge.notify });

        function nextRound() {
            const count = { named: 1, goal: 2, crowded: 4 }[level.mode];
            const names = randomApps(game, count);
            const target = names[game.randomInt(names.length)];
            // La fenêtre visée est parfois déjà en plein écran : il faudra alors « Rétrécir »
            const maximized = game.randomInt(3) === 0;
            ui.open(names, maximized ? { [target]: 'max' } : {});
            // Au niveau 3, la fenêtre reste à sa place dans la pile : il faut la repérer
            // (ses boutons restent visibles, les fenêtres étant décalées)
            if (level.mode !== 'crowded' || maximized) ui.front(ui.byName(target));
            const action = game.shuffle(['minimize', maximized ? 'restore' : 'maximize', 'close'])[0];
            judge.set({ type: action, name: target, via: ['button'] });
            ui.setTask(judge.task);
            game.setHint('left');
            game.setInstruction(level.mode === 'named'
                ? `Cliquez sur le bouton ${BUTTON_NAMES[action]}, en haut à droite de « ${target} ».`
                : GOALS[action](target));
        }

        nextRound();
    }

    // ---------- Barre des tâches ----------

    function startTaskbarGame(game, level) {
        let ui = null;
        const judge = WindowsScreen.judge(game, {
            strict: ALL_GESTURES,
            onDone: () => {
                game.setFeedback('Bravo !', 'good');
                game.success(nextRound, 1000);
            }
        });
        ui = WindowsScreen.create(game, {
            allow: judge.allow,
            notify(event) {
                const task = judge.task;
                // Cliquer sur la fenêtre la met aussi devant : c'est juste, mais ici on s'entraîne à la barre des tâches
                if (event.type === 'front' && event.via === 'click' && task && task.type === 'front' && event.name === task.name) {
                    game.setFeedback('Ça marche aussi en cliquant sur la fenêtre ! Ici, entraînez-vous avec la barre des tâches.');
                }
                judge.notify(event);
            }
        });

        function setTask(task, text) {
            judge.set(task);
            ui.setTask(task);
            game.setHint('left');
            game.setInstruction(text);
        }

        function nextRound() {
            const r = game.round;
            if (level.mode === 'reduce') {
                // Une seule fenêtre : on la réduit avec son bouton, puis on la retrouve dans la barre des tâches
                if (r === 0) ui.open(randomApps(game, 1));
                const win = ui.windows[0];
                if (!win.minimized) {
                    setTask({ type: 'minimize', name: win.name, via: ['button'] },
                        `Réduisez « ${win.name} » avec son bouton « Réduire » (─).`);
                } else {
                    setTask({ type: 'reopen', name: win.name, via: ['taskbar'] },
                        `Faites réapparaître « ${win.name} » : cliquez sur son icône dans la barre des tâches, en bas de l’écran.`);
                }
            } else if (level.mode === 'switch') {
                // La fenêtre visée est cachée : réduite, ou derrière une fenêtre en plein écran
                const names = randomApps(game, 3);
                const [target, cover] = game.shuffle(names);
                if (game.randomInt(2)) {
                    ui.open(names, { [target]: 'min' });
                    setTask({ type: 'reopen', name: target, via: ['taskbar'] },
                        `« ${target} » est réduite : faites-la réapparaître avec la barre des tâches.`);
                } else {
                    ui.open(names, { [cover]: 'max' });
                    ui.front(ui.byName(cover));
                    setTask({ type: 'front', name: target, via: ['taskbar'] },
                        `« ${target} » est cachée derrière « ${cover} » : mettez-la au premier plan avec la barre des tâches.`);
                }
            } else {
                // Cliquer sur l'icône de la fenêtre au premier plan la réduit ; un autre clic la fait revenir
                if (r === 0) ui.open(randomApps(game, 3));
                const top = ui.frontmost();
                const hidden = ui.windows.filter((w) => w.minimized);
                if (top && (r % 2 === 0 || !hidden.length)) {
                    setTask({ type: 'minimize', name: top.name, via: ['taskbar'] },
                        `« ${top.name} » est au premier plan : réduisez-la en cliquant sur son icône dans la barre des tâches.`);
                } else {
                    const win = hidden[game.randomInt(hidden.length)];
                    setTask({ type: 'reopen', name: win.name, via: ['taskbar'] },
                        `Faites réapparaître « ${win.name} » avec son icône dans la barre des tâches.`);
                }
            }
        }

        nextRound();
    }

    MouseGame.register({
        id: 'boutons-fenetre', order: 52, title: 'Boutons de fenêtre', hint: 'left', badge: 'Pro des boutons',
        text: 'Réduire, agrandir, rétrécir et fermer une fenêtre.',
        levels: [
            { name: 'Les trois boutons, avec leur nom', rounds: 8, mode: 'named' },
            { name: 'Choisir le bon bouton selon le but', rounds: 8, mode: 'goal' },
            { name: 'Plusieurs fenêtres : la bonne et le bon bouton', rounds: 8, mode: 'crowded' }
        ],
        start: startButtonsGame
    });
    MouseGame.register({
        id: 'barre-taches', order: 53, title: 'Barre des tâches', hint: 'left', badge: 'As de la barre des tâches',
        text: 'Retrouvez les fenêtres réduites ou cachées.',
        levels: [
            { name: 'Réduire, puis rouvrir avec la barre des tâches', rounds: 8, mode: 'reduce' },
            { name: 'Retrouver une fenêtre cachée', rounds: 8, mode: 'switch' },
            { name: 'Réduire et rouvrir avec les icônes', rounds: 8, mode: 'icons' }
        ],
        start: startTaskbarGame
    });
})();
