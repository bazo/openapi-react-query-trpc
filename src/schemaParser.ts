const { parseSchema } = require("json-schema-to-zod");
const SwaggerParser = require("@apidevtools/swagger-parser");
const { generateZodClientFromOpenAPI } = require("openapi-zod-client");
const assert = require("assert");

function log(...args) {
	console.dir(...args, { depth: null });
}

function die(...args) {
	log(...args);
	process.exit();
}

function handleRef(ref) {
	return parseSchema(ref);
}

function handleContent(content) {
	const contentType = Object.keys(content)[0];

	const schema = content[contentType].schema;

	let model = null;
	let isArray = false;

	let validation = null;
	if (schema.type === "array") {
		const ref = schema.items.$ref;

		if (ref) {
			if (ref.properties) {
				validation = handleRef(ref);
			} else {
				model = ref.replace("#/components/schemas/", "");
			}
		} else {
			validation = parseSchema(content["application/json"].schema);
		}

		isArray = true;
	} else {
		const ref = schema.$ref;
		if (ref) {
			if (ref.properties) {
				validation = handleRef(ref);
			} else {
				model = ref.replace("#/components/schemas/", "");
			}
		} else {
			validation = parseSchema(content["application/json"].schema);
		}
	}

	return { contentType, model, isArray, validation };
}

function removePassthrough(text: string) {
	return text.replace(/\.passthrough\(\)/g, "");
}

/**
 *
 * @param {string} path
 * @param {Array} schemas
 * @returns
 */
function findOpSchema(method: string, path: string, schemas) {
	let lookupPath = path;

	if (path.indexOf("{") > 0) {
		const matches = path.match(/{\w+}/g) || [];
		for (const match of matches) {
			const replace = `:${match.replace("{", "").replace("}", "")}`;
			lookupPath = lookupPath.replace(match, replace);
		}
	}

	return schemas.find((schema) => schema.path === lookupPath && schema.method === method);
}

async function schemaParse(schema) {
	const models = {};

	const operations = {};

	const openApiDoc = await SwaggerParser.parse(schema);

	const schemaTypes = removePassthrough(
		await generateZodClientFromOpenAPI({
			openApiDoc,
			disableWriteToFile: true,
			templatePath: `${__dirname}/template.hbs`,
			options: {
				withDescription: true,
				defaultStatusBehavior: "auto-correct",
				//withImplicitRequiredProps: true
			},
		}),
	);

	let opSchemas = await generateZodClientFromOpenAPI({
		openApiDoc,
		disableWriteToFile: true,
		templatePath: `${__dirname}/opsSchemaTemplate.hbs`,
		options: {
			withDescription: true,
			defaultStatusBehavior: "auto-correct",
			//withImplicitRequiredProps: true
		},
	});

	opSchemas = removePassthrough(opSchemas);
	// biome-ignore lint/security/noGlobalEval: <explanation>
	opSchemas = eval(opSchemas);

	for (const [path, ops] of Object.entries(schema.paths)) {
		for (const [method, opData] of Object.entries(ops)) {
			const opSchema = findOpSchema(method, path, opSchemas);

			const paramSchema = {
				type: "object",
				properties: {},
				required: [],
			};

			const pathParams = [];
			const queryParams = [];
			if (opData.parameters) {
				for (const parameter of opData.parameters) {
					if (parameter.in === "path") {
						pathParams.push(parameter);
					}

					if (parameter.in === "query") {
						queryParams.push(parameter);
					}

					paramSchema.properties[parameter.name] = {
						...parameter.schema,
					};

					if (parameter.required === true) {
						paramSchema.required.push(parameter.name);
					}
				}
			}

			let requestBody = null;
			if (opData.requestBody) {
				//console.dir({path, opSchema, requestBody: opData.requestBody}, {depth: null})

				let model = null;
				if (opSchema) {
					const body = opSchema.parameters.find((param) => param.type === "Body");
					if (body) {
						const schema = body.schema;

						if (schema !== "z.unknown()") {
							if (schema.startsWith("z.")) {
								model = `${opData.operationId}RequestBody`;
								models[model] = body.schema;
							} else {
								model = body.schema;
							}
						}
					}
				} else {
					//log({ path, opData, opSchema });
					assert(true, "should never come here");
				}

				//process.exit()
				//const requestBody = handleContent(opData.requestBody.content);
				//log({requestBody})
				// 	if (requestBody.validation) {
				// 		//const modelName = `${opData.operationId}RequestBody`;
				// 		const modelName = `${opData.operationId}_Body`;
				// 		models[modelName] = requestBody.validation;
				// 		requestBody.model = modelName;
				// 		requestBody.validation = null;
				// 	}

				requestBody = {
					model,
				};

				if (model) {
					if (opData.requestBody.required) {
						paramSchema.required.push("body");
					}

					paramSchema.properties.body = { type: model };
				}
			}

			const responses = {};

			for (const [code, resData] of Object.entries(opData.responses)) {
				if (resData.content) {
					const { contentType /*model,*/ /*isArray*/ /* validation*/ } = handleContent(resData.content);

					//let validation = "z.any().passthrough()";
					let validation = "z.unknown()";
					let description = "";

					if (code === "200") {
						if (opSchema) {
							validation = removePassthrough(opSchema.response);
						}
						description = resData.description;
					} else if (code.startsWith("4")) {
						if (opSchema?.errors) {
							const error = opSchema.errors.find((error) => error.status.toString() === code);

							if (error) {
								validation = removePassthrough(error.schema);
								description = error.description;
							}
						} else {
							description = resData.description;
						}
					}

					responses[code] = {
						description,
						contentType,
						model: null,
						isArray: false,
						validation,
					};
				} else {
					responses[code] = {
						description: resData.description,
						contentType: null,
						model: null,
						isArray: false,
						validation: null,
					};
				}
			}

			operations[opData.operationId] = {
				path,
				method,
				params: {
					pathParams,
					queryParams,
					validation: parseSchema(paramSchema),
				},
				responses,
				requestBody,
				type: method === "get" ? "query" : "mutation",
				description: opData.description,
			};
		}
	}

	for (const [name, opData] of Object.entries(operations)) {
		for (const [code, res] of Object.entries(opData.responses)) {
			if (res.validation) {
				let modelName = res.validation;
				if (res.validation.startsWith("z.")) {
					modelName = `${name}Response${code}`;
					models[modelName] = res.validation;
				}
				res.model = modelName;
				res.validation = null;
			}
		}
	}

	return { models, operations, schemaTypes };
}
module.exports = schemaParse;
