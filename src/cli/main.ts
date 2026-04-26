#!/usr/bin/env bun
import { Command } from "commander";
import { cmdInit } from "./cmdInit.js";
import { cmdRun } from "./cmdRun.js";
import { cmdExplain } from "./cmdExplain.js";
import { cmdReport } from "./cmdReport.js";

const program = new Command();

program
  .name("rulestatus")
  .description("ESLint for AI law — executable compliance testing for AI regulations")
  .version("1.0.0")
  .option("--config <path>", "Path to .rulestatus.yaml config file");

program.addCommand(cmdInit());
program.addCommand(cmdRun());
program.addCommand(cmdExplain());
program.addCommand(cmdReport());

program.parse();
