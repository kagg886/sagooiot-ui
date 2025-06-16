import { Ref, ref } from 'vue'

// eslint-disable-next-line no-unused-vars
export function useLoading<T extends (...param: Parameters<T>) => Promise<void>>(
	// eslint-disable-next-line no-unused-vars
	inner: T
): {
	loading: Ref<boolean>
	// eslint-disable-next-line no-unused-vars
	doLoading: (...param: Parameters<T>) => Promise<void>
} {
	const loading = ref(false)

	return {
		loading,
		doLoading: async (...param: Parameters<T>) => {
			loading.value = true
			return inner(...param).finally(() => {
				loading.value = false
			})
		},
	}
}
