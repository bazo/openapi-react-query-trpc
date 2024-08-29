#!/usr/bin/env node

const { runner } = require("hygen");
const Logger = require("hygen/dist/logger");
const path = require("path");
const { Command } = require("commander");
const enquirer = require("enquirer")
const execa = require("execa")
// const fs = require("fs");

const defaultTemplates = path.join(__dirname, "_templates");

const program = new Command();
program
	.description("API Client generator")
	.version("0.1.8")
	.argument("<openapi-schema-json>", "path to open api schema")
	.argument("<output-dir>", "where to save the client")
	.requiredOption("-n, --name <name>", "client class name")
	.option("-m, --mode <mode>", "full or short")
	.action(async (file: string, outDir: string) => {
		console.log("generating client...");
		const res = await runRunner(file, outDir);
	});

program.parse(process.argv);

process.env.HYGEN_OVERWRITE = "1";

function runRunner(file: string, outDir: string) {
	return runner(["client", "new", "--file", file, "--outDir", outDir, "--className", program.opts().name], {
		templates: defaultTemplates,
		cwd: __dirname,
		logger: new Logger.default(console.log.bind(console)),
		createPrompter: () => enquirer,
		exec: (action, body) => {
			const opts = body && body.length > 0 ? { input: body } : {};
			return execa.shell(action, opts);
		},
		//debug: !!process.env.DEBUG,
		debug: true,
	});
}
