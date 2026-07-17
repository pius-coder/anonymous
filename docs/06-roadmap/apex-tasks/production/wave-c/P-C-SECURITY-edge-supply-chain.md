# P-C-SECURITY - Edge, secrets et supply chain

## Mission autonome

Durcir l'exposition publique et la chaine de livraison : threat model, headers/origins, WAF/rate limits,
secrets, dependances, SBOM, signature et reponse aux vulnerabilites.

## Prerequis et lectures

- P-C-PLATFORM merge; P-SEQ-06 merge.
- Lire security, auth/live/payment, audit dependances et policies RBAC.
- Context7 Next.js/Hono/Colyseus et docs officielles plateforme/scanners.

## Ownership

`security/**`, configuration edge/WAF, CSP/HSTS/CORS/origin, secret scanning/rotation,
SAST/dependency/container scans, SBOM/provenance/signature et tests d'abus. L'integration CI racine
appartient a P-SEQ-07; les corrections metier retournent au lot.

## Interdit

Suppression d'un scan pour passer, exception sans proprietaire/expiration, action GitHub flottante,
secret de test ressemblant au prod, trust proxy universel ou securite seulement cote UI.

## Livrables production

- threat model acteurs/frontieres Fapshi/live/admin/support;
- trusted proxy allowlist, HSTS/CSP/frame/referrer/permissions, CORS/CSRF/Origin et payload limits;
- quotas distribues auth/API/live/checkout/webhook et protection replay/abuse;
- secret manager, rotation/revocation et break-glass audite;
- scans secrets/SAST/dependances/images, SBOM CycloneDX/SPDX, signature/provenance;
- triage PostCSS, uuid, elliptic et SLA de remediation;
- pentest interne automatise des permissions/no-leak et plan d'audit externe.
- detection/limites de multi-comptes, bots, prise de compte, velocite beneficiaire/payout, collusion et
  abus promotionnel; signaux transmis au pipeline Support avec hold et appel humain.

## Criteres d'acceptation

- header proxy/origin/IP forge ne contourne cookie, RBAC ou rate limit;
- artefact non signe ou avec vulnerabilite bloquante ne peut etre promu;
- aucun secret n'apparait dans bundle, source map, log, trace, SBOM ou artefact test;
- rotation Fapshi/provider/DB/Redis est exercee sans panne non maitrisee;
- exceptions ont proprietaire, justification, expiration et alerte.

## Tests et sortie

DAST/smoke edge, tests CSRF/origin/quota, secret canary, scans complets, verification signature/SBOM et
rotation staging. Gates lot, rapport redige et commit atomique.
