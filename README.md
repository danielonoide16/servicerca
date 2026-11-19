# ServiCerca

Plataforma web que conecta a clientes que necesitan un oficio o servicio presencial con prestadores de su zona.

## Requisitos

- Node 24 (con nvm: `nvm install 24` y `nvm use 24`)
- Git

## Cómo correrlo

1. `git clone <url-del-repo>` y `cd servicerca`
2. `npm install`
3. Copiar `.env.example` como `.env` (Mac/Linux: `cp .env.example .env`, Windows: `Copy-Item .env.example .env`) y poner un `SESSION_SECRET` propio
4. `npm run dev` y abrir http://localhost:3000

La base de datos (`db/servicerca.db`) se crea sola la primera vez.

## Flujo de trabajo

- Nunca hacer push directo a `main`; trabajar en ramas `feature/rf-XX-descripcion` y abrir Pull Request.
- Hacer `git pull` en `main` antes de crear una rama nueva.
- Si alguien agrega un paquete, los demás corren `npm install` después del pull.
