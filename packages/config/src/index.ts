export {
  APP_ENVS,
  isStrictDeployEnv,
  parseAppEnv,
  resolveAppEnv,
  type AppEnv,
} from "./app-env.js";

export {
  ENV_VAR_SPECS,
  listRequiredVarNames,
  requiredVarsFor,
  type EnvVarSpec,
  type ServiceName,
  type VarRequirement,
} from "./contracts.js";

export {
  FORBIDDEN_PRODUCTION_SUBSTRINGS,
  findForbiddenDeployValue,
  scanTextForProductionLeaks,
  type GuardHit,
} from "./guards.js";

export {
  EnvValidationError,
  assertBootEnv,
  formatRequiredVarsReport,
  validateServiceEnv,
  type ValidateOptions,
  type ValidationIssue,
  type ValidationResult,
} from "./validate.js";

export const CONFIG_PACKAGE_VERSION = "0.1.0-p-seq-00" as const;
