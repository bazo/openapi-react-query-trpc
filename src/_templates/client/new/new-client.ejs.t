---
to: <%= dir %>/src/libs/apiClient.ts
---
import wretch, {WretchError} from "wretch";
import QueryStringAddon from "wretch/addons/queryString";
import * as z from "zod";
import {
	useQuery,
	UseQueryOptions,
	UseQueryResult as UseBaseQueryResult,
	useMutation,
	UseMutationOptions,
	useInfiniteQuery,
	UseInfiniteQueryOptions,
	UseInfiniteQueryResult as UseBaseInfiniteQueryResult,
	QueryClient,
	QueryFunction,
	QueryKey
} from "@tanstack/react-query";

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

interface ApiResponse<T> extends Pick<Response, 'headers' | 'url'> {
	data: T;
	status: number;
}

type UseQueryResult<TData = unknown, TError = unknown> = UseBaseQueryResult<TData, TError> & {
	key: QueryKey
	invalidate: () => Promise<void>
}

type UseInfiniteQueryResult<TData = unknown, TError = unknown> = UseBaseInfiniteQueryResult<TData, TError> & {
	key: QueryKey
	invalidate: () => Promise<void>
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
		const <%- name %> = (wretch: Http, queryClient: QueryClient) => {
			const queryFn = async (<%= h.params(opData.params.pathParams, opData.params.queryParams) %> signal?: AbortSignal | undefined)<%- h.responseTypePromise(opData.responses) %> => {
				<%- h.paramValidation(opData) %>
            	<%- h.paramsDestructure(opData) %>
				try {
					const res = await wretch.options({signal}).url(<%- h.pathToTemplateLiteral(opData.path) %>)<%- h.query(opData.params.queryParams) %>.<%= opData.method %>().res();
					<%- h.okResponses(opData.responses) %>
				} catch(e) {
					<%- h.errorResponses(opData.responses) %>
				}

				invariant(false)
			}

			return {  
       query: queryFn,
		useQuery: (<%= h.params(opData.params.pathParams, opData.params.queryParams) %> options?: Omit<UseQueryOptions<<%- h.responseType(opData.responses) %>, <%- h.TError(opData.responses) %>>, 'queryKey' | 'queryFn' >): UseQueryResult<<%- h.responseType(opData.responses) %>, <%- h.TError(opData.responses) %>> => {
			const key = <%- h.queryKey(name, opData) %>;
			const query: QueryFunction<<%- h.responseType(opData.responses) %>> = async ({meta, queryKey, pageParam, signal}) => {
				return queryFn(<%- h.paramsArg(opData) %> signal);
			}
			const invalidate = () => queryClient.invalidateQueries(key);
			const queryResult = useQuery<<%- h.responseType(opData.responses) %>, <%- h.TError(opData.responses) %>>(key, query, options || {}) as any;
			queryResult.invalidate = invalidate;
			queryResult.key = key;
			return queryResult;
		},
		useInfiniteQuery: (<%= h.params(opData.params.pathParams, opData.params.queryParams) %> options?: Omit<UseInfiniteQueryOptions<<%- h.responseType(opData.responses) %>, <%- h.TError(opData.responses) %>>, 'queryKey' | 'queryFn' >): UseInfiniteQueryResult<<%- h.responseType(opData.responses) %>, <%- h.TError(opData.responses) %>> => {
			const key = <%- h.queryKey(name, opData) %>;
			const query: QueryFunction<<%- h.responseType(opData.responses) %>> = async ({meta, queryKey, pageParam, signal}) => {
				return queryFn(<%- h.paramsArg(opData) %> signal);
			}
			const invalidate = () => queryClient.invalidateQueries(key);
			const queryResult = useInfiniteQuery<<%- h.responseType(opData.responses) %>, <%- h.TError(opData.responses) %>>(key, query, options || {}) as any;
			queryResult.invalidate = invalidate;
			queryResult.key = key;
			return queryResult;
		},
    }}
	<%# !!MUTATIONS!! %>
	<% } else { %>
		<%# h.log(opData) %>
		const <%- name %> = (wretch: Http) => {
			const mutation = async (<%= h.params(opData.params.pathParams, opData.params.queryParams, opData.requestBody) %>) => {
				<%- h.paramValidation(opData) %>
				<%- h.paramsDestructure(opData) %>

				try {
					const res = await wretch.url(<%- h.pathToTemplateLiteral(opData.path) %>)<%- h.query(opData.params.queryParams) %><%= h.payload(opData.requestBody) %>.<%= opData.method %>().res();
					<%- h.okResponses(opData.responses) %>
				} catch(e) {
					<%- h.errorResponses(opData.responses) %>
				}

				invariant(false)
        	}

			return {  
				mutation,
				useMutation: (options?: Omit<UseMutationOptions<<%- h.responseTypeUseMutation(opData.responses) %>, <%- h.TError(opData.responses) %><% if (h.args(opData.params.pathParams, opData.params.queryParams, opData.requestBody)) { %>, <%= h.args(opData.params.pathParams, opData.params.queryParams, opData.requestBody) %><% } %>>, 'mutationFn'>) => {
					return useMutation<<%- h.responseTypeUseMutation(opData.responses) %>, <%- h.TError(opData.responses) %><% if (h.args(opData.params.pathParams, opData.params.queryParams, opData.requestBody)) { %>, <%= h.args(opData.params.pathParams, opData.params.queryParams, opData.requestBody) %><% } %>>(mutation, options || {});
				}
    		}
		};
	<% } %>
<% }) %>

type Http = ReturnType<<%- className %>['createHttp']>

export class <%- className %> {
	// rome-ignore lint/suspicious/noExplicitAny: <explanation>
	private operations: Map<string, any>;

	public http: Http
	private onHttpConfigure: (wretch: Http) => Http

    <% Object.entries(operations).forEach(([name, opData]) => { %>
		<%= h.opDescription(opData) %>
        declare <%- name %>: ReturnType<typeof <%- name %>>;
    <% }) %>
	constructor(
		baseUrl: string,
		queryClient: QueryClient,
		options: Pick<RequestInit, "headers" | "credentials" | "mode"> = {},
		onHttpConfigure: <%- className %>['onHttpConfigure'] = (wretch) => wretch
	) {
		this.onHttpConfigure = onHttpConfigure
		this.operations = new Map();

 <% Object.entries(operations).forEach(([name, opData]) => { %>
        this.operations.set("<%- name %>", <%- name %>);
    <% }) %>
		

const http = this.configureHttp(baseUrl, options);
		this.http = http;
		
		// rome-ignore lint/nursery/noConstructorReturn: <explanation>
		return new Proxy(this, {
			get(target, name: string) {
				if (target.hasOwnProperty(name)) {
					//@ts-ignore
					return target[name];
				}

				return target.operations.get(name)(http, queryClient);
			},
		});
	}

    private createHttp(baseUrl: string,
		options: Pick<RequestInit, "headers" | "credentials" | "mode"> = {},) {
			return wretch(baseUrl, options).addon(QueryStringAddon)
		}

	private configureHttp(
		baseUrl: string,
		options: Pick<RequestInit, "headers" | "credentials" | "mode"> = {},
	) {
		return this.onHttpConfigure(this.createHttp(baseUrl, options));
	}

	
}
