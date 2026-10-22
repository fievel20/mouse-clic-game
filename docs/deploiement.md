# Lancer et déployer

## En local

**Le plus simple :** ouvrez `index.html` dans un navigateur (double-clic sur le fichier). Le jeu est conçu pour fonctionner ainsi, sans serveur : c'est pour cela qu'il n'utilise pas de modules JavaScript.

**Avec un petit serveur**, c'est-à-dire comme la version en ligne et comme pendant le développement, par exemple avec Python :

```bash
python -m http.server 8123
```

Puis ouvrez http://localhost:8123/ (ou http://localhost:8123/?test pour les tests).

Pendant le développement, rechargez sans le cache (**Ctrl + F5**) après chaque modification de CSS ou de JavaScript.

## Branches et pull requests

- `main` est la version publiée.
- **Une branche par évolution**, avec un nom parlant : `feat/barre-defilement`, `fix/sans-cadre-cible`, `docs/…`.
- Chaque branche est fusionnée dans `main` par une **pull request** sur GitHub.

**Avant d'ouvrir une pull request :**

1. `index.html?test` est entièrement ✅.
2. Les changements ont été essayés à la main, avec une vraie souris.
3. Le menu tient dans un écran de 1024 × 768.
4. `README.md` et `docs/` sont à jour.

**Attention aux branches empilées.** Si une branche part d'une autre qui n'est pas encore fusionnée, sa pull request contient aussi les changements de la première. Fusionnez dans l'ordre, ou fusionnez seulement la dernière. Avant de créer une branche, vérifiez que la précédente est bien dans `main` :

```bash
git fetch origin
```

```bash
git log --oneline -5 origin/main
```

## GitHub Pages

Le jeu est publié sur https://fievel20.github.io/mouse-clic-game/ (réglage *Settings → Pages* : source sur la branche `main`, dossier racine).

- **À chaque fusion dans `main`**, GitHub lance le workflow « pages build and deployment ». On peut le suivre dans l'onglet **Actions** du dépôt.
- La publication prend **quelques minutes**. Quand GitHub Actions est ralenti, elle peut rester « en attente » bien plus longtemps. Si elle semble bloquée, ouvrez-la dans l'onglet Actions, puis cliquez sur *Cancel workflow* et *Re-run all jobs*. L'état des services GitHub est sur https://www.githubstatus.com/.
- GitHub Pages demande aux navigateurs de garder les fichiers en mémoire jusqu'à 10 minutes. **Si l'ancienne version s'affiche encore** après la publication, faites **Ctrl + F5**.

Il n'y a rien à compiler : GitHub Pages sert les fichiers du dépôt tels quels. **Tout fichier ajouté à la racine ou dans `js/` est donc public**, y compris `js/tests.js`.
