function schemaTypeToTS(param) {
	const type = param.schema.type;
	switch (type) {
		case "integer":
			return "number";
		case "string":
			return "string";
		case "array": {
			if (param.schema.items.$ref) {
				const type = param.schema.items.$ref.replace(
					"#/components/schemas/",
					""
				);
				return `${type}[]`;
			}
			return `${param.schema.items.type}[]`;
		}
		default:
			return type;
	}
}

function args(pathArgs, queryArgs, requestBody) {
	const params = [...pathArgs, ...queryArgs];
	if (params.length === 0 && !requestBody) {
		return "";
	}

	let code = "{";
	for (const param of params) {
		code += `${param.name}${param.required ? "" : "?"}: ${schemaTypeToTS(
			param
		)},`;
	}

	if (requestBody) {
		if (requestBody.model) {
			code += `body: ${requestBody.model},`;
		}
	}

	code += "}";

	if (code === "{}") {
		return "void";
	}

	return code;
}

function processErrorResponses(responses) {
	let code = "const err = error(e);\n";

	let needsJson = false;
	const map = {};

	for (const [resCode, response] of responses) {
		let validation = null;

		if (response.model) {
			//validation = `${response.model}Zod`;
			validation = `${response.model}`;
		}

		if (response.validation) {
			validation = response.validation;
		}

		if (validation) {
			needsJson = true;
		}

		map[resCode] = validation;
	}

	if (needsJson) {
		code += "const json = err.json;\n";
	}

	if (responses.length > 0) {
		code += "switch(err.status) {\n";

		for (const [resCode, response] of responses) {
			code += `case ${resCode}: {\n`;

			const validation = map[resCode];

			if (validation) {
				code += `
				err.json = ${validation}.parse(json);
				`;
			} else {
			}

			code += "break;\n}\n";
		}

		code += "}\n";
	}
	code += "throw err;\n";
	return code;
}

function processOkResponses(responses) {
	let code = "";

	let needsJson = false;
	const map = {};

	for (const [resCode, response] of responses) {
		let validation = null;

		if (response.model) {
			//validation = `${response.model}Zod`;
			validation = `${response.model}`;
		}

		if (response.validation) {
			validation = response.validation;
		}

		if (validation) {
			needsJson = true;
		}

		map[resCode] = validation;
	}

	if (needsJson) {
		code += "const json = await res.json();\n";
	}

	if (responses.length > 0) {
		code += "switch(res.status) {\n";

		for (const [resCode, response] of responses) {
			code += `case ${resCode}: {\n`;

			const validation = map[resCode];

			if (validation) {
				code += `const data = ${validation}.parse(json);\n`;
				code +=
					"return {status: res.status, data, headers: res.headers, url: res.url};\n";
			} else {
				code +=
					"return {status: res.status, data: null, headers: res.headers, url: res.url};\n";
			}

			code += "}\n";
		}

		code += "}\n";
	}

	return code;
}

function processOkResponsesPlaywright(responses) {
	let code = "";

	let needsJson = false;
	const map = {};

	for (const [resCode, response] of responses) {
		let validation = null;

		if (response.model) {
			//validation = `${response.model}Zod`;
			validation = `${response.model}`;
		}

		if (response.validation) {
			validation = response.validation;
		}

		if (validation) {
			needsJson = true;
		}

		map[resCode] = validation;
	}

	if (needsJson) {
		code += "const json = await res.json();\n";
	}

	if (responses.length > 0) {
		code += "switch(res.status()) {\n";

		for (const [resCode, response] of responses) {
			code += `case ${resCode}: {\n`;

			const validation = map[resCode];

			if (validation) {
				code += `const data = ${validation}.parse(json);\n`;
				code +=
					"return {status: res.status(), data, headers: res.headers(), url: res.url()};\n";
			} else {
				code +=
					"return {status: res.status(), data: null, headers: res.headers(), url: res.url()};\n";
			}

			code += "}\n";
		}

		code += "}\n";
	}

	return code;
}

function hasParams(opData) {
	return (
		[...opData.params.pathParams, ...opData.params.queryParams].length > 0
	);
}

function responseTypeMutation(responses) {
	const res = Object.entries(responses)
		.filter(([code, res]) => {
			return code.startsWith("2");
		})
		.map(([code, res]) => ({ model: res.model, isArray: res.isArray }))
		.map(({ model, isArray }) => {
			if (isArray) {
				return `${model}[]`;
			}
			return model;
		})
		.filter((value) => value !== null);

	return `ApiResponse<${res.join(" | ") || "null"}>`;
}

function responseTypeUseMutation(responses) {
	const res = Object.entries(responses)
		.filter(([code, res]) => {
			return code.startsWith("2");
		})
		.map(([code, res]) => ({ model: res.model, isArray: res.isArray }))
		.map(({ model, isArray }) => {
			if (isArray) {
				return `${model}[]`;
			}
			return model;
		})
		.filter((value) => value !== null);

	return `ApiResponse<${res.join(" | ") || "null"}> | undefined`;
}

function responseType(responses) {
	const res = Object.entries(responses)
		.filter(([code, res]) => {
			return code.startsWith("2");
		})
		.map(([code, res]) => ({ model: res.model, isArray: res.isArray }))
		.map(({ model, isArray }) => {
			if (isArray) {
				return `${model}[]`;
			}
			return model;
		})
		.filter((value) => value !== null);

	//return `ApiResponse<${res.join(" | ") || "null"}> | undefined`;
	return `ApiResponse<${res.join(" | ") || "null"}>`;
}

