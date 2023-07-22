const { runner } = require("hygen");
const Logger = require("hygen/dist/logger");
const path = require("path");
const { Command } = require("commander");
// const { Rome, Distribution } = require("@rometools/js-api");
// const fs = require("fs");

const defaultTemplates = path.join(__dirname, "_templates");

const program = new Command();
program
	.description("API Client generator")
	.version("0.8.0")
	.argument("<openapi-schema-json>", "path to open api schema")
	.requiredOption("-n, --name <name>", "client class name")
	.action(async (file) => {
		console.log("generating client...");
		const res = await runRunner(file);
		// if (res.success) {
		// 	const rome = await Rome.create({
		// 		distribution: Distribution.NODE, // Or BUNDLER / WEB depending on the distribution package you've installed

		// 	});

		// 	res.actions.forEach(async (action) => {
		// 		const content = fs.readFileSync(action.subject, "utf8");
		// 		const formatted = await rome.formatContent(content, {
		// 			filePath: action.subject,
					
		// 		});

		// 		fs.writeFile(action.subject, formatted.content);
		// 	});
		// }
	});

program.parse(process.argv);

process.env["HYGEN_OVERWRITE"] = 1;

function runRunner(file) {
	return runner(["client", "new", "--file", file, "--className", program.opts().name], {
		templates: defaultTemplates,
		//cwd: process.cwd(),
		cwd: __dirname,
		logger: new Logger.default(console.log.bind(console)),
		createPrompter: () => require("enquirer"),
		exec: (action, body) => {
			const opts = body && body.length > 0 ? { input: body } : {};
			return require("execa").shell(action, opts);
		},
		//debug: !!process.env.DEBUG,
		debug: true,
	});
}
