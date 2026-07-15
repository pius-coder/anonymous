# UML Architecture Index

Les diagrammes sont decoupes par question d'architecture. Une fiche sprint doit lier les diagrammes
qu'elle lit ou modifie.

## Diagrammes

- [Contexte systeme et dependances](uml/context-system.md)
- [Domaines et modele conceptuel](uml/domains.md)
- [Machines d'etat](uml/state-machines.md)
- [Sequences produit](uml/sequences.md)
- [Permissions](uml/permissions.md)
- [Data flow](uml/data-flow.md)
- [Realtime flow](uml/realtime-flow.md)
- [Scoring et publication](uml/scoring-publication.md)

## Regles

- Modifier une transition implique `state-machines.md`.
- Modifier une commande utilisateur implique `sequences.md`.
- Modifier une audience ou un role implique `permissions.md`.
- Modifier un message, une projection ou une persistence implique `data-flow.md`.
- Modifier live/reconnect/snapshot implique `realtime-flow.md`.
- Modifier score provisoire, correction ou publication implique `scoring-publication.md`.
