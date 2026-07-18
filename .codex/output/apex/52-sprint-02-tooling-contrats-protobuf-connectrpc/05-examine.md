# Step 05: Examine

**Task:** sprint 02 - tooling contrats Protobuf et ConnectRPC
**Started:** 2026-07-15T08:49:35Z

---

## Adversarial Review

## Review Inputs

- Local diff review of `docs/03-architecture/protobuf-contract-strategy.md`.
- Local diff review of `packages/contracts/src/__tests__/conventions.test.ts`.
- Parallel adversarial reviewers: security, logic, maintainability.

## Findings

| ID | Severity | Category | Location | Issue | Validity |
|---|---|---|---|---|---|
| F1 | Medium | Tooling guard | `packages/contracts/src/__tests__/conventions.test.ts` | `@connectrpc/*` and generator checks scan only root/contracts manifests, not all workspace manifests. | Real |
| F2 | Medium | Contract convention | `packages/contracts/src/__tests__/conventions.test.ts` | Enum first-value check can silently skip invalid enum bodies or lowercase/digit cases. | Real |
| F3 | Medium | Security documentation | `docs/03-architecture/protobuf-contract-strategy.md` | Endpoint gate lacks explicit server-side auth/RBAC, input validation, audit/security logging, rate/risk controls, and denial tests. | Real |
| F4 | Low | Test secrecy/noise | `packages/contracts/src/__tests__/conventions.test.ts` | Raw lockfile string assertion can print excessive file content on failure. | Real |
| F5 | Low | Test readability | `packages/contracts/src/__tests__/conventions.test.ts` | Test names use absolute paths and `ProtoFileEntry.package` is misleading/dead. | Real |
| F6 | Low | Doc clarity | `docs/03-architecture/protobuf-contract-strategy.md` | Transport section mixes future ConnectRPC target with current no-install rule and omits documented transitional Hono JSON adapters from JSON exception wording. | Real |
| F7 | Low | Proto syntax | `packages/contracts/src/__tests__/conventions.test.ts` | Proto3 syntax check uses substring matching, so a commented or malformed syntax line could pass. | Real |

## Noise

- Dynamic proto discovery is appropriate for broad convention tests.
- `__dirname` compatibility is not an issue in the current Vitest/tsconfig setup.
- The documented proto package roots align with current on-disk folders and exported package metadata after the sprint-02 doc patch.

## Step Complete

**Status:** Complete
**Findings:** 7 real, 0 unresolved uncertain
