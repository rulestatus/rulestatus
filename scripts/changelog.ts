#!/usr/bin/env bun
// Generates CHANGELOG.md from conventional commits.
// Usage: bun scripts/changelog.ts
// Groups commits by version tag, then by type. Unreleased commits appear at the top.

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const OUTPUT = resolve(import.meta.dir, "../CHANGELOG.md");

const SECTION_TITLES: Record<string, string> = {
  feat: "Features",
  fix: "Bug Fixes",
  perf: "Performance",
  refactor: "Refactoring",
  docs: "Documentation",
  build: "Build",
  ci: "CI",
  test: "Tests",
  chore: "Chores",
  revert: "Reverts",
};

// Types shown in the changelog (ordered). Types not in this list are silently dropped.
const VISIBLE_TYPES = ["feat", "fix", "perf", "refactor", "docs", "build", "ci", "revert"];

interface Commit {
  hash: string;
  type: string;
  scope: string | null;
  breaking: boolean;
  subject: string;
}

function git(cmd: string): string {
  return execSync(`git ${cmd}`, { encoding: "utf-8" }).trim();
}

function tags(): string[] {
  try {
    return git("tag --sort=-version:refname")
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => /^v?\d+\.\d+/.test(t));
  } catch {
    return [];
  }
}

function tagDate(tag: string): string {
  try {
    return git(`log -1 --format=%as "${tag}"`);
  } catch {
    return "";
  }
}

function commitsBetween(from: string | null, to: string): Commit[] {
  const range = from ? `${from}..${to}` : to;
  let log: string;
  try {
    log = git(`log ${range} --format="%H\x1f%s" --no-merges`);
  } catch {
    return [];
  }
  if (!log) return [];

  return log
    .split("\n")
    .map((line) => {
      const [hash = "", subject = ""] = line.split("\x1f");
      return parseCommit(hash.trim(), subject.trim());
    })
    .filter((c): c is Commit => c !== null);
}

function parseCommit(hash: string, subject: string): Commit | null {
  // Conventional commits: type(scope)!: description
  const match = subject.match(/^([a-z]+)(\([^)]+\))?(!)?: (.+)$/);
  if (!match) return null;
  const [, type = "", scopeRaw, breaking, description = ""] = match;
  return {
    hash: hash.slice(0, 7),
    type,
    scope: scopeRaw ? scopeRaw.slice(1, -1) : null,
    breaking: breaking === "!" || subject.includes("BREAKING CHANGE"),
    subject: description,
  };
}

function renderSection(commits: Commit[], type: string): string {
  const filtered = commits.filter((c) => c.type === type);
  if (!filtered.length) return "";
  const title = SECTION_TITLES[type] ?? type;
  const lines = filtered.map((c) => {
    const scope = c.scope ? `**${c.scope}:** ` : "";
    const breaking = c.breaking ? " ⚠ BREAKING" : "";
    return `- ${scope}${c.subject} (\`${c.hash}\`)${breaking}`;
  });
  return `### ${title}\n\n${lines.join("\n")}\n`;
}

function renderRelease(version: string, date: string, commits: Commit[]): string {
  const breaking = commits.filter((c) => c.breaking);
  const visible = commits.filter((c) => VISIBLE_TYPES.includes(c.type));

  if (!visible.length && !breaking.length) return "";

  const header =
    version === "Unreleased"
      ? `## [Unreleased]\n`
      : `## [${version}] — ${date}\n`;

  const breakingSection =
    breaking.length > 0
      ? `### ⚠ Breaking Changes\n\n${breaking.map((c) => `- ${c.subject} (\`${c.hash}\`)`).join("\n")}\n\n`
      : "";

  const typeSections = VISIBLE_TYPES.map((t) => renderSection(visible, t))
    .filter(Boolean)
    .join("\n");

  return `${header}\n${breakingSection}${typeSections}`;
}

function generate(): void {
  const allTags = tags();
  const sections: string[] = [];

  // Unreleased: HEAD since last tag (or all commits if no tags)
  const latestTag = allTags[0] ?? null;
  const unreleased = commitsBetween(latestTag, "HEAD");
  const unreleasedSection = renderRelease("Unreleased", "", unreleased);
  if (unreleasedSection) sections.push(unreleasedSection);

  // Tagged releases (newest first)
  for (let i = 0; i < allTags.length; i++) {
    const tag = allTags[i]!;
    const prev = allTags[i + 1] ?? null;
    const commits = commitsBetween(prev, tag);
    const section = renderRelease(tag, tagDate(tag), commits);
    if (section) sections.push(section);
  }

  const today = new Date().toISOString().split("T")[0];
  const header = `# Changelog\n\nAll notable changes to Rulestatus are documented here.\nFormat follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).\nCommits follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).\n\n<!-- Generated ${today} — do not edit manually. Run: bun changelog -->\n\n`;

  const output = header + sections.join("\n---\n\n");
  writeFileSync(OUTPUT, output, "utf-8");
  console.log(`CHANGELOG.md written (${sections.length} release section(s))`);
}

generate();
