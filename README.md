# Ferrailleurs

Prototype navigateur d'un jeu à 4 joueurs sur plateau hexagonal.

## Lancer

Ouvrir `index.html` dans un navigateur. Les pages d'outils sont `preview/cards.html`, `preview/objectives.html` (galerie) et `preview/objective.html` (builder). Elles partagent les définitions de jeu et les renderers avec l'application.

## Organisation du code

Le dépôt est organisé en quatre couches. Les pages restent des scripts navigateur classiques pour conserver le lancement direct en `file://`.

### Règles et contenu

- `src/data/cards.js` : familles, ressources et actions des cartes, paquet et variantes de règles.
- `src/data/card-art.js` : vocabulaire illustré des cartes utilisé par l'atelier d'aperçu.
- `src/data/objectives.js` : objectifs intégrés au prototype.
- `src/data/objective-schema.js` : format canonique et validation partagés par le moteur et l'atelier.
- `assets/objectives/*.json` : définitions exportées par l'atelier; à chaque export, le catalogue moteur `assets/objectives/catalog.js` est régénéré depuis ces JSON.
- `src/game/` : état, géométrie du plateau, résolution des actions et règles de validation des motifs (`objectives.js`).

### Rendu

- `src/render/common.js` : primitives communes pour afficher les cartes et motifs d'objectif, ainsi que l'export PNG.
- `src/render/card-studio.js` et `src/render/cards.css` : même rendu de face et mêmes styles pour les cartes du jeu et l'aperçu.
- `src/render/objective-renderer.js` et `src/render/objectives.css` : rendu partagé des objectifs en format UI et en format carte.
- `src/ui/render.js` : assemblage de l'interface de partie à partir de l'état du jeu et du renderer commun.
- `styles/game.css` : styles de l'interface.

### Outils et fichiers produits

- `preview/cards.html` : structure de la page d'atelier.
- `preview/cards.css` : styles de l'atelier.
- `preview/cards.js` : interactions et export ZIP/PNG.
- `preview/cards.html` charge les règles de `src/data/cards.js`, les exemples de `src/data/card-art.js`, puis le renderer `src/render/card-studio.js`.
- `preview/objective.html` : structure de l'atelier d'objectifs.
- `preview/objective.css` et `preview/objective.js` : styles, composition et export PNG/JSON de l'atelier.
- `preview/objectives.html` : galerie de tous les objectifs, côte à côte en format carte et en format UI; elle lit les mêmes données que le jeu.
- `assets/objectives/catalog.js` : pont de chargement classique utilisé par le jeu pour rester compatible avec l'ouverture directe de `index.html` en `file://`.
- `assets/cards/` : faces de carte utilisées par le jeu.
- `assets/objectives/` : illustrations et définitions JSON d'objectif.
- `assets/token/`, `assets/numbers/`, `assets/divers/` : symboles et nombres réutilisés par les rendus.

## Boucle de jeu actuelle

- Chaque manche distribue 7 cartes à chacun des 4 joueurs. Deux cartes restent en production; les cinq autres sont jouées en cinq plis.
- La production contient au plus 2 familles; chaque carte peut produire deux fois, en s'engageant à 45° puis à 90°.
- Énergie et Fer ne sont pas stockés. Les coûts sont payés en engageant immédiatement les cartes de production.
- Les humains occupent les cases en groupes. Les grilles peuvent s'empiler; les forts occupent seuls leur case.
- Les objectifs sont décrits par des motifs axiaux allié/ennemi; le moteur les évalue sur le plateau, rotations comprises.
- Après chaque pli, les motifs atteints sont validés et défaussés. La main d'objectifs est plafonnée à quatre.

## Convention pour les changements

Les nouvelles règles doivent être ajoutées aux données de `src/data/`, puis résolues dans `src/game/`. Le rendu et les chemins d'export restent dans `src/render/` ou `preview/`; l'interface de partie ne doit pas devenir une seconde source de règles. Les prochaines étapes naturelles sont d'isoler le contrôleur de partie de `engine.js`, puis de faire utiliser au compositeur d'objectifs le même renderer de motifs que l'interface.
