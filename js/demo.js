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
        async survol() {
            setMouse('move');
            const target = file(220, 80);
            await caption('Survoler, c’est poser la flèche sur quelque chose, sans cliquer.', 2600);
            captionElement.textContent = 'Amenez la flèche sur le fichier…';
            await moveToEl(target);
            captionElement.textContent = '…puis ne bougez plus et attendez un instant. Aucun bouton à appuyer !';
            await wait(1600);
            const tip = put('lettre.txt', 220, 128, 'demo-tooltip');
            target.classList.add('done');
            await caption('Une bulle d’aide apparaît : elle donne le nom du fichier.', 2600);
            tip.remove();
            target.remove();
            // Le menu est placé par son coin haut gauche, comme un vrai menu
            const menu = put('<div class="pick">Nouveau ▸</div><div>Actualiser</div><div>Propriétés</div>', 40, 50, 'demo-menu');
            captionElement.textContent = 'Dans un menu, survoler une ligne qui finit par ▸ ouvre un sous-menu.';
            await moveTo(100, 64);
            await wait(700);
            menu.querySelector('.pick').classList.add('hovered');
            put('<div>Dossier</div><div>Raccourci</div>', 166, 50, 'demo-menu');
            await wait(2600);
        },

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

        async barre() {
            setMouse('drag');
            const rows = Array.from({ length: 14 }, (_, i) => `<div class="sb-row">${MouseGame.ICONS.file}<span>Document ${i + 1}</span></div>`).join('');
            const view = put(`<div class="sb-view"><div class="sb-content"><div class="sb-inner">${rows}</div></div>
                <div class="sb-bar"><div class="sb-arrow up">▲</div><div class="sb-track"><div class="sb-thumb"></div></div><div class="sb-arrow down">▼</div></div></div>`,
            170, 105, 'demo-sb');
            const inner = view.querySelector('.sb-inner');
            const thumb = view.querySelector('.sb-thumb');
            const down = view.querySelector('.sb-arrow.down');
            // Même calcul que dans l'atelier, à l'échelle de la démo (lignes de 34 px, 5 visibles)
            const ROW = 34;
            const max = 14 * ROW - 170;
            const trackHeight = 170 - 2 * 22;
            const thumbHeight = trackHeight * 170 / (14 * ROW);
            thumb.style.height = thumbHeight + 'px';
            const scrollTo = (value) => {
                inner.style.transform = `translateY(${-value}px)`;
                thumb.style.top = (value / max * (trackHeight - thumbHeight)) + 'px';
            };
            scrollTo(0);
            // Centre d'un élément de la démo, en coordonnées de la scène
            const at = (el) => {
                const s = scene.getBoundingClientRect();
                const r = el.getBoundingClientRect();
                return [r.left - s.left + r.width / 2, r.top - s.top + r.height / 2];
            };
            await caption('À droite d’une liste, la barre de défilement permet de voir la suite.', 2600);
            captionElement.textContent = 'Amenez la flèche sur l’ascenseur, la barre grise.';
            await moveTo(...at(thumb));
            captionElement.textContent = 'Appuyez sur le bouton gauche, gardez-le enfoncé…';
            await press('left', true);
            thumb.classList.add('dragging');
            await wait(900);
            captionElement.textContent = '…et faites glisser vers le bas : la liste défile.';
            const start = at(thumb);
            scrollTo(max * 0.6);
            await moveTo(start[0], start[1] + (trackHeight - thumbHeight) * 0.6);
            release('left');
            thumb.classList.remove('dragging');
            await caption('Relâchez quand vous voyez ce que vous cherchez.', 2200);
            setMouse('left');
            captionElement.textContent = 'La flèche ▼ fait descendre d’une ligne à chaque clic.';
            await moveTo(...at(down));
            for (let i = 1; i <= 2; i++) {
                await press('left');
                scrollTo(Math.min(max, max * 0.6 + i * ROW));
                await wait(700);
            }
            await caption('Et un clic dans la piste, au-dessus ou en dessous de l’ascenseur, saute d’une page.', 3000);
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

        async selection() {
            setMouse('drag');
            const line = put('Le petit <span class="w1">chat</span> dort au <span class="w2">soleil</span>.', 170, 95, 'demo-text');
            // Position d'un mot dans la scène, pour y placer la flèche et le surlignage
            const box = (el) => {
                const s = scene.getBoundingClientRect();
                const r = el.getBoundingClientRect();
                return { left: r.left - s.left, right: r.right - s.left, top: r.top - s.top, height: r.height };
            };
            const highlight = (el) => {
                const b = box(el);
                const h = put('', b.left, b.top, 'demo-highlight');
                h.style.height = b.height + 'px';
                h.style.width = '0px';
                return { h, b };
            };
            await caption('Sélectionner un mot, c’est le surligner avec la souris.', 2400);
            const first = highlight(line.querySelector('.w1'));
            const y = first.b.top + first.b.height / 2;
            captionElement.textContent = 'Cliquez juste avant le mot et gardez le bouton enfoncé…';
            await moveTo(first.b.left - 1, y);
            await press('left', true);
            await wait(900);
            captionElement.textContent = '…glissez jusqu’à la fin du mot : il se colore en bleu.';
            first.h.style.width = (first.b.right - first.b.left) + 'px';
            await moveTo(first.b.right + 1, y);
            await wait(500);
            release('left');
            await caption('Relâchez : le mot est sélectionné !', 2200);
            first.h.remove();
            setMouse('double');
            const second = highlight(line.querySelector('.w2'));
            captionElement.textContent = 'Astuce : un double-clic sur un mot le sélectionne d’un coup.';
            await moveTo((second.b.left + second.b.right) / 2, y);
            await press('left');
            await wait(120);
            await press('left');
            second.h.style.transition = 'none';
            second.h.style.width = (second.b.right - second.b.left) + 'px';
            await caption('Et un triple-clic sélectionne tout le paragraphe.', 2600);
        },

        async multiple() {
            setMouse('ctrl');
            const files = [70, 170, 270].map((x) => file(x, 75));
            const key = put('Ctrl', 50, 175, 'demo-key');
            await caption('Pour choisir plusieurs fichiers, on s’aide de la touche Ctrl du clavier.', 2600);
            captionElement.textContent = 'Un clic sélectionne un premier fichier…';
            await moveToEl(files[0]);
            await press('left');
            files[0].classList.add('demo-selected');
            await wait(1200);
            captionElement.textContent = '…puis on garde Ctrl enfoncée avec l’autre main…';
            key.classList.add('down');
            await wait(1600);
            captionElement.textContent = '…et chaque clic ajoute un fichier à la sélection.';
            await moveToEl(files[2]);
            await press('left');
            files[2].classList.add('demo-selected');
            await wait(1600);
            key.classList.remove('down');
            files.forEach((f) => f.classList.remove('demo-selected'));
            setMouse('drag');
            captionElement.textContent = 'Autre méthode : appuyez dans le vide et tracez un rectangle autour des fichiers.';
            await moveTo(25, 30);
            await press('left', true);
            const lasso = put('', 25, 30, 'demo-lasso');
            lasso.style.width = '0px';
            lasso.style.height = '0px';
            await wait(300);
            lasso.style.width = '290px';
            lasso.style.height = '85px';
            await moveTo(315, 115);
            files.forEach((f) => f.classList.add('demo-selected'));
            release('left');
            lasso.remove();
            await caption('Tous les fichiers dans le rectangle sont sélectionnés.', 2400);
        },

        async mission() {
            setMouse('all');
            // La liste de tâches est placée par son coin haut gauche
            const list = put('<div>1. Ouvrir un dossier</div><div>2. Ranger un fichier</div><div>3. Supprimer un brouillon</div>', 14, 20, 'demo-checklist');
            const lines = list.querySelectorAll('div');
            const box = folder(250, 50, 'Photos');
            const photo = file(250, 160);
            await caption('La mission finale : de vraies tâches sur un petit bureau, avec tous les gestes appris.', 3000);
            captionElement.textContent = 'À gauche, la liste des tâches, à faire dans l’ordre.';
            lines[0].classList.add('current');
            await wait(2200);
            setMouse('double');
            await moveToEl(box);
            await press('left');
            await wait(120);
            await press('left');
            lines[0].classList.replace('current', 'done');
            lines[1].classList.add('current');
            captionElement.textContent = 'Chaque tâche réussie est cochée…';
            await wait(1800);
            setMouse('drag');
            await moveToEl(photo);
            await press('left', true);
            photo.classList.add('lifted');
            carried = photo;
            await moveToEl(box);
            carried = null;
            release('left');
            photo.remove();
            box.classList.add('done');
            lines[1].classList.replace('current', 'done');
            lines[2].classList.add('current');
            await caption('…et on passe à la suivante. Bonne mission !', 2600);
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
