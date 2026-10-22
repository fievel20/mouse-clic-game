// Atelier sélection de texte.
// Niveau 1 : sélectionner un mot en cliquant-glissant.
// Niveau 2 : sélectionner un groupe de mots en cliquant-glissant.
// Niveau 3 : les raccourcis, double-clic pour un mot et triple-clic pour un paragraphe.
(() => {
    const PAGES = [
        [
            'Le samedi matin, Marie se promène au marché du village. Elle achète des pommes rouges, du pain frais et un bouquet de fleurs pour sa voisine.',
            'L’après-midi, elle téléphone à son petit-fils. Il lui explique comment envoyer une photo avec son ordinateur portable.',
            'Le soir, Marie écrit une lettre à son amie Jeanne. Elle raconte sa journée et colle une jolie photo du jardin.'
        ],
        [
            'Ce matin, Paul prépare une soupe de légumes. Il coupe les carottes, les poireaux et trois grosses pommes de terre.',
            'Pendant la cuisson, il lit le journal dans son fauteuil. La météo annonce du soleil pour toute la semaine.',
            'À midi, ses enfants arrivent avec un gâteau au chocolat. Toute la famille mange ensemble dans la cuisine.'
        ]
    ];

    const LETTERS = /^[A-Za-zÀ-ÿ]+$/;
    // Attente après le dernier clic avant de juger la sélection (le temps d'un éventuel clic suivant)
    const MULTI_CLICK_MS = 450;

    // Texte sélectionné, sans espaces superflus ni ponctuation au bout
    function normalize(text) {
        return text.replace(/\s+/g, ' ').trim().replace(/[.,;:!?]+$/, '').trim();
    }

    function startSelectionGame(game, level) {
        const page = document.createElement('div');
        page.className = 'text-page';
        game.board.appendChild(page);

        let pageIndex = game.randomInt(PAGES.length);
        let wanted = '';         // texte à sélectionner
        let method = 'drag';     // drag, double ou triple
        let locked = false;

        function renderPage() {
            page.innerHTML = PAGES[pageIndex].map((p) => `<p>${p}</p>`).join('');
        }

        // Mots qui n'apparaissent qu'une fois sur la page (pour une consigne sans ambiguïté)
        function uniqueWords() {
            const words = PAGES[pageIndex].join(' ').split(/[\s,.;:!?]+/);
            const counts = {};
            words.forEach((w) => { counts[w.toLowerCase()] = (counts[w.toLowerCase()] || 0) + 1; });
            return words.filter((w) => w.length >= 4 && LETTERS.test(w) && counts[w.toLowerCase()] === 1);
        }

        // Groupe de 3 ou 4 mots qui se suivent, sans ponctuation au milieu, présent une seule fois
        function randomGroup() {
            const text = PAGES[pageIndex].join(' ');
            for (let tries = 0; tries < 100; tries++) {
                const words = PAGES[pageIndex][game.randomInt(PAGES[pageIndex].length)].split(' ');
                const size = 3 + game.randomInt(2);
                const start = game.randomInt(words.length - size);
                const group = words.slice(start, start + size);
                if (!group.every((w) => LETTERS.test(w))) continue;
                const candidate = group.join(' ');
                if (text.indexOf(candidate) === text.lastIndexOf(candidate)) return candidate;
            }
            return uniqueWords()[0];
        }

        function clearSelection() {
            const selection = window.getSelection();
            if (selection) selection.removeAllRanges();
        }

        function nextRound() {
            clearSelection();
            // Nouvelle page tous les 4 tours, pour varier le texte
            if (game.round > 0 && game.round % 4 === 0) pageIndex = (pageIndex + 1) % PAGES.length;
            renderPage();
            locked = false;
            if (level.mode === 'word') {
                method = 'drag';
                const words = uniqueWords();
                wanted = words[game.randomInt(words.length)];
                game.setHint('drag');
                game.setMessage(`Sélectionnez le mot « ${wanted} » : cliquez juste avant, gardez le bouton enfoncé et glissez jusqu’à la fin du mot.`);
            } else if (level.mode === 'group') {
                method = 'drag';
                wanted = randomGroup();
                game.setHint('drag');
                game.setMessage(`Sélectionnez « ${wanted} » en glissant du premier au dernier mot.`);
            } else if (game.randomInt(2) === 0) {
                method = 'double';
                const words = uniqueWords();
                wanted = words[game.randomInt(words.length)];
                game.setHint('double');
                game.setMessage(`Double-cliquez sur le mot « ${wanted} » : il se sélectionne d’un coup.`);
            } else {
                method = 'triple';
                const index = game.randomInt(PAGES[pageIndex].length);
                wanted = normalize(PAGES[pageIndex][index]);
                const position = ['premier', 'deuxième', 'troisième'][index];
                game.setHint('triple');
                game.setMessage(`Triple-cliquez dans le ${position} paragraphe pour le sélectionner en entier.`);
            }
        }

        // Nombre de clics rapides (1, 2 ou 3), lu à l'appui : au relâchement,
        // certains navigateurs ou pilotes ne le donnent pas toujours
        let pressedClicks = 1;
        let judgeTimer = null;
        page.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            pressedClicks = e.detail || 1;
            // Un nouveau clic arrive : la série n'est pas finie, on attend avant de juger
            clearTimeout(judgeTimer);
        });

        page.addEventListener('mouseup', (e) => {
            if (locked || e.button !== 0) return;
            const clicks = Math.max(e.detail || 1, pressedClicks);
            pressedClicks = 1;
            // On juge la sélection une fois la série de clics terminée :
            // sinon le 2e clic d'un triple-clic (qui sélectionne un mot) compterait comme une erreur
            clearTimeout(judgeTimer);
            judgeTimer = game.later(() => {
                if (locked) return;
                const selection = window.getSelection();
                if (!selection || !page.contains(selection.anchorNode)) return;
                const selected = normalize(selection.toString());
                if (!selected) {
                    if (method === 'drag') {
                        game.setMessage('Un simple clic ne sélectionne rien : gardez le bouton enfoncé en glissant.', 'bad');
                    }
                    return;
                }
                const matches = selected.toLowerCase() === wanted.toLowerCase();
                if (matches && method === 'drag' && clicks >= 2) {
                    game.setMessage('Bien vu, le double-clic sélectionne un mot ! Ici, entraînez-vous plutôt à glisser.');
                    clearSelection();
                    return;
                }
                if (matches && method === 'double' && clicks !== 2) {
                    game.setMessage('C’est bien sélectionné, mais essayez le double-clic : c’est plus rapide !');
                    clearSelection();
                    return;
                }
                if (matches && method === 'triple' && clicks < 3) {
                    game.setMessage('C’est bien sélectionné, mais essayez le triple-clic : trois clics rapides.');
                    clearSelection();
                    return;
                }
                if (matches) {
                    locked = true;
                    game.setMessage('Bravo, le texte est sélectionné !', 'good');
                    game.success(nextRound, 1200);
                    return;
                }
                game.error();
                const tooShort = wanted.toLowerCase().includes(selected.toLowerCase());
                game.setMessage(tooShort
                    ? `Il manque un bout : vous avez sélectionné « ${selected} ». Recommencez.`
                    : `Vous avez sélectionné « ${selected.length > 40 ? selected.slice(0, 40) + '…' : selected} ». Recommencez.`, 'bad');
            }, MULTI_CLICK_MS);
        });
        page.addEventListener('contextmenu', (e) => e.preventDefault());
        game.onCleanup(() => {
            clearTimeout(judgeTimer);
            clearSelection();
        });
        nextRound();
    }

    MouseGame.register({
        id: 'selection', order: 60, title: 'Sélection de texte', hint: 'drag', badge: 'As du surligneur',
        text: 'Cliquez-glissez sur le texte pour le sélectionner.',
        levels: [
            { name: 'Sélectionner un mot en glissant', rounds: 10, mode: 'word' },
            { name: 'Sélectionner un groupe de mots', rounds: 8, mode: 'group' },
            { name: 'Les raccourcis : double-clic et triple-clic', rounds: 8, mode: 'shortcuts' }
        ],
        start: startSelectionGame
    });
})();
