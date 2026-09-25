import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSidebar = defineStore('sidebar', () => {
	const isSidebarCollapsed = ref(false)
	// Expanded by default: on this platform the admin-configured pages are the
	// student's main path — study with the agent, connect your own, the
	// documents — and a collapsed group hid them under «More»
	// (learning-services#310). A viewer's own choice is still remembered below.
	const isWebpagesCollapsed = ref(false)

	if (localStorage.getItem('isSidebarCollapsed')) {
		isSidebarCollapsed.value = JSON.parse(
			localStorage.getItem('isSidebarCollapsed')
		)
	}

	if (localStorage.getItem('isWebpagesCollapsed')) {
		isWebpagesCollapsed.value = JSON.parse(
			localStorage.getItem('isWebpagesCollapsed')
		)
	}

	return {
		isSidebarCollapsed,
		isWebpagesCollapsed,
	}
})