function TError(responses) {
	const res = Object.entries(responses)
		.filter(([code, res]) => {
			return !code.startsWith("2");
		})
		.map(([code, res]) => ({ model: res.model, isArray: res.isArray }))
		.map(({ model, isArray }) => {
			if (isArray) {
				return `${model}[]`;
			}
			return model;
		})
		.filter((value) => value !== null);

	return `GenericWretchError<${res.join(" | ") || "null"}>`;
}

module.exports = {
	helpers: {
		log: console.log,
		args,
		queryKey: (name, opData) => {
			const params = [
				...opData.params.pathParams,
				...opData.params.queryParams,
			];
			if (params.length === 0) {
				return `["${name}", ...(options?.queryKey || [])]`;
			}

			return `["${name}", params, ...(options?.queryKey || [])]`;
		},
		params: (pathArgs, queryArgs, requestBody) => {
			const params = [...pathArgs, ...queryArgs];
			if (params.length === 0 && !requestBody) {
				return "";
			}

			const argString = args(pathArgs, queryArgs, requestBody);

			if (argString === "{}") {
				return "";
			}

			if (argString === "void") {
				return "";
			}

			return `params: ${argString},`;
		},
		requestBody: (requestBody) => {
			if (!requestBody) {
				return "";
			}

			return `body: ${requestBody.model}`;
		},
		hasParams,
		paramsArg: (opData) => {
			if (hasParams(opData)) {
				return "params, ";
			}

			return "";
		},
		paramValidation: (opData) => {
			const params = [
				...opData.params.pathParams,
				...opData.params.queryParams,
			];

			if (opData.requestBody) {
				//opData.params.validation = opData.params.validation.replace('"body":z.any()', `"body":${opData.requestBody.model}Zod`);
				opData.params.validation = opData.params.validation.replace(
					'"body":z.any()',
					`"body":${opData.requestBody.model}`
				);
			}

			if (params.length === 0 && !opData.requestBody) {
				return "";
			}

			if (opData.params.validation === "z.object({})") {
				return "";
			}

			return `const args = ${opData.params.validation}.parse(params);`;
		},
		paramsDestructure: (opData) => {
			const params = [
				...opData.params.pathParams,
				...opData.params.queryParams,
			];

			if (opData.requestBody) {
				if (opData.requestBody.model) {
					params.push({ name: "body" });
				}
			}

			if (params.length === 0) {
				return "";
			}

			const paramsMap = params.map(({ name }) => name).join(",");

			return `const  {${paramsMap}} = args;`;
		},
		query: (queryParams) => {
			if (queryParams.length === 0) {
				return "";
			}

			return `.query(qs.stringify({${queryParams
				.map(({ name }) => name)
				.join(",")}}))`;
		},
		queryPlaywright: (queryParams) => {
			if (queryParams.length === 0) {
				return "";
			}

			return `params: {${queryParams
				.map(({ name }) => name)
				.join(",")}},`;
		},
		queryParams: (queryParams, signal = true) => {
			let out = "";
			if (queryParams.length === 0) {
				return out;
			}
			out = `{${queryParams.map(({ name }) => name).join(",")}}`;

			if (signal) {
				out += ",";
			}

			return out;
		},
		/**
		 *
		 * @param {string} path
		 * @returns
		 */
		pathToTemplateLiteral: (path) => {
			const replacedPath = path.replaceAll("{", "${");
			if (path.includes("{")) {
				//return "`" + replacedPath + "`";
				return `\`${replacedPath}\``;
			}
			return `"${replacedPath}"`;
		},
		responseOk: (responses) => {
			const response = responses["200"];
			if (!response) {
				return "";
			}
			let validation = "";

			if (response.model) {
				//validation = `${response.model}Zod`;
				validation = `${response.model}`;
			}

			if (response.validation) {
				validation = response.validation;
			}

			if (validation === "") {
				return "return {status: res.status, data: null, headers: res.headers, url: res.url}";
			}

			let code = "const json = await res.json();\n";

			if (response.isArray) {
				code += `const data = z.array(${validation}).parse(json);\n`;
			} else {
				code += `const data = ${validation}.parse(json);\n`;
			}

			code +=
				"return {status: res.status, data, headers: res.headers, url: res.url}";

			return code;
		},
		okResponses: (responses) => {
			const errorResponses = Object.entries(responses).filter(
				([code, response]) => code.startsWith("2")
			);
			return processOkResponses(errorResponses);
		},
		okResponsesPlaywright: (responses) => {
			const errorResponses = Object.entries(responses).filter(
				([code, response]) => code.startsWith("2")
			);
			return processOkResponsesPlaywright(errorResponses);
		},
		errorResponses: (responses) => {
			const errorResponses = Object.entries(responses).filter(
				([code, response]) => code.startsWith("4")
			);
			return processErrorResponses(errorResponses);
		},
		responseTypePromise: (responses) => {
			return `:Promise<${responseType(responses) || "null"}>`;
		},
		responseType: (responses) => {
			return responseType(responses) || "null";
		},
		responseTypeMutation: (responses) => {
			return responseTypeMutation(responses) || "null";
		},
		responseTypeUseMutation: (responses) => {
			return responseTypeUseMutation(responses) || "null";
		},
		opDescription: (opData) => {
			if (opData.description) {
				return `/**
				${opData.description}
			*/`;
			}
			return "";
		},
		payload: (requestBody) => {
			if (!requestBody) {
				return "";
			}

			if (!requestBody.model) {
				return "";
			}

			return ".json(body)";
		},
		payloadPlaywright: (requestBody) => {
			if (!requestBody) {
				return "";
			}

			if (!requestBody.model) {
				return "";
			}

			return "data: body,";
		},
		TError,
	},
};
