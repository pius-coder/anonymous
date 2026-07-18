import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sprintsDir = path.join(root, "docs/06-roadmap/sprints");
const requiredSprintSections = [
  "## Objectif",
  "## User Stories Produit",
  "## Scenarios D'Acceptation Atomiques",
  "## Sources Docs Obligatoires",
  "## Preuves Legacy",
  "## UML Concernee",
  "## Pipeline Par Couche",
  "## Contrats Protobuf Et ConnectRPC",
  "## Tests Attendus",
  "## Definition Of Done",
];
const forbiddenStoryRoles = ["Agent", "API", "Game-server", "Repository", "Prisma", "ConnectRPC"];
const requiredCoverageSections = [
  "## 1. Decouvrir Une Partie Publique",
  "## 2. Creer, Configurer Et Publier Une Partie",
  "## 3. S'Inscrire Et Gérer Sa Participation",
  "## 4. Payer Une Participation",
  "## 5. Entrer En Preparation Et Se Declarer Pret",
  "## 6. Lancer Une Manche",
  "## 7. Jouer Un Mini-Jeu",
  "## 8. Finir Une Manche Et Attendre La Verification",
  "## 9. Verifier, Corriger Et Publier Les Scores",
  "## 10. Superviser Comme Admin",
  "## 11. Observer En Lecture Seule",
  "## 12. Recevoir Notifications Et Rappels",
  "## 13. Traiter Support, Compliance, Audit Et Anti-Cheat",
  "## 14. Fermer La Partie Et Preparer La Manche Suivante",
];
const issues = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function addIssue(file, message) {
  issues.push(`${file}: ${message}`);
}

function checkSprintFiles() {
  const files = readdirSync(sprintsDir)
    .filter((file) => /^\d{2}-.*\.md$/.test(file))
    .sort();

  if (files.length !== 20) {
    addIssue("docs/06-roadmap/sprints", `expected 20 sprint files, found ${files.length}`);
  }

  for (let index = 0; index < 20; index += 1) {
    const prefix = String(index).padStart(2, "0");
    if (!files.some((file) => file.startsWith(`${prefix}-`))) {
      addIssue("docs/06-roadmap/sprints", `missing sprint ${prefix}`);
    }
  }

  for (const file of files) {
    const relativePath = `docs/06-roadmap/sprints/${file}`;
    const content = read(relativePath);

    for (const section of requiredSprintSections) {
      if (!content.includes(section)) {
        addIssue(relativePath, `missing section ${section}`);
      }
    }

    if (content.includes("## User Stories Par Role")) {
      addIssue(relativePath, "uses old 'User Stories Par Role' section");
    }

    for (const role of forbiddenStoryRoles) {
      if (content.includes(`| ${role} |`)) {
        addIssue(relativePath, `forbidden technical role in story table: ${role}`);
      }
    }

    if (!/\| US-\d{2}-\d{2} \|/.test(content)) {
      addIssue(relativePath, "missing product user story rows");
    }

    if (!/\| AC-\d{2}-\d{2} \|/.test(content)) {
      addIssue(relativePath, "missing atomic acceptance scenario rows");
    }
  }
}

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function checkMarkdownLinks() {
  const docsDir = path.join(root, "docs");
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;

  for (const fullPath of walk(docsDir)) {
    const relativeFile = path.relative(root, fullPath);
    const content = readFileSync(fullPath, "utf8");
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      const href = match[1];
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("#") ||
        href.startsWith("HEAD:") ||
        href.startsWith("mailto:")
      ) {
        continue;
      }

      const [withoutHash] = href.split("#");
      if (!withoutHash || withoutHash.includes("*")) {
        continue;
      }

      const target = path.resolve(path.dirname(fullPath), withoutHash);
      if (!target.startsWith(root) || !existsSync(target)) {
        addIssue(relativeFile, `broken local link: ${href}`);
      }
    }
  }
}

checkSprintFiles();
const coveragePath = "docs/06-roadmap/use-case-coverage.md";
const coverage = read(coveragePath);
for (const section of requiredCoverageSections) {
  if (!coverage.includes(section)) {
    addIssue(coveragePath, `missing coverage section ${section}`);
  }
}
checkMarkdownLinks();

if (issues.length > 0) {
  console.error("Documentation check failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("Documentation check passed.");
