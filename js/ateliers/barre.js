// Atelier barre de défilement : une liste avec une barre façon Windows
// (ascenseur, flèches ▲ ▼ et piste). La molette est désactivée ici, pour s'entraîner à la barre.
// Niveau 1 : faire glisser l'ascenseur. Niveau 2 : les flèches, ligne par ligne.
// Niveau 3 : tous les outils, dans une longue liste triée.
(() => {
    const ROW = 40;          // hauteur d'une ligne
    const VIEW = 320;        // hauteur visible : 8 lignes
    const ARROW = 22;        // hauteur d'une flèche
    const TRACK = VIEW - 2 * ARROW;

    const BASES = ['anniversaire', 'assurance', 'banque', 'budget', 'chanson', 'courses', 'cv', 'ecole', 'facture', 'impots',
        'jardin', 'lettre', 'medecin', 'mutuelle', 'notes', 'photo', 'plage', 'recette', 'vacances', 'voiture'];
    const YEARS = ['2021', '2022', '2023', '2024', '2025', '2026'];

    const REFUSALS = {
        thumb: 'Au niveau 1, attrapez l’ascenseur (la barre grise) et faites-le glisser.',
        arrows: 'Au niveau 2, cliquez sur les flèches ▲ ▼ pour avancer ligne par ligne.'
    };

    function startScrollbarGame(game, level) {
        const { ICONS } = game;
        const view = document.createElement('div');
        view.className = 'sb-view';
        view.innerHTML = `<div class="sb-content"><div class="sb-inner"></div></div>
            <div class="sb-bar">
                <div class="sb-arrow up" title="Flèche du haut">▲</div>
                <div class="sb-track"><div class="sb-thumb" title="Ascenseur"></div></div>
                <div class="sb-arrow down" title="Flèche du bas">▼</div>
            </div>`;
        game.board.appendChild(view);
        const inner = view.querySelector('.sb-inner');
        const track = view.querySelector('.sb-track');
        const thumb = view.querySelector('.sb-thumb');

        let items;
        if (level.named) {
            const names = [];
            BASES.forEach((base) => YEARS.forEach((year) => names.push(`${base}-${year}.txt`)));
            items = names.sort();
        } else {
            items = Array.from({ length: level.count }, (_, i) => `Document ${i + 1}`);
        }
        inner.innerHTML = items.map((name, i) => `<div class="sb-row" data-index="${i}">${ICONS.file}<span>${name}</span></div>`).join('');
        const rows = Array.from(inner.children);
        const max = items.length * ROW - VIEW;
        const thumbHeight = Math.max(30, TRACK * VIEW / (items.length * ROW));
        thumb.style.height = thumbHeight + 'px';

        let scroll = 0;
        let wanted = -1;
        let locked = false;

        function setScroll(value) {
            scroll = Math.min(max, Math.max(0, value));
            inner.style.transform = `translateY(${-scroll}px)`;
            thumb.style.top = (scroll / max * (TRACK - thumbHeight)) + 'px';
            view.dataset.scroll = scroll;
        }

        function allowed(tool) {
            return !level.tools || level.tools.includes(tool);
        }

        function refuse() {
            game.setFeedback(REFUSALS[level.tools[0]]);
        }

        function firstVisible() {
            return Math.floor(scroll / ROW);
        }

        function isVisible(index) {
            return index * ROW >= scroll - 1 && (index + 1) * ROW <= scroll + VIEW + 1;
        }

        function nextRound() {
            rows.forEach((row, i) => {
                row.className = 'sb-row';
                if (!level.named) row.innerHTML = `${ICONS.file}<span>${items[i]}</span>`;
            });
            let candidates;
            if (level.near) {
                // Juste à côté de la partie visible : quelques clics sur les flèches suffisent
                const last = firstVisible() + VIEW / ROW - 1;
                candidates = [1, 2, 3, 4].map((d) => last + d).filter((i) => i < items.length);
                if (!candidates.length) candidates = [1, 2, 3, 4].map((d) => firstVisible() - d).filter((i) => i >= 0);
            } else {
                candidates = items.map((_, i) => i).filter((i) => !isVisible(i) && Math.abs(i - wanted) > 8);
            }
            wanted = candidates[game.randomInt(candidates.length)];
            if (!level.named) rows[wanted].innerHTML = `${ICONS.folder}<span>Mon dossier</span>`;
            const below = wanted * ROW > scroll;
            locked = false;
            game.setHint(level.tools && level.tools[0] === 'arrows' ? 'left' : 'drag');
            if (level.named) {
                game.setInstruction(`Trouvez « ${items[wanted]} » avec la barre de défilement, puis cliquez dessus.`);
            } else if (level.near) {
                game.setInstruction(`Le dossier est juste ${below ? 'en dessous : cliquez sur la flèche ▼' : 'au-dessus : cliquez sur la flèche ▲'} jusqu’à le voir, puis cliquez dessus.`);
            } else {
                game.setInstruction(`Un dossier est caché plus ${below ? 'bas : faites glisser l’ascenseur vers le bas' : 'haut : faites glisser l’ascenseur vers le haut'}, puis cliquez sur le dossier.`);
            }
        }

        // ---------- Ascenseur ----------
        let drag = null;
        thumb.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            if (!allowed('thumb')) {
                refuse();
                return;
            }
            drag = { y: e.clientY, scroll };
            try {
                thumb.setPointerCapture(e.pointerId);
            } catch (err) { /* pointeur déjà relâché */ }
            thumb.classList.add('dragging');
        });
        thumb.addEventListener('pointermove', (e) => {
            if (!drag) return;
            setScroll(drag.scroll + (e.clientY - drag.y) * max / (TRACK - thumbHeight));
        });
        const endDrag = () => {
            drag = null;
            thumb.classList.remove('dragging');
        };
        thumb.addEventListener('pointerup', endDrag);
        thumb.addEventListener('pointercancel', endDrag);

        // ---------- Flèches ----------
        view.querySelectorAll('.sb-arrow').forEach((arrow) => {
            arrow.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                if (!allowed('arrows')) {
                    refuse();
                    return;
                }
                arrow.classList.add('pressed');
                game.later(() => arrow.classList.remove('pressed'), 150);
                setScroll(scroll + (arrow.classList.contains('down') ? ROW : -ROW));
            });
        });

        // ---------- Piste : une page entière d'un coup ----------
        track.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || e.target !== track) return;
            e.preventDefault();
            if (!allowed('track')) {
                refuse();
                return;
            }
            const below = e.clientY > thumb.getBoundingClientRect().top;
            setScroll(scroll + (below ? 1 : -1) * (VIEW - ROW));
        });

        // ---------- Lignes ----------
        inner.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
            const row = e.target.closest('.sb-row');
            if (!row || locked || e.button !== 0) return;
            if (Number(row.dataset.index) === wanted) {
                locked = true;
                row.classList.add('success');
                game.setFeedback('Bravo, vous l’avez trouvé !', 'good');
                game.success(nextRound, 900);
            } else {
                game.error();
                row.classList.add('error');
                game.later(() => row.classList.remove('error'), 600);
                game.setFeedback(level.named
                    ? `Celui-ci s’appelle « ${items[Number(row.dataset.index)]} ». Lisez bien le nom.`
                    : 'Ce n’est pas le dossier. Continuez à faire défiler avec la barre.', 'bad');
            }
        });

        // La molette ferait défiler sans la barre : ici, on la désactive
        const onWheel = (e) => {
            e.preventDefault();
            game.setFeedback('Ici, pas de molette : servez-vous de la barre de défilement, à droite de la liste.');
        };
        view.addEventListener('wheel', onWheel, { passive: false });
        view.addEventListener('contextmenu', (e) => e.preventDefault());

        setScroll(0);
        nextRound();
    }

    MouseGame.register({
        id: 'barre', order: 45, title: 'Barre de défilement', hint: 'drag', badge: 'Pilote de l’ascenseur',
        text: 'Faites glisser la barre sur le côté pour voir la suite.',
        levels: [
            { name: 'Faire glisser l’ascenseur', rounds: 6, count: 40, tools: ['thumb'] },
            { name: 'Les flèches, ligne par ligne', rounds: 6, count: 40, tools: ['arrows'], near: true },
            { name: 'Ascenseur, flèches et piste : trouver un fichier par son nom', rounds: 6, named: true }
        ],
        start: startScrollbarGame
    });
})();
