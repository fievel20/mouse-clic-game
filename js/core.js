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
    const instructionElement = document.getElementById('instruction');
    const feedbackElement = document.getElementById('feedback');
    const scoreElement = document.getElementById('score');
    const errorsElement = document.getElementById('errors');
    const timerElement = document.getElementById('timer');
    const skipMiddleButton = document.getElementById('skipMiddle');
    const resultModal = document.getElementById('resultModal');
    const resultMessageElement = document.getElementById('resultMessage');
    const resultDetailElement = document.getElementById('resultDetail');
    const nextLevelButton = document.getElementById('nextLevelButton');
    const nextActivityButton = document.getElementById('nextActivityButton');
    const badgesElement = document.getElementById('badges');

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
    let freeMode = null;     // en mode libre : { total, streak } (réussites, série sans erreur)

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

    // ---------- Chemin de progression et badges ----------

    // Un atelier est franchi avec ★★ au niveau 1 (ou, pour le bouton central, s'il a été passé faute de bouton)
    function isPassed(activity) {
        return getStars(activity.id, 1) >= STARS_TO_UNLOCK || (activity.id === 'central' && Boolean(getSetting('noMiddle')));
    }

    // Les ateliers s'ouvrent dans l'ordre du chemin. Un atelier déjà commencé reste ouvert :
    // ajouter un atelier au chemin ne bloque pas ce qu'on a déjà fait
    function isActivityUnlocked(activity) {
        return activity.levels.some((_, i) => getStars(activity.id, i + 1) > 0)
            || activities.slice(0, activities.indexOf(activity)).every(isPassed);
    }

    // Badge d'un atelier : son dernier niveau réussi avec ★★
    function hasBadge(activity) {
        return getStars(activity.id, activity.levels.length) >= STARS_TO_UNLOCK;
    }

    // Badges à gagner : sans bouton central, son badge n'est pas demandé
    function badgeActivities() {
        return activities.filter((a) => hasBadge(a) || !(a.id === 'central' && getSetting('noMiddle')));
    }

    function allBadges() {
        return badgeActivities().every(hasBadge);
    }

    // ---------- Mode libre ----------

    // Ateliers du mode libre : tous, sauf le bouton central pour qui n'en a pas
    function freeActivities() {
        return activities.filter((a) => !(a.id === 'central' && getSetting('noMiddle')));
    }

    // Le mode libre s'ouvre quand tous les niveaux de tous les ateliers ont été terminés
    function isFreeUnlocked() {
        return freeActivities().every((a) => a.levels.every((_, i) => getStars(a.id, i + 1) > 0));
    }

    // « Vous êtes ici » : le premier atelier pas encore franchi, sinon le premier sans badge
    function currentStep() {
        return activities.find((a) => isActivityUnlocked(a) && !isPassed(a))
            || badgeActivities().find((a) => !hasBadge(a))
            || null;
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
    // active : left, right, middle, wheel-up, wheel-down, wheel, drag, double, triple, ctrl, shift, move, all
    function mouseSvg(active) {
        const on = (part) => (active === part || active === 'all'
            || (part === 'middle' && active.startsWith('wheel'))
            || (part === 'left' && ['drag', 'double', 'triple', 'ctrl', 'shift'].includes(active))) ? ' active' : '';
        let arrow = '';
        if (active === 'wheel-up') arrow = '<path class="arrow" d="M80 6 L90 22 H70 Z"/>';
        if (active === 'wheel-down') arrow = '<path class="arrow" d="M80 34 L90 18 H70 Z"/>';
        if (active === 'wheel') arrow = '<path class="arrow" d="M80 2 L88 14 H72 Z M80 38 L88 26 H72 Z"/>';
        if (active === 'drag') arrow = '<path class="arrow" d="M72 44 H80 V36 L90 50 L80 64 V56 H72 Z"/>';
        if (active === 'double') arrow = '<text class="arrow-text" x="80" y="26" text-anchor="middle">×2</text>';
        if (active === 'triple') arrow = '<text class="arrow-text" x="80" y="26" text-anchor="middle">×3</text>';
        // Touche du clavier à garder enfoncée pendant le clic
        if (active === 'ctrl') arrow = '<text class="arrow-text key" x="80" y="24" text-anchor="middle">Ctrl</text>';
        if (active === 'shift') arrow = '<text class="arrow-text key" x="80" y="24" text-anchor="middle">Maj</text>';
        // Déplacer la souris sans cliquer : flèches dans les 4 directions
        if (active === 'move') arrow = '<path class="arrow" d="M80 6 L86 14 H74 Z M80 42 L86 34 H74 Z M70 24 L77 18 V30 Z M90 24 L83 18 V30 Z"/>';
        const viewBox = arrow ? '12 0 80 84' : '12 0 60 84';
        return `<svg class="mouse-svg" viewBox="${viewBox}" style="width:${arrow ? 80 : 60}px">
            <path class="part" d="M15 36 V54 A27 27 0 0 0 69 54 V36 Z"/>
            <path class="part${on('left')}" data-part="left" d="M15 36 V30 A27 27 0 0 1 42 3 V36 Z"/>
            <path class="part${on('right')}" data-part="right" d="M69 36 V30 A27 27 0 0 0 42 3 V36 Z"/>
            <rect class="part${on('middle')}" data-part="middle" x="37" y="10" width="10" height="20" rx="5"/>${arrow}
        </svg>`;
    }

    function starsText(count) {
        return '★'.repeat(count) + '☆'.repeat(3 - count);
    }

    function setHint(part) {
        mouseHint.innerHTML = mouseSvg(part);
    }

    // Énoncé de la manche, en gras. Il reste affiché ; le commentaire précédent est effacé.
    function setInstruction(text) {
        instructionElement.textContent = text;
        setFeedback('');
    }

    // Commentaire sous l'énoncé : 'good' (vert), 'bad' (rouge) ou 'info' (conseil, gris foncé)
    function setFeedback(text, kind = 'info') {
        feedbackElement.textContent = text;
        feedbackElement.className = 'feedback ' + kind;
    }

    function updateStats() {
        scoreElement.textContent = freeMode
            ? `Réussites : ${freeMode.total} · Série : ${freeMode.streak} · Record : ${getSetting('freeRecord') || 0}`
            : `Réussites : ${round} / ${level.rounds}`;
        errorsElement.textContent = `Erreurs : ${errors}`;
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // ---------- Menu ----------

    function renderBadges() {
        const list = badgeActivities();
        const earned = list.filter(hasBadge).length;
        const medals = list.map((a) => {
            const title = hasBadge(a) ? `Badge « ${a.badge} »` : `Badge « ${a.badge} » : réussissez le niveau 3 de « ${a.title} » avec ★★`;
            return `<span class="medal${hasBadge(a) ? ' earned' : ''}" title="${title}">${mouseSvg(a.hint)}</span>`;
        }).join('');
        const free = isFreeUnlocked();
        badgesElement.innerHTML = `<span class="badges-title">🏅 Mes badges : ${earned} / ${list.length}</span>
            <span class="medals">${medals}</span>`
            + (allBadges() ? `<span class="diploma">${free ? '🎓 Diplôme !' : '🎓 Bravo, vous maîtrisez la souris !'}</span>` : '')
            // Le mode libre n'apparaît qu'une fois tous les niveaux terminés
            + (free ? '<button class="free-button" id="freeButton" title="Des exercices tirés au hasard, sans fin">🎲 Mode libre</button>' : '');
        if (free) document.getElementById('freeButton').addEventListener('click', startFreeMode);
    }

    function makeCard(activity, index, here) {
        const card = document.createElement('div');
        card.className = 'card';
        const step = `<span class="step${here ? ' here' : ''}">${here ? '▶ Vous êtes ici' : `Étape ${index + 1}`}</span>`;
        const badge = hasBadge(activity) ? `<span class="card-badge" title="Badge « ${activity.badge} »">🏅</span>` : '';

        if (!isActivityUnlocked(activity)) {
            const blocking = activities.find((a) => !isPassed(a));
            card.classList.add('locked');
            card.innerHTML = `${step}${mouseSvg(activity.hint)}
                <span class="card-title">${activity.title}</span>
                <span class="card-text">🔒 Gagnez d’abord ★★ au niveau 1 de « ${blocking.title} ».</span>`;
            return card;
        }

        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        const recommended = recommendedLevel(activity);
        const skipped = activity.id === 'central' && getSetting('noMiddle') && !getStars(activity.id, 1);
        const levelButtons = activity.levels.map((_, i) => {
            const n = i + 1;
            if (!isUnlocked(activity, n)) {
                return `<button class="level" disabled title="Gagnez ★★ au niveau ${n - 1} pour débloquer">🔒<span>Niv. ${n}</span></button>`;
            }
            const count = getStars(activity.id, n);
            return `<button class="level${n === recommended ? ' current' : ''}" data-level="${n}">
                <span>Niv. ${n}</span><span class="stars">${count ? starsText(count).replace(/★/g, '<b>★</b>') : '☆☆☆'}</span></button>`;
        }).join('');
        card.innerHTML = `${step}${badge}${mouseSvg(activity.hint)}
            <span class="card-title">${activity.title}</span>
            <span class="card-text">${skipped ? 'Atelier passé : pas de bouton central.' : activity.text}</span>
            <span class="levels">${levelButtons}</span>`;
        if (skipped) card.classList.add('skipped');
        if (here) card.classList.add('here');
        card.addEventListener('click', (e) => {
            const button = e.target.closest('.level');
            if (button && button.disabled) return;
            startActivity(activity, button ? Number(button.dataset.level) : recommended);
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target === card) startActivity(activity, recommended);
        });
        return card;
    }

    // Le chemin serpente : 6 étapes par ligne, une ligne sur deux de droite à gauche
    function renderMenu() {
        const PER_ROW = 6;
        const here = currentStep();
        renderBadges();
        cards.innerHTML = '';
        for (let start = 0; start < activities.length; start += PER_ROW) {
            const rowIndex = start / PER_ROW;
            const row = document.createElement('div');
            row.className = 'path-row' + (rowIndex % 2 ? ' reverse' : '');
            activities.slice(start, start + PER_ROW).forEach((activity, i) => {
                const index = start + i;
                if (i > 0) {
                    const link = document.createElement('div');
                    link.className = 'connector' + (isPassed(activities[index - 1]) ? ' done' : '');
                    row.appendChild(link);
                }
                row.appendChild(makeCard(activity, index, activity === here));
            });
            cards.appendChild(row);
            const last = start + PER_ROW - 1;
            if (last < activities.length - 1) {
                const turn = document.createElement('div');
                turn.className = 'turn' + (rowIndex % 2 ? ' left' : '') + (isPassed(activities[last]) ? ' done' : '');
                cards.appendChild(turn);
            }
        }
    }

    function showMenu() {
        stopActivity();
        freeMode = null;
        resultModal.style.display = 'none';
        game.classList.add('hidden');
        menu.classList.remove('hidden');
        renderMenu();
    }

    // ---------- Déroulement d'une partie ----------

    function startActivity(activity, number = 1) {
        stopActivity();
        freeMode = null;
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
        markBoard();
        updateStats();
        // Première visite de l'atelier : on montre d'abord la démonstration
        const seen = getSetting('demosSeen') || {};
        if (!isTest && !seen[activity.id]) {
            showDemo(() => startActivity(activity, number));
            return;
        }
        startTime = Date.now();
        timerElement.textContent = 'Temps : 00:00';
        timerInterval = setInterval(() => {
            timerElement.textContent = 'Temps : ' + formatTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        activity.start(api, level);
    }

    // Atelier et niveau en cours, lisibles dans la page (utile aux tests, surtout en mode libre)
    function markBoard() {
        board.dataset.activity = current.id;
        board.dataset.level = level.number;
    }

    // ---------- Mode libre : des exercices tirés au hasard, sans fin ----------

    function startFreeMode() {
        stopActivity();
        freeMode = { total: 0, streak: 0 };
        errors = 0;
        resultModal.style.display = 'none';
        menu.classList.add('hidden');
        game.classList.remove('hidden');
        gameTitle.textContent = '🎲 Mode libre';
        skipMiddleButton.classList.add('hidden');
        startTime = Date.now();
        timerElement.textContent = 'Temps : 00:00';
        timerInterval = setInterval(() => {
            timerElement.textContent = 'Temps : ' + formatTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        nextFreeExercise();
    }

    // Tire un niveau au hasard parmi tous ceux des ateliers, jamais deux fois de suite le même atelier
    function nextFreeExercise() {
        const pool = freeActivities().filter((a) => a !== current || freeActivities().length === 1);
        const activity = pool[randomInt(pool.length)];
        playFreeExercise(activity, 1 + randomInt(activity.levels.length));
    }

    // Une manche d'un niveau (une mission entière pour « Ranger le bureau » : ses tâches s'enchaînent)
    function playFreeExercise(activity, number) {
        stopExercise();
        current = activity;
        level = Object.assign({ number }, activity.levels[number - 1], { rounds: 1 });
        round = 0;
        levelText.textContent = `Exercice tiré au hasard : ${activity.title}, niveau ${number}`;
        board.innerHTML = '';
        markBoard();
        updateStats();
        activity.start(api, level);
    }

    // Démonstration animée de l'atelier en cours (js/demo.js), puis onDone()
    function showDemo(onDone) {
        if (freeMode) {
            // En mode libre, le chronomètre continue pendant la démo
            stopExercise();
        } else {
            stopActivity();
            timerElement.textContent = 'Temps : 00:00';
        }
        const activity = current;
        MouseDemo.play(activity, () => {
            const seen = getSetting('demosSeen') || {};
            seen[activity.id] = true;
            setSetting('demosSeen', seen);
            onDone();
        });
    }

    // Arrête l'exercice en cours (minuteries, écouteurs), sans toucher au chronomètre
    function stopExercise() {
        runId++;
        cleanups.forEach((fn) => fn());
        cleanups = [];
    }

    function stopActivity() {
        stopExercise();
        clearInterval(timerInterval);
    }

    function success(next, delay = 700) {
        round++;
        if (freeMode) {
            freeMode.total++;
            freeMode.streak++;
            if (freeMode.streak > (getSetting('freeRecord') || 0)) setSetting('freeRecord', freeMode.streak);
            updateStats();
            later(round >= level.rounds ? nextFreeExercise : next, delay);
            return;
        }
        updateStats();
        later(round >= level.rounds ? endActivity : next, delay);
    }

    function error() {
        errors++;
        if (freeMode) freeMode.streak = 0;
        updateStats();
    }

    function endActivity() {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        stopActivity();
        const stars = errors <= 1 ? 3 : errors <= 4 ? 2 : 1;
        const hasNext = level.number < current.levels.length;
        const wasLocked = hasNext && !isUnlocked(current, level.number + 1);
        const nextActivity = activities[activities.indexOf(current) + 1];
        const nextActivityWasLocked = nextActivity && !isActivityUnlocked(nextActivity);
        const hadBadge = hasBadge(current);
        const hadAllBadges = allBadges();
        const hadFree = isFreeUnlocked();
        saveStars(current.id, level.number, stars);
        if (current.id === 'central') setSetting('noMiddle', false);
        const nextOpen = hasNext && isUnlocked(current, level.number + 1);
        const nextActivityOpened = nextActivityWasLocked && isActivityUnlocked(nextActivity);

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
        if (nextActivityOpened) {
            detail += `<br><strong>🔓 Nouvel atelier sur le chemin : « ${nextActivity.title} » !</strong>`;
        }
        if (!hadBadge && hasBadge(current)) {
            detail += `<div class="new-badge"><span class="medal earned">${mouseSvg(current.hint)}</span>
                <span>Nouveau badge :<br><strong>« ${current.badge} »</strong></span></div>`;
        }
        if (!hadAllBadges && allBadges()) {
            detail += '<div class="diploma">🎓 Tous les badges ! Bravo, vous maîtrisez la souris !</div>';
        }
        if (!hadFree && isFreeUnlocked()) {
            detail += '<div class="diploma">🎲 Tous les niveaux sont terminés : le mode libre est débloqué, dans le menu !</div>';
        }
        resultDetailElement.innerHTML = detail;
        nextLevelButton.classList.toggle('hidden', !nextOpen);
        nextActivityButton.classList.toggle('hidden', !nextActivityOpened);
        nextActivityButton.textContent = nextActivityOpened ? `Atelier suivant : ${nextActivity.title} →` : '';
        nextActivityButton.onclick = () => startActivity(nextActivity, 1);
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
        setInstruction,
        setFeedback,
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
    document.getElementById('demoButton').addEventListener('click', () => {
        // La manche en cours est recommencée après la démonstration
        const number = level.number;
        const activity = current;
        showDemo(() => (freeMode ? playFreeExercise(activity, number) : startActivity(activity, number)));
    });
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
        speed,
        ICONS,
        activities,
        mouseSvg,
        startActivity,
        startFreeMode,
        isFreeUnlocked,
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
