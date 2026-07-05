# Deploy Docker Swarm + Traefik

Este guia publica o WACRM em `https://roiwise.com.br` usando Docker Swarm no servidor `srv01`, atras do Traefik.

O processo sobe:

- `roiwise_app`: aplicacao Next.js na porta interna `80`.
- `supabase_db`: Postgres 17 com bootstrap Supabase.
- `supabase_kong`: gateway publico Supabase.
- `supabase_auth`: Auth/GoTrue.
- `supabase_rest`: PostgREST.
- `supabase_realtime`: Realtime/WebSocket.
- `supabase_storage`: Storage API.
- `supabase_imgproxy`: transformacao de imagens do Storage.
- `supabase_meta` e `supabase_studio`: administracao interna/Studio.

Entradas publicas via Traefik:

```txt
https://roiwise.com.br
https://roiwise.com.br/api/whatsapp/webhook
https://roiwise.com.br/supabase
```

`https://roiwise.com.br/supabase` e o `NEXT_PUBLIC_SUPABASE_URL` usado pelo navegador e pelo app. O Traefik remove o prefixo `/supabase` antes de encaminhar para o Kong.

## Pre-requisitos

- Docker instalado no `srv01`.
- Docker Swarm ativo.
- Traefik rodando no Swarm.
- Rede externa `network_swarm_public` existente.
- DNS de `roiwise.com.br` apontando para o IP publico do `srv01`.
- HTTPS/Let's Encrypt funcionando no Traefik.
- Usuario de deploy: `roiadm`.
- Acesso SSH sem senha:

```bash
ssh roiadm@srv01
```

Requisitos minimos para self-hosted Supabase: 4 GB RAM, 2 CPU e 40 GB SSD. Recomendado: 8 GB RAM, 4 CPU e 80 GB SSD.

## Variaveis de ambiente

Nao commite segredos reais.

O arquivo real usado no servidor e `.env.roiwise`. Ele fica ignorado pelo Git. Gere um arquivo inicial com:

```bash
./scripts/generate-deploy-env.sh
```

Depois edite:

```bash
nano .env.roiwise
```

Obrigatorio antes do deploy:

- trocar `META_APP_SECRET=CHANGE_ME_META_APP_SECRET` pelo segredo real do app Meta.
- configurar SMTP se quiser recuperar senha ou confirmar emails por email.

O script gera:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ANON_KEY`
- `SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`
- credenciais do Studio
- segredos auxiliares de Realtime, Storage e meta

As variaveis `NEXT_PUBLIC_*` precisam estar disponiveis durante o build porque o Next.js inlineia esses valores no bundle do navegador durante `next build`.

## Deploy no servidor srv01

Acesse o servidor:

```bash
ssh roiadm@srv01
```

Se o diretorio ainda nao existir:

```bash
sudo mkdir -p /opt/roiwise
sudo chown -R roiadm:roiadm /opt/roiwise
cd /opt/roiwise
git clone https://github.com/baugusto/wacrm.git
cd wacrm
```

Se o repositorio ja existir:

```bash
cd /opt/roiwise/wacrm
git pull
```

Valide o Swarm:

```bash
docker info | grep Swarm
```

Valide a rede publica:

```bash
docker network ls | grep network_swarm_public
```

A rede esperada e:

```txt
network_swarm_public
```

Se por algum motivo ela nao existir:

```bash
docker network create --driver=overlay --attachable network_swarm_public
```

De permissao aos scripts:

```bash
chmod +x scripts/*.sh
chmod +x deploy/supabase/kong-entrypoint.sh
```

Gere o ambiente:

```bash
./scripts/generate-deploy-env.sh
nano .env.roiwise
```

Garanta estes valores:

```txt
NEXT_PUBLIC_SITE_URL=https://roiwise.com.br
NEXT_PUBLIC_SUPABASE_URL=https://roiwise.com.br/supabase
SUPABASE_PUBLIC_URL=https://roiwise.com.br/supabase
API_EXTERNAL_URL=https://roiwise.com.br/supabase
SITE_URL=https://roiwise.com.br
```

Build da imagem:

```bash
./scripts/docker-build.sh
```

Deploy completo:

```bash
./scripts/docker-deploy.sh
```

Esse comando:

- valida variaveis obrigatorias em `.env.roiwise`;
- publica a stack `roiwise`;
- sobe WACRM e Supabase;
- espera o Postgres responder;
- aplica `supabase/migrations/*.sql` uma vez por versao.

Para publicar sem aplicar migrations:

```bash
SKIP_MIGRATIONS=1 ./scripts/docker-deploy.sh
```

Para aplicar migrations manualmente:

```bash
./scripts/supabase-migrate.sh
```

## Validacao

Servicos:

```bash
docker stack services roiwise
docker service ps roiwise_roiwise_app
docker service ps roiwise_supabase_db
docker service ps roiwise_supabase_kong
```

Logs do app:

```bash
./scripts/docker-logs.sh
```

Logs de qualquer servico da stack:

```bash
docker service logs -f roiwise_supabase_kong
docker service logs -f roiwise_supabase_auth
docker service logs -f roiwise_supabase_rest
docker service logs -f roiwise_supabase_realtime
docker service logs -f roiwise_supabase_storage
docker service logs -f roiwise_supabase_db
```

Testar dominio:

```bash
curl -I https://roiwise.com.br
curl -I https://roiwise.com.br/api/whatsapp/webhook
```

Testar Supabase via Traefik:

```bash
curl -I https://roiwise.com.br/supabase/auth/v1/health
curl -I https://roiwise.com.br/supabase/rest/v1/
```

O endpoint `/rest/v1/` pode retornar erro sem `apikey`; isso e esperado. O importante e chegar ao Kong/PostgREST, nao ao WACRM.

Supabase Studio fica em:

```txt
https://roiwise.com.br/supabase
```

Use `DASHBOARD_USERNAME` e `DASHBOARD_PASSWORD` de `.env.roiwise`.

## Configuracao da Meta

Apos o deploy, configure o painel da Meta com:

Callback URL:

```txt
https://roiwise.com.br/api/whatsapp/webhook
```

Verify Token:

```txt
o mesmo token salvo no WACRM
```

Evento obrigatorio:

```txt
messages
```

## Backups

Este deploy usa volumes Docker nomeados:

- `roiwise_supabase_db_data`
- `roiwise_supabase_storage_data`
- `roiwise_supabase_db_config`

Antes de qualquer update destrutivo, faca backup do banco:

```bash
docker run --rm \
  --network roiwise_internal \
  -e PGPASSWORD="$(grep '^POSTGRES_PASSWORD=' .env.roiwise | cut -d= -f2-)" \
  postgres:17-alpine \
  pg_dump -h supabase_db -U postgres -d postgres -Fc > wacrm-postgres.dump
```

E preserve tambem o volume de Storage.

## Remover stack

```bash
./scripts/docker-remove.sh
```

Esse comando remove servicos da stack, mas nao apaga os volumes nomeados. Para apagar dados de banco/storage, remova os volumes manualmente apenas se tiver certeza e backup.
