# 🌍 GUIDE D'INSTALLATION YOYO
## Pour quelqu'un sans compétences techniques

---

## 📁 CE QUE CONTIENT LE DOSSIER TÉLÉCHARGÉ

Quand tu décompresses le fichier ZIP, tu obtiens un dossier `yoyo` avec cette structure :

```
yoyo/
├── 📂 frontend/          ← Ce que les visiteurs voient (le site)
│   ├── index.html        ← LA page principale du site
│   ├── 📂 css/
│   │   └── style.css     ← Les couleurs et le design
│   └── 📂 js/
│       ├── api.js
│       ├── utils.js
│       ├── auth.js
│       ├── home.js
│       ├── quiz.js
│       ├── profile.js
│       └── admin.js
│
├── 📂 backend/           ← Le moteur du site (côté serveur)
│   ├── server.js
│   ├── package.json
│   ├── .env.example      ← Fichier de configuration (à renommer)
│   ├── 📂 config/
│   │   └── db.js
│   ├── 📂 middleware/
│   │   └── auth.js
│   └── 📂 routes/
│       ├── auth.js
│       ├── quizzes.js
│       ├── users.js
│       ├── categories.js
│       └── admin.js
│
└── 📂 database/
    └── schema.sql        ← La structure de la base de données
```

---

## 🛠️ DE QUOI AS-TU BESOIN POUR METTRE EN LIGNE ?

Tu as besoin de **3 choses** :

| Quoi | Pour quoi | Service recommandé (gratuit) |
|------|-----------|------------------------------|
| **Hébergement du site** | Afficher les pages aux visiteurs | Vercel (vercel.com) |
| **Serveur backend** | Gérer les utilisateurs, les quiz | Railway (railway.app) |
| **Base de données** | Stocker toutes les données | Railway MySQL |

---

## 🚀 ÉTAPES D'INSTALLATION (version guidée)

---

### ÉTAPE 1 — Crée un compte sur les plateformes gratuites

1. Va sur **https://github.com** → Crée un compte gratuit
2. Va sur **https://railway.app** → Crée un compte (connecte-toi avec GitHub)
3. Va sur **https://vercel.com** → Crée un compte (connecte-toi avec GitHub)

---

### ÉTAPE 2 — Envoie le code sur GitHub

1. Va sur **https://github.com/new**
2. Nomme le dépôt `yoyo`
3. Clique sur **"Create repository"**
4. Sur la page suivante, clique sur **"uploading an existing file"**
5. Glisse-dépose **tout le contenu** du dossier `yoyo` (tous les fichiers et sous-dossiers)
6. Clique sur **"Commit changes"**

---

### ÉTAPE 3 — Crée la base de données sur Railway

1. Va sur **https://railway.app/new**
2. Clique sur **"Add a service"** → choisis **"Database"** → **"MySQL"**
3. Une base de données MySQL se crée automatiquement
4. Clique dessus → onglet **"Data"** → clique sur **"Query"**
5. Copie-colle tout le contenu du fichier `database/schema.sql`
6. Clique sur **"Run Query"**

   ✅ Ta base de données est prête avec toutes les tables et le compte admin.

