//@ts-nocheck
const jsonLogin = <TError = WretchError, TData = ApiResponse<UserResponse>>(wretch: Http) => {

	const mutation = async (params: { body: JsonLoginRequest }) => {
		const args = z.object({ body: JsonLoginRequestZod }).parse(params);
		const { body } = args;

		const res = await wretch.url("/portal/json_login").json(body).post().res();
		if (res) {
			const json = await res.json();
			const data = UserResponseZod.parse(json);
			return { status: res.status, data, headers: res.headers, url: res.url } as TData;
		}

		//return undefined;
	};

	return {
		mutation,
		useMutation: (options?: Omit<UseMutationOptions<TData | undefined, TError, { body: JsonLoginRequest }>, "mutationFn">) => {
			return useMutation<TData | undefined, TError, { body: JsonLoginRequest }, unknown>(mutation, options || {});
		},
	};
};

const jsonLogin1 = (wretch: Http) => {
	const mutationFunction = async (params: { body: JsonLoginRequest }): Promise<ApiResponse<UserResponse> | undefined> => {
		const args = z.object({ body: JsonLoginRequestZod }).parse(params);
		const { body } = args;

		const res = await wretch.url("/portal/json_login").json(body).post().res();
		if (res) {
			const json = await res.json();
			const data = UserResponseZod.parse(json);
			return { status: res.status, data, headers: res.headers, url: res.url } as ApiResponse<UserResponse>;
		}

		return;
	};

	return {
		mutation: mutationFunction,
		useMutation: (options?: Omit<UseMutationOptions<ApiResponse<UserResponse> | undefined, WretchError, { body: JsonLoginRequest }>, "mutationFn">) => {
			return useMutation<ApiResponse<UserResponse> | undefined, WretchError, { body: JsonLoginRequest }>(mutationFunction, options || {});
		},
	};
};
