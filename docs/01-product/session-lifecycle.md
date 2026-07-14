# Session Lifecycle

## Etats

`DRAFT` -> `SCHEDULED` -> `PREPARATION_OPEN` -> `READY_TO_START` -> `ACTIVE_ROUND` -> `ROUND_RESOLVING` -> `ROUND_VERIFICATION` -> `RESULTS_PUBLISHED` -> `NEXT_ROUND_PREPARATION` -> `COMPLETED`

Etats d'echec:

- `CANCELLED`
- `ABORTED`
- `PAUSED`
- `RECOVERY_REQUIRED`

## Evenements autorises

| Evenement | Acteur | Preconditions | Transition |
|---|---|---|---|
| `schedule_party` | Admin | config minimale valide | `DRAFT` -> `SCHEDULED` |
| `open_preparation` | Admin ou worker rappel | participants attaches | `SCHEDULED` -> `PREPARATION_OPEN` |
| `mark_ready` | Joueur | participation active | readiness joueur |
| `send_announcement` | Admin | preparation ouverte | pas de changement lifecycle |
| `confirm_start` | Admin | confirmation explicite | `PREPARATION_OPEN` -> `READY_TO_START` |
| `start_round` | Admin | partie prete, manche configuree | `READY_TO_START` -> `ACTIVE_ROUND` |
| `submit_action` | Joueur | manche active, participation autorisee | pas de changement global |
| `finish_player_round` | Systeme | joueur termine | etat participant |
| `close_round` | Systeme/admin | deadline ou tous termines | `ACTIVE_ROUND` -> `ROUND_RESOLVING` |
| `enter_verification` | Systeme | resolution calculee | `ROUND_RESOLVING` -> `ROUND_VERIFICATION` |
| `publish_results` | Admin | scores verifies | `ROUND_VERIFICATION` -> `RESULTS_PUBLISHED` |
| `prepare_next_round` | Admin | resultats publies | `RESULTS_PUBLISHED` -> `NEXT_ROUND_PREPARATION` |
| `complete_party` | Admin | resultats finaux publies | `RESULTS_PUBLISHED` -> `COMPLETED` |

## Transitions interdites

- `SCHEDULED` -> `ACTIVE_ROUND` par timer.
- `ROUND_RESOLVING` -> resultats joueur publies sans `publish_results`.
- `PAUSED` -> `ACTIVE_ROUND` sans acteur admin.
- Joueur sans participation -> connexion live.

## Reconnexion

Le joueur retrouve sa participation, son statut de manche et la derniere state view autorisee. Les inputs deja soumis ne sont jamais rejoues.

