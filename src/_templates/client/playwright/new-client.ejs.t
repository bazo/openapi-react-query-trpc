---
to: <%= outDir %>
---
import * as z from "zod";
import type {  APIRequestContext } from "@playwright/test";

const defaultOptions = {
	failOnStatusCode: true
}

interface ExtraOptions {
	signal?: AbortSignal | undefined;
}

type RequestOptionsMap = {
	get: Parameters<APIRequestContext["get"]>[1];
	post: Parameters<APIRequestContext["post"]>[1];
	put: Parameters<APIRequestContext["put"]>[1];
	delete: Parameters<APIRequestContext["delete"]>[1];
	patch: Parameters<APIRequestContext["patch"]>[1];
	head: Parameters<APIRequestContext["head"]>[1];
};

// Create a generic type to retrieve the request options type based on the HTTP method
type GetRequestOptions<Method extends keyof RequestOptionsMap> = Exclude<RequestOptionsMap[Method] & ExtraOptions, "failOnStatusCode" | "params" | "data" >;

const isProduction: boolean = process.env.NODE_ENV === 'production';
const invariantPrefix: string = 'Invariant failed';

// Throw an error if the condition fails
// Strip out error messages for production
// > Not providing an inline default argument for message as the result is smaller
function invariant(
  condition: any,
  // Can provide a string, or a function that returns a string for cases where
  // the message takes a fair amount of effort to compute
  message?: string | (() => string),
): asserts condition {
  if (condition) {
    return;
  }
  // Condition not passed

  // In production we strip the message but still throw
  if (isProduction) {
    throw new Error(invariantPrefix);
  }

  // When not in production we allow the message to pass through
  // *This block will be removed in production builds*

  const provided: string | undefined = typeof message === 'function' ? message() : message;

  // Options:
  // 1. message provided: `${invariantPrefix}: ${provided}`
  // 2. message not provided: invariantPrefix
  const value: string = provided ? `${invariantPrefix}: ${provided}` : invariantPrefix;
  throw new Error(value);
}

function error(err: unknown): WretchError {
	return err as WretchError
}

type ErrorRecord = Record<string, string>;

interface GenericWretchError<T = ErrorRecord> extends WretchError {
	json: T;
}

export function toApiError<T extends ErrorRecord>(error: unknown): GenericWretchError<T> {
	return error as GenericWretchError<T>
}

export interface ApiResponse<T> extends Pick<Response, 'url'> {
	data: T;
	status: number;
	headers: {
		[key: string]: string;
	};
}



<%- schemaTypes %>

<% /* %>  <% */ %>
 <% Object.entries(models).forEach(([name, validation]) => { %>
     const <%- name %> =  <%- validation %>;
     export type <%- name %> = z.infer<typeof <%- name %>>
 <% }) %>



<% Object.entries(operations).forEach(([name, opData]) => { %>

	<%# !!QUERIES!! %>
	<% if(opData.type === 'query') { %>
		const <%- name %> = (request: APIRequestContext) => async (<%= h.params(opData.params.pathParams, opData.params.queryParams) %> options?: GetRequestOptions<'<%= opData.method %>'>)<%- h.responseTypePromise(opData.responses) %> => {
				<%- h.paramValidation(opData) %>
            	<%- h.paramsDestructure(opData) %>
				try {
					const res = await request.<%= opData.method %>(<%- h.pathToTemplateLiteral(opData.path) %>, {
						...defaultOptions,
						...options,
						<%- h.queryPlaywright(opData.params.queryParams) %>
					});
					<%- h.okResponsesPlaywright(opData.responses) %>
				} catch(e) {
					<%- h.errorResponses(opData.responses) %>
				}

				invariant(false)
			}

			
    
	<%# !!MUTATIONS!! %>
	<% } else { %>
		<%# h.log(opData) %>
		const <%- name %> = (request: APIRequestContext) => async (<%= h.params(opData.params.pathParams, opData.params.queryParams, opData.requestBody) %> options?: GetRequestOptions<'<%= opData.method %>'>) => {
				<%- h.paramValidation(opData) %>
				<%- h.paramsDestructure(opData) %>

				try {
					const res = await request.<%= opData.method %>(<%- h.pathToTemplateLiteral(opData.path) %>, {
						...defaultOptions,
						...options,
						<%- h.queryPlaywright(opData.params.queryParams) %>
						<%= h.payloadPlaywright(opData.requestBody) %>
					});
					<%- h.okResponsesPlaywright(opData.responses) %>
				} catch(e) {
					<%- h.errorResponses(opData.responses) %>
				}

				invariant(false)
        	}
	<% } %>
<% }) %>

export class <%- className %> {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	private operations: Map<string, any>;
	private request: APIRequestContext;

    <% Object.entries(operations).forEach(([name, opData]) => { %>
		<%= h.opDescription(opData) %>
        declare <%- name %>: ReturnType<typeof <%- name %>>;
    <% }) %>
	constructor(
		request: APIRequestContext,
	) {
		this.request = request;
		this.operations = new Map();

 <% Object.entries(operations).forEach(([name, opData]) => { %>
        this.operations.set("<%- name %>", <%- name %>);
    <% }) %>
		

		// eslint-disable-next-line
		// biome-ignore lint/correctness/noConstructorReturn: <explanation>
		return new Proxy(this, {
			get(target, name: string) {
				// eslint-disable-next-line
				// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
				if (target.hasOwnProperty(name)) {
					//@ts-ignore
					return target[name];
				}

				return target.operations.get(name)(this.request);
			},
		});
	}


	
}
