#!/usr/bin/env node

const { runner, Logger } = require("hygen");
const path = require("path");
const { Command } = require("commander");
const enquirer = require("enquirer");
const execa = require("execa");

const defaultTemplates = path.join(__dirname, "_templates");

const program = new Command();
program
	.description("API Client generator")
	.version("0.1.8")
	.argument("<openapi-schema-json>", "path to open api schema")
	.argument("<output-dir>", "where to save the client")
	.requiredOption("-n, --name <name>", "client class name")
	.option("-m, --mode <mode>", "full or playwright", "full")
	.action((file: string, outDir: string, opts: Record<string, string>, command: typeof Command) => {
		console.log(`generating ${opts.name} in ${opts.mode} mode from ${file}...`);
		runRunner(file, outDir);
	});

program.parse(process.argv);

process.env.HYGEN_OVERWRITE = "1";

function runRunner(file: string, outDir: string) {
	const cmd = ["client", program.opts().mode, "--file", file, "--outDir", outDir, "--className", program.opts().name];
	return runner(cmd, {
		templates: defaultTemplates,
		cwd: __dirname,
		logger: new Logger(console.log.bind(console)),
		createPrompter: () => enquirer,
		exec: (action: any, body: any) => {
			const opts = body && body.length > 0 ? { input: body } : {};
			return execa.shell(action, opts);
		},
		//debug: !!process.env.DEBUG,
		debug: true,
	});
}
