const schemaParser = require("./../../../schemaParser");
const fs = require("fs");

module.exports = {
	params: async ({ args }) => {
		const dir = process.cwd();

		const file = `${dir}/${args.file}`;
		const schemaJson = fs.readFileSync(file, "utf8"); // must be OpenAPI JSON

		const schema = JSON.parse(schemaJson);
		delete args.file;

		const parseOutput = await schemaParser(schema)

		const data = { dir, ...parseOutput, ...args };

		return data
	},
};