7. Clique sur l'onglet **"Variables"** et note ces 4 valeurs (tu en auras besoin) :
   - `MYSQL_HOST`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`

---

### ÉTAPE 4 — Déploie le backend sur Railway

1. Sur Railway, clique **"+ New Service"** → **"GitHub Repo"**
2. Sélectionne ton dépôt `yoyo`
3. Railway va te demander quel dossier déployer → tape `backend`
4. Va dans **"Variables"** et ajoute ces variables :

```
DB_HOST     = [la valeur MYSQL_HOST de l'étape 3]
DB_USER     = [la valeur MYSQL_USER de l'étape 3]
DB_PASS     = [la valeur MYSQL_PASSWORD de l'étape 3]
DB_NAME     = [la valeur MYSQL_DATABASE de l'étape 3]
JWT_SECRET  = YoyoCoteDIvoire2024SuperSecret
PORT        = 3001
```

5. Va dans **"Settings"** → **"Networking"** → clique **"Generate Domain"**
6. Tu obtiens une URL du style `yoyo-backend.up.railway.app` → **note-la**

---

### ÉTAPE 5 — Connecte le frontend au backend

1. Ouvre le fichier `frontend/js/api.js` sur ton ordinateur
2. Trouve la ligne :
   ```
   const API_BASE = 'http://localhost:3001/api';
   ```
3. Remplace-la par :
   ```
   const API_BASE = 'https://yoyo-backend.up.railway.app/api';
   ```
   (avec **ton** URL Railway de l'étape précédente)
4. Enregistre le fichier
5. Re-uploade ce fichier modifié sur GitHub (même chemin : `frontend/js/api.js`)

---

### ÉTAPE 6 — Déploie le frontend sur Vercel

1. Va sur **https://vercel.com/new**
2. Clique **"Import Git Repository"** → sélectionne `yoyo`
3. Dans **"Root Directory"**, tape `frontend`
4. Clique **"Deploy"**
5. En quelques secondes, Vercel te donne une URL publique :
   `https://yoyo-xxxx.vercel.app` → **C'est l'adresse de ton site !**

---

### ÉTAPE 7 — Test final

1. Ouvre l'URL de ton site Vercel dans un navigateur
2. Le site doit s'afficher avec le header orange
3. Connecte-toi avec le compte admin :
   - **Email** : `admin@yoyo225.ci`
   - **Mot de passe** : `ProJetYoYo225`
4. Le lien **"Administration"** doit apparaître dans ton menu

---

## ⚡ TESTER EN LOCAL (sur ton propre ordinateur d'abord)

Si tu veux tester le site sur ton ordinateur avant de le mettre en ligne :

### Installe Node.js
1. Va sur **https://nodejs.org**
2. Télécharge la version **LTS** (bouton vert)
3. Installe-le normalement

### Installe MySQL
1. Va sur **https://dev.mysql.com/downloads/mysql/**
2. Télécharge et installe MySQL Community Server
3. Lors de l'installation, note le mot de passe root que tu choisis

### Lance le backend
1. Ouvre le dossier `backend` dans un terminal (sur Windows : clic droit → "Ouvrir dans Terminal")
2. Tape ces commandes une par une :
```
copy .env.example .env
```
3. Ouvre le fichier `.env` avec le Bloc-Notes et remplis :
```
DB_HOST=localhost
DB_USER=root
DB_PASS=ton_mot_de_passe_mysql
DB_NAME=yoyo_db
JWT_SECRET=YoyoSecret2024
PORT=3001
```
4. Dans le terminal, tape :
```
npm install
npm start
```
   ✅ Tu dois voir : `🟢 Yoyo API running on port 3001`

### Lance le frontend
1. Double-clique simplement sur `frontend/index.html`
   — OU —
   Installe l'extension **Live Server** dans VS Code et clique "Go Live"

---

## 🔑 COMPTE ADMINISTRATEUR

| | |
|--|--|
| **Email** | admin@yoyo225.ci |
| **Mot de passe** | ProJetYoYo225 |
| **Pseudo visible** | YoYo225 |

Ce compte est invisible pour les utilisateurs normaux.
Il donne accès au panneau d'administration depuis le menu en haut à droite.

---

## ❓ PROBLÈMES FRÉQUENTS

**Le site s'affiche mais les quiz ne chargent pas**
→ Le backend n'est pas lancé, ou l'URL dans `api.js` n'est pas correcte.

**"Erreur 401" à la connexion**
→ Vérifie que la base de données a bien été importée (schema.sql).

**Page blanche**
→ Ouvre la console du navigateur (F12 → Console) et dis-moi l'erreur affichée.

**Je ne vois pas l'onglet Administration**
→ Assure-toi de te connecter avec `admin@yoyo225.ci` et non un autre compte.

---

## 📞 RÉSUMÉ EN 3 LIGNES

1. **GitHub** : stocke le code
2. **Railway** : fait tourner le moteur + la base de données
3. **Vercel** : affiche le site aux visiteurs

Tout est **gratuit** pour commencer. 🎉
