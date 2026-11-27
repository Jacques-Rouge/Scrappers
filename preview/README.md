# Aperçu et export des cartes

## Lancer l’aperçu sous Windows

Depuis PowerShell, à la racine du dépôt :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\preview\start-local-preview.ps1
```

Le script utilise les composants .NET déjà présents dans Windows. Il n’a besoin ni de Python, ni de Node, ni d’un paquet à installer. Il démarre un petit serveur en lecture seule, limité à `127.0.0.1`, puis ouvre l’aperçu dans le navigateur.

Garde la fenêtre PowerShell ouverte tant que tu utilises l’aperçu. `Ctrl+C` arrête le serveur. Si le port 8765 est déjà pris, lance plutôt :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\preview\start-local-preview.ps1 -Port 8766
```

## Exporter les cartes

Clique sur **Exporter les 30 cartes PNG (ZIP)**. Le navigateur prépare les images et télécharge `ferrailleurs-cartes.zip` dans le dossier Téléchargements. Décompresse ensuite les PNG dans `assets/cards/`.

Le navigateur ne peut pas écrire directement dans le dépôt depuis une page web. Le ZIP est donc une étape volontaire : tu peux vérifier les fichiers avant de les copier dans le jeu.

## Comment les fichiers s’assemblent

- `src/data/cards.js` contient les données et les effets des cartes.
- `preview/cards.html` est le point d’entrée; `preview/cards.css` porte les styles et `preview/cards.js` les interactions et exports.
- `src/render/card-studio.js` transforme les données en cartes affichées; `src/render/common.js` fournit le rendu PNG et les primitives communes.
- L’atelier d’objectifs suit la même séparation : `preview/objective.html`, `preview/objective.css` et `preview/objective.js`.
- Chaque définition exportée est un JSON validé par `src/data/objective-schema.js`; l’atelier reconstruit `assets/objectives/catalog.js` depuis les JSON présents pour que le jeu les charge au prochain lancement.
- `preview/objectives.html` affiche le catalogue en format carte et UI avec le renderer également appelé par l'interface du jeu.
- Les faces de cartes de `preview/cards.html` et celles de la partie utilisent `src/render/card-studio.js` et `src/render/cards.css`.
- `assets/` contient les illustrations, badges, nombres et icônes utilisés par le rendu.
- `assets/cards/` est le dossier de destination des PNG exportés.

Le serveur local sert les fichiers du dépôt au navigateur. Cela donne aux images une origine web locale commune, nécessaire pour que le navigateur puisse les lire pendant l’export.

Pour ouvrir directement l’éditeur d’objectifs au lancement :

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\preview\start-local-preview.ps1 -Page objective
```

## Générer et annoter des objectifs

Dans `preview/objective.html`, la section **Atelier d’idées d’objectifs** génère une série de motifs aléatoires connectés. Pour chaque piste, tu peux modifier le titre, la famille, les points, la relation de quantité et le texte d’annotation/règle, puis cocher celles à conserver.

Le bouton d’export écrit un fichier JSON par objectif retenu dans `assets/objectives/` et reconstruit `assets/objectives/catalog.js`. Le jeu charge ce catalogue au démarrage ; l’annotation est conservée dans le champ `text`. Choisis le dossier racine `BoardGame` dans la boîte de dialogue locale.
