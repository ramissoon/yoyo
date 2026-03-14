# 🌍 Yoyo – Plateforme de Quiz sur la Côte d'Ivoire

> Apprends la Côte d'Ivoire en t'amusant avec des quiz interactifs.

---

## 📁 Structure du projet

```
yoyo/
├── frontend/           # Site HTML/CSS/JS (SPA)
│   ├── index.html      # App principale (single-page)
│   ├── css/style.css   # Styles globaux
│   └── js/
│       ├── api.js      # Client API REST
│       ├── utils.js    # État, traductions, helpers
│       ├── auth.js     # Authentification (login/register)
│       ├── home.js     # Page d'accueil
│       ├── quiz.js     # Moteur de quiz (saisie, QCM, image, carte)
│       ├── profile.js  # Profil utilisateur + création de quiz
│       └── admin.js    # Dashboard administrateur
│
├── backend/            # API Node.js/Express
│   ├── server.js       # Point d'entrée
│   ├── config/db.js    # Pool MySQL
│   ├── middleware/auth.js
│   ├── routes/
│   │   ├── auth.js     # POST /register, /login, GET /me
│   │   ├── quizzes.js  # CRUD quizzes + play + results
│   │   ├── users.js    # Profils + flammes + classements
│   │   ├── categories.js
│   │   └── admin.js    # Routes admin protégées
│   └── .env.example
│
└── database/
    └── schema.sql      # Schéma MySQL complet + données initiales
```

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- MySQL 8+
- Un navigateur moderne

### 1. Base de données

```bash
mysql -u root -p < database/schema.sql
```

Cela crée la base `yoyo_db`, toutes les tables, les catégories et le compte admin.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Éditez .env avec vos identifiants MySQL et un JWT_SECRET fort
npm install
npm start
# API disponible sur http://localhost:3001
```

### 3. Frontend

Ouvrez simplement `frontend/index.html` dans un navigateur (via Live Server VS Code, ou un serveur local) :

```bash
# Option 1: Python
cd frontend
python3 -m http.server 5500

# Option 2: npx
npx serve frontend -p 5500
```

Puis visitez `http://localhost:5500`.

> **Important** : Assurez-vous que `API_BASE` dans `frontend/js/api.js` pointe vers votre backend.

---

## 🔐 Compte Administrateur

| Champ | Valeur |
|-------|--------|
| Email | `admin@yoyo225.ci` |
| Pseudo | `YoYo225` |
| Mot de passe | `ProJetYoYo225` |

Une fois connecté, le lien **Administration** apparaît dans le menu utilisateur.

---

## 🎮 Types de Quiz

| Type | Description |
|------|-------------|
| **Saisie** | L'utilisateur tape les réponses librement. Validation automatique par normalisation (accents, casse) |
| **QCM** | Questions à choix multiples avec 4 options. Navigation automatique après chaque réponse |
| **Image** | Une image est affichée, l'utilisateur saisit le nom correspondant |
| **Carte** | L'utilisateur doit localiser des zones/villes sur la carte de la Côte d'Ivoire |

---

## 🏆 Système de Gamification

- **Score** : +2 points par bonne réponse, affiché dans le classement global
- **Flammes 🔥** : données par les joueurs aux créateurs de quiz appréciés
- **Likes ❤️** : donnés aux quiz, classent les meilleurs quiz
- **Badges** : attribués automatiquement selon la proportion de quiz complétés par catégorie
  - 🟢 Débutant : 25% des quiz d'une catégorie
  - 🔵 Intermédiaire : 50%
  - 🟡 Expert : 75%

---

## 🌐 Déploiement (Vercel + PlanetScale ou Railway)

### Frontend → Vercel

```bash
# Pointez Vercel sur le dossier /frontend
# Aucun build requis, c'est du HTML statique pur
```

### Backend → Railway ou Render

```bash
# Variables d'environnement à configurer :
DB_HOST=...
DB_USER=...
DB_PASS=...
DB_NAME=yoyo_db
JWT_SECRET=une_clé_très_secrète_et_longue
PORT=3001
FRONTEND_URL=https://votre-domaine.vercel.app
```

### Base de données → PlanetScale, Railway MySQL ou Clever Cloud

Importez `database/schema.sql` dans votre instance MySQL cloud.

---

## 📡 Routes API principales

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/quizzes?sort=popular&category=geographie&limit=10
GET    /api/quizzes/:id
GET    /api/quizzes/:id/play
POST   /api/quizzes/:id/result
POST   /api/quizzes/:id/like
POST   /api/quizzes/:id/report
POST   /api/quizzes
PUT    /api/quizzes/:id
DELETE /api/quizzes/:id

GET    /api/users/:pseudo
POST   /api/users/:id/flame
GET    /api/users/leaderboard/players
GET    /api/users/leaderboard/creators

GET    /api/categories

GET    /api/admin/stats       [admin seulement]
GET    /api/admin/users
GET    /api/admin/quizzes
DELETE /api/admin/users/:id
DELETE /api/admin/quizzes/:id
PUT    /api/admin/reports/:id
```

---

## 🇨🇮 Catégories disponibles

🌍 Géographie · 🏛 Histoire · 🎭 Culture · ⚽ Sport · 🍛 Cuisine · 🎬 Divertissement · 🎯 Mixte

---

## 📝 Notes techniques

- **Authentification** : JWT (7 jours), stocké en `localStorage`
- **Normalisation des réponses** : suppression des accents + lowercasing pour validation flexible
- **Score** : +2 points/réponse juste, mis à jour en temps réel
- **Partage** : utilise l'API Web Share sur mobile, copie dans le presse-papiers sur desktop
- **Sans inscription** : les visiteurs peuvent jouer à tous les quiz sans créer de compte
- **Création de quiz** : requiert au moins 1 badge (pour éviter le spam)

---

*Yoyo – Apprends la Côte d'Ivoire en jouant 🌍🇨🇮*
