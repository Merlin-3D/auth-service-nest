## Auth Service NestJS

Service d’authentification basé sur **NestJS** et **Prisma** conçu pour des architectures modernes (microservices / multi-tenant), avec :

- **JWT access tokens** (courte durée)
- **Refresh tokens** avec **rotation sécurisée**
- **Rôles & permissions** (`USER` / `ADMIN`)
- **Blacklist de tokens** via **Redis + cache**
- **Multi‑organisation** avec `tenantId`
- **Prisma** pour la couche ORM

---

### Fonctionnalités principales

- **Authentification JWT**
  - `POST /auth/login` : retourne un `accessToken` (15 min) + `refreshToken` (7 jours).
  - Payload des tokens :
    - `sub` : identifiant utilisateur
    - `email`
    - `fullName`
    - `role` : `USER` ou `ADMIN`
    - `tenantId` : identifiant de l’organisation
    - `jti` : identifiant unique du token
    - `type` : `access` ou `refresh`

- **Refresh Token + Rotation**
  - `POST /auth/refresh` :
    - Accepte un `refreshToken`.
    - Vérifie sa validité et son **type** (`refresh`).
    - Vérifie s’il n’a **jamais été utilisé** auparavant (rotation).
    - **Blacklist** l’ancien refresh token.
    - Retourne une **nouvelle paire** `accessToken` + `refreshToken`.
  - Un refresh token n’est **utilisable qu’une seule fois**.

- **Rôles & Permissions**
  - Décorateur `@Roles('ADMIN')` ou `@Roles('USER', 'ADMIN')`.
  - `RolesGuard` vérifie le rôle présent dans le JWT.
  - Exemple :
    - `PATCH /users/:id` et `DELETE /users/:id` sont protégés par `@Roles('ADMIN')`.

- **Blacklist de Tokens (Redis)**
  - Utilise `CacheModule` + `KeyvRedis` (et un cache in‑memory de secours).
  - `TokenBlacklistService` :
    - `blacklist(jti, type, ttlSeconds)`
    - `isBlacklisted(jti, type)`
  - **Access tokens** :
    - Le `AuthGuard` vérifie que le `jti` n’est pas blacklisté.
  - **Refresh tokens** :
    - Lors d’un refresh, l’ancien refresh est blacklisté pour empêcher sa réutilisation.

- **Multi‑organisation (`tenantId`)**
  - Modèle Prisma :
    - `Tenant` (id, name, users[])
    - `User` :
      - `id`, `email`, `fullName`, `password`
      - `role` (`USER` par défaut)
      - `tenantId` (relation obligatoire vers `Tenant`)
  - Chaque token inclut `tenantId`, permettant :
    - du filtrage logique par organisation,
    - une isolation des données côté application.

---

### Stack technique

- **Runtime / Framework**
  - [NestJS](https://nestjs.com/) v11
  - TypeScript

- **Base de données**
  - PostgreSQL (géré via [Prisma](https://www.prisma.io/))

- **Auth / Sécurité**
  - `@nestjs/jwt`
  - `bcrypt` pour le hash des mots de passe
  - Guards NestJS (`AuthGuard`, `RolesGuard`)
  - Décorateurs personnalisés (`@Public()`, `@Roles()`)

- **Cache / Redis**
  - `@nestjs/cache-manager`
  - `keyv` + `@keyv/redis`
  - `cacheable` pour le cache in‑memory

- **Validation**
  - `zod` (schemas pour login / création d’utilisateur)

---

### Modèles Prisma (résumé)

- **Tenant**

```prisma
model Tenant {
  id    String   @id @default(uuid())
  name  String
  users User[]
}
```

- **User**

```prisma
model User {
  id        String  @id @default(uuid())
  email     String  @unique
  fullName  String
  password  String
  role      String  @default("USER")
  tenantId  String
  tenant    Tenant  @relation(fields: [tenantId], references: [id])
}
```

---

### Installation

```bash
# Installer les dépendances
npm install

# Générer le client Prisma
npx prisma generate
```

Configurer ensuite votre base PostgreSQL, puis :

```bash
# Appliquer les migrations Prisma
npx prisma migrate dev --name init
```

---

### Configuration

Les secrets sont actuellement définis dans `jwtConstants` (fichier `src/common/constants/token.constants.ts`), mais en production il est recommandé de les mettre dans des **variables d’environnement**.

Variables à prévoir (exemple) :

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `DATABASE_URL` (pour Prisma)
- `REDIS_URL` (ex: `redis://localhost:6379`)

Vous pouvez ensuite adapter `token.constants.ts` pour lire ces valeurs via `process.env`.

---

### Scripts NPM

- `npm run start` : démarre l’application.
- `npm run start:dev` : démarre en mode développement (watch).
- `npm run build` : build TypeScript.
- `npm run test` / `test:e2e` : tests unitaires / e2e.
- `npm run lint` : lint du projet.

---

### Endpoints principaux

- **Auth**
  - `POST /auth/login`
    - Body : `{ "email": string, "password": string }`
    - Réponse : `{ "accessToken": string, "refreshToken": string }`
  - `POST /auth/refresh`
    - Body : `{ "refreshToken": string }`
    - Réponse : nouvelle paire `{ "accessToken": string, "refreshToken": string }`
  - `GET /auth/profile`
    - Protégé par JWT (access token).
    - Retourne le payload utilisateur.

- **Users**
  - `POST /users/create`
    - Body : `{ email, fullName, password, tenantId, role? }`
    - Crée un utilisateur rattaché à un `tenantId`.
  - `PATCH /users/:id`
    - Protégé par `AuthGuard` + `@Roles('ADMIN')`.
  - `DELETE /users/:id`
    - Protégé par `AuthGuard` + `@Roles('ADMIN')`.

---

### Comment ça fonctionne (vue d’ensemble)

1. **Login**
   - L’utilisateur appelle `/auth/login` avec email/mot de passe.
   - `AuthService` vérifie le mot de passe (bcrypt) puis génère un **access token** (court) et un **refresh token** (long).
   - Les tokens contiennent les infos de l’utilisateur, son `role` et son `tenantId`.

2. **Accès aux routes protégées**
   - Les routes protégées sont sous `AuthGuard` (global).
   - Le guard lit le header `Authorization: Bearer <accessToken>`, vérifie la signature, le type (`access`) et la blacklist.
   - Le payload est attaché à `req.user`.

3. **Permissions**
   - `RolesGuard` lit la métadonnée `@Roles()` sur le handler.
   - Compare avec `req.user.role` et refuse si le rôle n’est pas suffisant.

4. **Refresh & rotation**
   - L’application utilise `/auth/refresh` pour renouveler les tokens sans redemander le mot de passe.
   - Chaque refresh token est utilisable **une seule fois** :
     - on vérifie s’il est déjà blacklisté,
     - on blacklist le refresh utilisé,
     - on crée une nouvelle paire de tokens.

5. **Multi‑tenant**
   - `tenantId` est stocké en base et dans les JWT.
   - Permet de filtrer les données par organisation dans les services / repositories.

---

### Objectif du projet

Ce repo sert d’**exemple complet** d’un service d’authentification NestJS prêt pour la production, avec :

- bonnes pratiques JWT,
- rotation de refresh tokens & blacklist,
- multi-tenant,
- rôles & guards NestJS.

Tu peux t’en servir comme base pour tes propres microservices ou comme projet pédagogique pour apprendre NestJS + Prisma + Redis autour de l’authentification.

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
