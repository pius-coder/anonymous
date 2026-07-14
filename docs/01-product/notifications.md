# Notifications

## Scope

Les annonces de preparation appartiennent au lobby d'avant-match et ne doivent pas apparaitre pendant la selection ou l'execution du mini-jeu.

## Cycle

1. Admin cree annonce.
2. Systeme cree notification.
3. Provider tente livraison.
4. UI dediee affiche annonce.
5. Statuts optionnels: creee, envoyee, distribuee, affichee, confirmee, echouee.

## Preuves legacy

- `apps/api/src/notifications/notifications.ts`
- `NotificationJob`, `DeliveryLog`, `OutboundMessage` dans `packages/db/prisma/schema.prisma`

