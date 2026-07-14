# Data Model

## Concepts cibles

- `User`
- `Player`
- `AdminRole`
- `Party`
- `PartyParticipation`
- `LobbyState`
- `Round`
- `MiniGameDefinition`
- `GameSessionRuntime`
- `RealtimeConnection`
- `ReadinessState`
- `ProvisionalScore`
- `PublishedScore`
- `Announcement`
- `PushNotification`

## Gap legacy

`SessionRegistration` combine inscription, paiement, check-in et entree room. La cible ajoute `PartyParticipation` pour les droits et etats de participation live.

## Regle

Les contrats Protobuf exposent des vues reseau. Ils ne sont pas les modeles Prisma.

