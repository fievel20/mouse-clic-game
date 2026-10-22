// Noyau du jeu : menu, niveaux, déroulement d'une partie, score, étoiles.
// Chaque atelier (js/ateliers/*.js) s'enregistre avec MouseGame.register().
window.MouseGame = (() => {
    const menu = document.getElementById('menu');
    const cards = document.getElementById('cards');
    const game = document.getElementById('game');
    const board = document.getElementById('board');
    const gameTitle = document.getElementById('gameTitle');
    const levelText = document.getElementById('levelText');
    const mouseHint = document.getElementById('mouseHint');
    const messageElement = document.getElementById('message');
    const scoreElement = document.getElementById('score');
    const errorsElement = document.getElementById('errors');
    const timerElement = document.getElementById('timer');
    const skipMiddleButton = document.getElementById('skipMiddle');
    const resultModal = document.getElementById('resultModal');
    const resultMessageElement = document.getElementById('resultMessage');
    const resultDetailElement = document.getElementById('resultDetail');
    const nextLevelButton = document.getElementById('nextLevelButton');

    // index.html?test : les pauses entre manches sont accélérées pour les tests automatiques,
    // et la progression est enregistrée à part pour ne pas toucher aux vraies étoiles
    const isTest = new URLSearchParams(location.search).has('test');
    const speed = isTest ? 0.02 : 1;

    const STARS_KEY = (isTest ? 'test.' : '') + 'mouseClicGame.stars';
    const SETTINGS_KEY = (isTest ? 'test.' : '') + 'mouseClicGame.settings';
    const STARS_TO_UNLOCK = 2;

    // Icônes au trait, dans le style de file-icon.png / folder-icon.png
    const ICONS = {
        file: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M8 9h4M8 13h8M8 17h8"/></svg>',
        folder: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
        folderOpen: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round"><path d="M3 18V6a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v2"/><path d="M3 18l3-7a2 2 0 0 1 1.8-1H21a1 1 0 0 1 .9 1.4L19 18a2 2 0 0 1-1.8 1H5a2 2 0 0 1-2-1z"/></svg>',
        image: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M3 18l5-5 4 4 3-3 6 6"/></svg>',
        music: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>'
    };

    // Noms de fichiers et de dossiers pour les niveaux où il faut lire
    const FILES = [
        ['lettre.txt', 'file'], ['photo.jpg', 'image'], ['facture.pdf', 'file'], ['recette.txt', 'file'],
        ['vacances.jpg', 'image'], ['chanson.mp3', 'music'], ['budget.xls', 'file'], ['cv.doc', 'file'],
        ['plage.jpg', 'image'], ['radio.mp3', 'music'], ['notes.txt', 'file'], ['chat.jpg', 'image']
    ].map(([name, icon]) => ({ name, icon }));
    const FOLDERS = ['Photos', 'Documents', 'Musique', 'Factures', 'Recettes', 'Vacances', 'Travail', 'Famille'];

    const activities = [];
    let current = null;     // atelier en cours
    let level = null;        // niveau en cours : { number, name, rounds, ... }
    let round = 0;           // réussites
    let errors = 0;
    let startTime = 0;
    let timerInterval = null;
    let runId = 0;           // invalide les minuteries d'une partie abandonnée
    let cleanups = [];       // nettoyages propres à l'atelier en cours

    // ---------- Outils ----------

    function later(fn, ms) {
        const id = runId;
        return setTimeout(() => { if (id === runId) fn(); }, ms * speed);
    }

    function randomInt(max) {
        return Math.floor(Math.random() * max);
    }

    function shuffle(list) {
        const copy = list.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = randomInt(i + 1);
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function readJson(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || {};
        } catch (e) {
            return {};
        }
    }

    function writeJson(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) { /* stockage indisponible : on continue sans sauvegarder */ }
    }

    // Étoiles par niveau, sous la clé "atelier.niveau"
    function getStars(id, number) {
        const all = readJson(STARS_KEY);
        // Ancien format (avant les niveaux) : une note par atelier, comptée pour le niveau 1
        if (number === 1 && all[`${id}.1`] === undefined) return all[id] || 0;
        return all[`${id}.${number}`] || 0;
    }

    function saveStars(id, number, stars) {
        if (getStars(id, number) >= stars) return;
        const all = readJson(STARS_KEY);
        all[`${id}.${number}`] = stars;
        writeJson(STARS_KEY, all);
    }

    function isUnlocked(activity, number) {
        return number === 1 || getStars(activity.id, number - 1) >= STARS_TO_UNLOCK;
    }

    // Niveau proposé : le premier débloqué qui n'a pas encore 3 étoiles
    function recommendedLevel(activity) {
        let best = 1;
        for (let n = 1; n <= activity.levels.length; n++) {
            if (!isUnlocked(activity, n)) break;
            best = n;
            if (getStars(activity.id, n) < 3) break;
        }
        return best;
    }

    function getSetting(name) {
        return readJson(SETTINGS_KEY)[name];
    }

    function setSetting(name, value) {
        const all = readJson(SETTINGS_KEY);
        all[name] = value;
        writeJson(SETTINGS_KEY, all);
    }

    // Dessin de souris, avec la partie à utiliser en vert.
    // active : left, right, middle, wheel-up, wheel-down, wheel, drag, double, all
    function mouseSvg(active) {
        const on = (part) => (active === part || active === 'all'
            || (part === 'middle' && active.startsWith('wheel'))
            || (part === 'left' && (active === 'drag' || active === 'double'))) ? ' active' : '';
        let arrow = '';
        if (active === 'wheel-up') arrow = '<path class="arrow" d="M80 6 L90 22 H70 Z"/>';
        if (active === 'wheel-down') arrow = '<path class="arrow" d="M80 34 L90 18 H70 Z"/>';
        if (active === 'wheel') arrow = '<path class="arrow" d="M80 2 L88 14 H72 Z M80 38 L88 26 H72 Z"/>';
        if (active === 'drag') arrow = '<path class="arrow" d="M72 44 H80 V36 L90 50 L80 64 V56 H72 Z"/>';
        if (active === 'double') arrow = '<text class="arrow-text" x="80" y="26" text-anchor="middle">×2</text>';
        const viewBox = arrow ? '12 0 80 84' : '12 0 60 84';
        return `<svg class="mouse-svg" viewBox="${viewBox}" style="width:${arrow ? 80 : 60}px">
            <path class="part" d="M15 36 V54 A27 27 0 0 0 69 54 V36 Z"/>
            <path class="part${on('left')}" d="M15 36 V30 A27 27 0 0 1 42 3 V36 Z"/>
            <path class="part${on('right')}" d="M69 36 V30 A27 27 0 0 0 42 3 V36 Z"/>
            <rect class="part${on('middle')}" x="37" y="10" width="10" height="20" rx="5"/>${arrow}
        </svg>`;
    }

    function starsText(count) {
        return '★'.repeat(count) + '☆'.repeat(3 - count);
    }

    function setHint(part) {
        mouseHint.innerHTML = mouseSvg(part);
    }

    function setMessage(text, kind) {
        messageElement.textContent = text;
        messageElement.className = 'message' + (kind ? ' ' + kind : '');
    }

    function updateStats() {
        scoreElement.textContent = `Réussites : ${round} / ${level.rounds}`;
        errorsElement.textContent = `Erreurs : ${errors}`;
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // ---------- Menu ----------

    function renderMenu() {
        const noMiddle = getSetting('noMiddle');
        cards.innerHTML = '';
        activities.forEach((activity) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            const recommended = recommendedLevel(activity);
            const skipped = activity.id === 'central' && noMiddle && !getStars(activity.id, 1);
            const levelButtons = activity.levels.map((_, i) => {
                const n = i + 1;
                if (!isUnlocked(activity, n)) {
                    return `<button class="level" disabled title="Gagnez ★★ au niveau ${n - 1} pour débloquer">🔒<span>Niv. ${n}</span></button>`;
                }
                const count = getStars(activity.id, n);
                return `<button class="level${n === recommended ? ' current' : ''}" data-level="${n}">
                    <span>Niv. ${n}</span><span class="stars">${count ? starsText(count).replace(/★/g, '<b>★</b>') : '☆☆☆'}</span></button>`;
            }).join('');
            card.innerHTML = `${mouseSvg(activity.hint)}
                <span class="card-title">${activity.title}</span>
                <span class="card-text">${skipped ? 'Atelier passé : pas de bouton central.' : activity.text}</span>
                <span class="levels">${levelButtons}</span>`;
            if (skipped) card.classList.add('skipped');
            card.addEventListener('click', (e) => {
                const button = e.target.closest('.level');
                if (button && button.disabled) return;
                startActivity(activity, button ? Number(button.dataset.level) : recommended);
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target === card) startActivity(activity, recommended);
            });
            cards.appendChild(card);
        });
    }

    function showMenu() {
        stopActivity();
        resultModal.style.display = 'none';
        game.classList.add('hidden');
        menu.classList.remove('hidden');
        renderMenu();
    }

    // ---------- Déroulement d'une partie ----------

    function startActivity(activity, number = 1) {
        stopActivity();
        current = activity;
        level = Object.assign({ number }, activity.levels[number - 1]);
        round = 0;
        errors = 0;
        resultModal.style.display = 'none';
        menu.classList.add('hidden');
        game.classList.remove('hidden');
        gameTitle.textContent = `${activity.title} · Niveau ${number}`;
        levelText.textContent = level.name;
        const middleAlreadySkipped = activity.id !== 'central' && getSetting('noMiddle');
        skipMiddleButton.classList.toggle('hidden', !activity.usesMiddle || middleAlreadySkipped);
        board.innerHTML = '';
        updateStats();
        startTime = Date.now();
        timerElement.textContent = 'Temps : 00:00';
        timerInterval = setInterval(() => {
            timerElement.textContent = 'Temps : ' + formatTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        activity.start(api, level);
    }

    function stopActivity() {
        runId++;
        clearInterval(timerInterval);
        cleanups.forEach((fn) => fn());
        cleanups = [];
    }

    function success(next, delay = 700) {
        round++;
        updateStats();
        later(round >= level.rounds ? endActivity : next, delay);
    }

    function error() {
        errors++;
        updateStats();
    }

    function endActivity() {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        stopActivity();
        const stars = errors <= 1 ? 3 : errors <= 4 ? 2 : 1;
        const hasNext = level.number < current.levels.length;
        const wasLocked = hasNext && !isUnlocked(current, level.number + 1);
        saveStars(current.id, level.number, stars);
        if (current.id === 'central') setSetting('noMiddle', false);
        const nextOpen = hasNext && isUnlocked(current, level.number + 1);

        if (stars === 3) {
            resultMessageElement.innerHTML = `🤩 Bravo ! 🤩<br>${starsText(3)}`;
        } else if (stars === 2) {
            resultMessageElement.innerHTML = `👍 Très bien ! 👍<br>${starsText(2)}`;
        } else {
            resultMessageElement.innerHTML = `😌 Bon début ! 😌<br>${starsText(1)}`;
        }
        let detail = `${level.rounds} réussites en ${formatTime(seconds)}, avec ${errors} erreur${errors > 1 ? 's' : ''}.`;
        if (wasLocked && nextOpen) {
            detail += `<br><strong>🔓 Niveau ${level.number + 1} débloqué !</strong>`;
        } else if (hasNext && !nextOpen) {
            detail += `<br>Gagnez ★★ pour débloquer le niveau ${level.number + 1}.`;
        } else if (stars < 3) {
            detail += '<br>Rejouez pour gagner plus d’étoiles.';
        }
        resultDetailElement.innerHTML = detail;
        nextLevelButton.classList.toggle('hidden', !nextOpen);
        resultModal.style.display = 'block';
    }

    // Ce que chaque atelier reçoit dans start(api, level)
    const api = {
        ICONS,
        FILES,
        FOLDERS,
        board,
        later,
        randomInt,
        shuffle,
        setHint,
        setMessage,
        success,
        error,
        getSetting,
        get round() { return round; },
        onCleanup(fn) { cleanups.push(fn); }
    };

    // ---------- Boutons ----------

    document.getElementById('backButton').addEventListener('click', showMenu);
    document.getElementById('menuButton').addEventListener('click', showMenu);
    document.getElementById('replayButton').addEventListener('click', () => startActivity(current, level.number));
    nextLevelButton.addEventListener('click', () => startActivity(current, level.number + 1));
    skipMiddleButton.addEventListener('click', () => {
        setSetting('noMiddle', true);
        // Le grand défi continue sans le bouton central ; l'atelier central est passé
        if (current.id === 'central') {
            showMenu();
        } else {
            startActivity(current, level.number);
        }
    });
    document.getElementById('resetProgress').addEventListener('click', () => {
        if (!confirm('Effacer toutes les étoiles gagnées ?')) return;
        try {
            localStorage.removeItem(STARS_KEY);
            localStorage.removeItem(SETTINGS_KEY);
        } catch (e) { /* rien à effacer */ }
        renderMenu();
    });

    return {
        isTest,
        activities,
        startActivity,
        showMenu,
        resetProgress() {
            try {
                localStorage.removeItem(STARS_KEY);
                localStorage.removeItem(SETTINGS_KEY);
            } catch (e) { /* rien à effacer */ }
        },
        // activity : { id, order, title, text, hint, usesMiddle?, levels: [{ name, rounds, ... }], start(api, level) }
        register(activity) {
            activities.push(activity);
            activities.sort((a, b) => a.order - b.order);
        },
        start() {
            renderMenu();
        }
    };
})();
