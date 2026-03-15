# 🌍 YOYO v2 – GUIDE D'INSTALLATION
## Mise à jour depuis la v1

---

## 📁 STRUCTURE DU PROJET

```
yoyo_v2/
├── frontend/
│   ├── index.html        ← Page principale du site
│   ├── css/style.css     ← Design
│   └── js/
│       ├── app.js        ← État global + API client
│       ├── auth.js       ← Connexion / inscription
│       ├── home.js       ← Accueil + classements
│       ├── quiz.js       ← Moteur de quiz (saisie, QCM, image, carte)
│       ├── profile.js    ← Profil + création de quiz
│       ├── admin.js      ← Panneau admin
│       └── map.js        ← Carte SVG Côte d'Ivoire
│
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── config/db.js
│   ├── middleware/auth.js
│   └── routes/
│       ├── auth.js
│       ├── quizzes.js    ← Upload ImgBB intégré
│       ├── users.js
│       ├── categories.js
│       └── admin.js
│
└── database/
    └── schema.sql        ← Schéma complet v2
```

---

## 🔑 CE QUI A CHANGÉ DEPUIS LA V1

| Avant (v1) | Maintenant (v2) |
|---|---|
| Création de quiz : badge requis | Tout utilisateur inscrit peut créer |
| Flammes ne fonctionnaient pas | Flammes cliquables partout |
| Images = URL à coller | Upload réel via ImgBB |
| QCM buggé | QCM entièrement réécrit |
| Profil admin introuvable | Profil admin fonctionnel |
| Visiteurs ne voient pas les boutons | Boutons visibles, connexion demandée au clic |
| Quiz signalé = non modifiable par admin | Admin peut déverrouiller |

---

## 🚀 MISE À JOUR SUR RAILWAY + VERCEL

### Étape 1 — Réinitialiser la base de données

Dans **TablePlus** :
1. Connecte-toi à ta base `yoyo_db`
2. Ouvre le SQL (Ctrl+Q)
3. Colle tout le contenu de `database/schema.sql`
4. Exécute (Ctrl+Enter)

⚠️ Cela supprime tout et recrée les tables proprement.
Le compte admin sera recréé automatiquement.

---

### Étape 2 — Obtenir une clé ImgBB (gratuit, 2 minutes)

1. Va sur **https://api.imgbb.com**
2. Clique **"Get API key"**
3. Crée un compte gratuit
4. Copie ta clé API

---

### Étape 3 — Mettre à jour les variables Railway (backend)

Dans Railway → service backend → **Variables** :

| Variable | Valeur |
|---|---|
| `DB_HOST` | `interchange.proxy.rlwy.net` |
| `DB_PORT` | `37582` |
| `DB_USER` | `root` |
| `DB_PASS` | *(ton mot de passe Railway MySQL)* |
| `DB_NAME` | `yoyo_db` |
| `JWT_SECRET` | `YoyoV2SuperSecretKey2024` |
| `PORT` | `3001` |
| `IMGBB_API_KEY` | *(ta clé ImgBB de l'étape 2)* |

---

### Étape 4 — Mettre à jour le code sur GitHub

1. Dans le fichier `frontend/js/app.js`, vérifie que la ligne :
   ```javascript
   const API = 'https://yoyo-production-28ff.up.railway.app/api';
   ```
   contient bien **ton** URL Railway backend.

2. Upload tous les fichiers sur GitHub (remplace les anciens).

3. Vercel et Railway se mettront à jour automatiquement.

---

## 🔐 COMPTE ADMIN

| | |
|--|--|
| **Email** | `admin@yoyo225.ci` |
| **Mot de passe** | `ProJetYoYo225` |

---

## ✅ CE QUE TU PEUX FAIRE DÈS LE LANCEMENT

- ✅ Jouer aux quiz sans inscription
- ✅ Voir les flammes et les statistiques sans inscription
- ✅ S'inscrire et créer un quiz immédiatement (sans badge)
- ✅ Uploader des images réelles pour les quiz
- ✅ Utiliser la carte SVG interactive de Côte d'Ivoire
- ✅ Partager son score sur les réseaux sociaux
- ✅ Liker, enflammer, signaler avec invitation à se connecter

---

## 🗺️ CARTE SVG — IDs des régions disponibles

Pour le quiz "Carte", voici les IDs à utiliser dans le champ "ID de la région" :

`abidjan` · `lagunes` · `grands-ponts` · `agnebi` · `me` · `sud-comoe` · `loh-djiboua` · `goh` · `cavally` · `guemon` · `marahoue` · `haut-sassandra` · `san-pedro` · `gbokle` · `nawa` · `bafing` · `folon` · `kabadougou` · `bagoue` · `poro` · `tchologo` · `hambol` · `gbeke` · `belier` · `moronou` · `n-zi` · `iffou` · `gontougo` · `bounkani` · `indenie-djuablin` · `sud-bandama`

---

*Yoyo v2 – Apprends la Côte d'Ivoire en jouant 🌍🇨🇮*
