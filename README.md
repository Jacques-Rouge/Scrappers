# Ferrailleurs

Prototype navigateur d'un jeu à 4 joueurs sur plateau hexagonal.

## Lancer

Ouvrir `index.html` dans un navigateur. La maquette visuelle des cartes se trouve dans `preview/cards.html`.

## Boucle de jeu actuelle

- Chaque manche distribue 7 cartes à chacun des 4 joueurs (les 2 cartes restantes ne sont pas utilisées).
- Chaque joueur choisit 2 cartes qui restent dans sa production pour la manche; les 5 autres cartes forment sa main.
- La production contient au plus 2 familles. Les cartes d'une même famille s'empilent et comptent toutes séparément; chaque carte s'engage deux fois au maximum : 45° puis 90°. Chaque engagement produit un seul symbole choisi parmi ceux de la carte.
- Une action à coût commence par le choix du coût, puis les cartes de production sont engagées pour le payer immédiatement. Énergie et Fer ne sont jamais stockés. L'action PROD pose d'abord la carte jouée, puis fait engager une carte de la zone PROD; le symbole produit est perdu s'il ne paie aucun coût.
- Une manche comporte 5 plis. Le premier joueur pose une carte visible et fixe la couleur du pli.
- Les Humains de départ commencent sur le bord du plateau. Les Humains ajoutés ensuite se posent sur une case libre adjacente à l'un de tes Humains.
- Les autres jouent une carte visible pour son effet, ou la posent face cachée pour copier l'effet de la couleur menée.
- Une carte visible de la couleur menée, avec une valeur au moins égale à la première carte, débloque aussi l'effet secret.
- Après chaque pli, 5 objectifs sont révélés. Les joueurs en choisissent un dans l'ordre croissant de la valeur jouée; le dernier choisit entre les 2 derniers.

Les actions normales des cinq familles sont structurées dans `src/data/cards.js`; `preview/cards.html` affiche les mêmes définitions. `CARD_VARIANTS` permet de surcharger les actions, symboles de production ou visuels pour une valeur précise (ex. `energie:1`). Les images finales des 30 cartes sont dans `assets/cards/`.

Les effets secrets restent à définir. Les objectifs et la fin de partie sont provisoires; les bots sont simples pour permettre de jouer la boucle en solo.

## Organisation

- `index.html` : interface et chargement des scripts.
- `styles/game.css` : styles.
- `src/data/cards.js` : familles et paquet de 30 cartes.
- `assets/cards/` : images des 30 cartes (type_valeur).
- `src/data/objectives.js` : objectifs provisoires et vérifications.
- `src/game/state.js` : état courant.
- `src/game/board.js` : géométrie hexagonale.
- `src/game/engine.js` : boucle de jeu, effets et bots.
- `src/ui/render.js` : affichage.
- `preview/cards.html` : maquette des cartes et export PNG.
