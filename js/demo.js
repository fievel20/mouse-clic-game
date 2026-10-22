// Démonstrations animées : avant la première partie de chaque atelier,
// une petite scène montre le geste (flèche qui se déplace, bouton de souris qui s'enfonce).
window.MouseDemo = (() => {
    const modal = document.getElementById('demoModal');
    const titleElement = document.getElementById('demoTitle');
    const scene = document.getElementById('demoScene');
    const mouse = document.getElementById('demoMouse');
    const captionElement = document.getElementById('demoCaption');
    const replayButton = document.getElementById('demoReplay');
    const goButton = document.getElementById('demoGo');

    const CURSOR = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.5 L12 13.5 L19 13.5 Z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const MOVE_MS = 900;

    let token = 0;           // invalide une démonstration interrompue
    let activity = null;
    let onDone = null;
    let cursor = null;
    let carried = null;      // élément déplacé avec la flèche (glisser-déposer)

    class Cancelled extends Error {}

    // ---------- Outils d'animation ----------

    function wait(ms) {
        const id = token;
        return new Promise((resolve, reject) => {
            setTimeout(() => (id === token ? resolve() : reject(new Cancelled())), ms * MouseGame.speed);
        });
    }

    // Place un élément dans la scène, centré sur (x, y)
    function put(html, x, y, className = '') {
        const el = document.createElement('div');
        el.className = 'demo-item ' + className;
        el.innerHTML = html;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        scene.appendChild(el);
        return el;
    }

    function setMouse(active) {
        mouse.innerHTML = MouseGame.mouseSvg(active);
    }

    async function caption(text, pause = 2000) {
        captionElement.textContent = text;
        await wait(pause);
    }

    async function moveTo(x, y) {
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
        if (carried) {
            carried.style.left = x + 'px';
            carried.style.top = y + 'px';
        }
        await wait(MOVE_MS);
    }

    async function moveToEl(el) {
        await moveTo(parseFloat(el.style.left), parseFloat(el.style.top));
    }

    // Petit cercle à la pointe de la flèche, pour « voir » le clic
    function ripple() {
        const r = put('', parseFloat(cursor.style.left), parseFloat(cursor.style.top), 'demo-ripple');
        setTimeout(() => r.remove(), 500);
    }

    function setPressed(part, pressed) {
        const el = mouse.querySelector(`[data-part="${part}"]`);
        if (el) el.classList.toggle('pressed', pressed);
    }

    async function press(part, hold = false) {
        setPressed(part, true);
        ripple();
        await wait(220);
        if (!hold) setPressed(part, false);
    }

    // Un cran de molette : la molette s'allume, sans clic
    async function notch() {
        setPressed('middle', true);
        await wait(220);
        setPressed('middle', false);
    }

    function release(part) {
        setPressed(part, false);
    }

    function file(x, y) {
        return put(MouseGame.ICONS.file, x, y, 'demo-icon');
    }

    function folder(x, y, label = '') {
        return put(MouseGame.ICONS.folder + (label ? `<span>${label}</span>` : ''), x, y, 'demo-icon');
    }

    // ---------- Scènes ----------

    const SCENES = {
        async gauche() {
            setMouse('left');
            const target = file(240, 95);
            await caption('Posez la main sur la souris. L’index va sur le bouton gauche, ici en vert.', 2600);
            captionElement.textContent = 'Faites glisser la souris sur la table : la flèche bouge pareil à l’écran.';
            await moveToEl(target);
            await wait(900);
            captionElement.textContent = 'La flèche est sur le fichier : appuyez puis relâchez le bouton gauche. C’est un clic !';
            await wait(900);
            await press('left');
            target.classList.add('done');
            await wait(1800);
        },

        async droit() {
            setMouse('right');
            const target = file(200, 80);
            await caption('Le majeur se pose sur le bouton droit, ici en vert.', 2400);
            captionElement.textContent = 'Amenez la flèche sur le fichier.';
            await moveToEl(target);
            captionElement.textContent = 'Appuyez puis relâchez le bouton droit : un menu s’ouvre.';
            await wait(900);
            await press('right');
            // Le menu est placé par son coin haut gauche, comme un vrai menu contextuel
            const menu = put('<div>Ouvrir</div><div>Copier</div><div class="pick">Renommer</div><div>Supprimer</div>', 205, 85, 'demo-menu');
            await wait(1800);
            setMouse('left');
            captionElement.textContent = 'Au niveau 2, on choisit ensuite une action, avec le bouton gauche.';
            await moveTo(250, 156);
            await press('left');
            menu.querySelector('.pick').classList.add('chosen');
            await wait(1800);
        },

        async double() {
            setMouse('double');
            const target = folder(240, 95);
            await caption('Un double-clic, c’est deux clics du bouton gauche, très vite.', 2400);
            captionElement.textContent = 'Amenez la flèche sur le dossier.';
            await moveToEl(target);
            captionElement.textContent = 'Clic-clic ! Deux clics rapides, sans bouger la souris.';
            await wait(900);
            await press('left');
            await wait(120);
            await press('left');
            target.innerHTML = MouseGame.ICONS.folderOpen;
            target.classList.add('done');
            await caption('Le dossier s’ouvre. Un seul clic l’aurait seulement sélectionné.', 2400);
        },

        async central() {
            setMouse('middle');
            const target = file(240, 95);
            await caption('La molette, entre les deux boutons, est aussi un bouton : on peut appuyer dessus.', 2800);
            captionElement.textContent = 'Amenez la flèche sur le fichier.';
            await moveToEl(target);
            captionElement.textContent = 'Appuyez sur la molette avec l’index, sans la faire tourner.';
            await wait(900);
            await press('middle');
            target.classList.add('done');
            await caption('Sur Internet, cela ouvre un lien dans un nouvel onglet.', 2400);
        },

        async molette() {
            setMouse('wheel-down');
            const cells = [40, 105, 170].map((y) => put('', 170, y, 'demo-cell'));
            folder(170, 170);
            const moving = file(170, 40);
            moving.classList.add('on-top');
            // Ici, la flèche ne sert à rien : seule la molette tourne
            cursor.style.display = 'none';
            await caption('Posez l’index sur la molette. Pas besoin de bouger la souris.', 2400);
            captionElement.textContent = 'Faites rouler la molette vers vous : à chaque cran, le fichier descend d’une case.';
            for (let i = 1; i < cells.length; i++) {
                await wait(700);
                await notch();
                moving.style.top = cells[i].style.top;
            }
            moving.classList.add('done');
            await wait(1200);
            setMouse('wheel-up');
            await caption('Vers l’écran, c’est l’inverse : ça remonte. Dans une liste, la molette fait défiler la page.', 3000);
        },

        async glisser() {
            setMouse('drag');
            const target = file(80, 95);
            const box = folder(260, 95, 'Dossier');
            await caption('Le glisser-déposer sert à déplacer un fichier.', 2200);
            captionElement.textContent = 'Amenez la flèche sur le fichier.';
            await moveToEl(target);
            captionElement.textContent = 'Appuyez sur le bouton gauche et gardez-le enfoncé.';
            await wait(800);
            await press('left', true);
            target.classList.add('lifted');
            await wait(1200);
            captionElement.textContent = 'Sans lâcher, déplacez la souris jusqu’au dossier.';
            carried = target;
            await moveTo(260, 95);
            await wait(600);
            carried = null;
            captionElement.textContent = 'Relâchez le bouton : le fichier est rangé !';
            await wait(700);
            release('left');
            target.remove();
            box.classList.add('done');
            await wait(1800);
        },

        async melange() {
            const targets = [file(90, 80), file(200, 150), file(290, 70)];
            await caption('Dans le Grand défi, les boutons changent à chaque fichier.', 2400);
            const parts = ['left', 'right', 'middle'];
            const names = ['gauche', 'droit', 'central'];
            for (let i = 0; i < 3; i++) {
                setMouse(parts[i]);
                captionElement.textContent = `Regardez la souris dessinée : ici, c’est le bouton ${names[i]}.`;
                await moveToEl(targets[i]);
                await press(parts[i]);
                targets[i].classList.add('done');
                await wait(900);
            }
            await caption('Le bouton en vert est toujours celui à utiliser.', 2200);
        }
    };

    // ---------- Déroulement ----------

    async function run() {
        token++;
        scene.innerHTML = '';
        carried = null;
        cursor = put(CURSOR, 40, 170, 'demo-cursor');
        replayButton.disabled = true;
        try {
            await wait(300);
            await SCENES[activity.id]();
            replayButton.disabled = false;
            modal.dataset.state = 'finished';
        } catch (err) {
            if (!(err instanceof Cancelled)) throw err;
        }
    }

    function close() {
        token++;
        modal.style.display = 'none';
        const done = onDone;
        onDone = null;
        if (done) done();
    }

    replayButton.addEventListener('click', run);
    goButton.addEventListener('click', close);

    return {
        play(nextActivity, done) {
            activity = nextActivity;
            onDone = done;
            titleElement.textContent = `Comment faire : ${activity.title}`;
            modal.dataset.state = 'playing';
            modal.style.display = 'block';
            run();
        },
        has(id) {
            return Boolean(SCENES[id]);
        }
    };
})();
