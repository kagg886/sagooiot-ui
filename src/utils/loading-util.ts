import { Ref, ref } from 'vue'

// eslint-disable-next-line no-unused-vars
export function useLoading<P extends (...param: Parameters<P>) => Promise<R>,R = void>(
	// eslint-disable-next-line no-unused-vars
	inner: P
): {
	loading: Ref<boolean>
	// eslint-disable-next-line no-unused-vars
	doLoading: (...param: Parameters<P>) => Promise<R>
} {
	const loading = ref(false)

	return {
		loading,
		doLoading: async (...param: Parameters<P>): Promise<R> => {
			loading.value = true
			return inner(...param).finally(() => {
				loading.value = false
			})
		},
	}
}
