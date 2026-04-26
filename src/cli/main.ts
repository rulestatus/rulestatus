#!/usr/bin/env bun
import { Command } from "commander";
import { cmdBundle } from "./cmdBundle.js";
import { cmdExplain } from "./cmdExplain.js";
import { cmdGenerate } from "./cmdGenerate.js";
import { cmdInit } from "./cmdInit.js";
import { cmdReport } from "./cmdReport.js";
import { cmdRun } from "./cmdRun.js";

const program = new Command();

program
  .name("rulestatus")
  .description("ESLint for AI law — executable compliance testing for AI regulations")
  .version("1.0.0")
  .option("--config <path>", "Path to .rulestatus.yaml config file");

program.addCommand(cmdInit());
program.addCommand(cmdRun());
program.addCommand(cmdGenerate());
program.addCommand(cmdExplain());
program.addCommand(cmdReport());
program.addCommand(cmdBundle());

program.parse();
