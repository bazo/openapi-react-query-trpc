const schemaParser = require("./../../../schemaParser");
const fs = require("fs");
const path = require("path");

module.exports = {
	params: async ({ args }) => {
		const dir = process.cwd();
		let outDir = `${dir}/${args.outDir}`;

		const extname = path.extname(outDir)

		if(extname === '') {
			outDir = `${outDir}/${args.className}.ts`
		}

		const file = `${dir}/${args.file}`;
		const schemaJson = fs.readFileSync(file, "utf8"); // must be OpenAPI JSON

		const schema = JSON.parse(schemaJson);
		// biome-ignore lint/performance/noDelete: <explanation>
		delete args.file;

		const parseOutput = await schemaParser(schema);

		const data = { ...args, outDir, ...parseOutput,  };

		console.log({data})

		return data;
	},
};
