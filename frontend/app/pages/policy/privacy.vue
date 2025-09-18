<!-- pages/policy/privacy.vue -->
<script setup lang="ts">
// Privacy-specific data type
interface PrivacyData {
  idx: number
  change_dt: string
  contents: string
}

definePageMeta({
  layout: 'policy'
})

const { t, locale } = useI18n()
const { formatTDate } = useCommonUtils()
const isDropdownOpen = ref(false)
const privacyList = ref<PrivacyData[]>([])
const selectedPrivacy = ref<PrivacyData | null>(null)
const selectedIndex = ref(0)

const dynamicMinHeight = computed(() => {
  // selectedPrivacy가 null이 아닐 때만 contents 접근
  if (!selectedPrivacy.value?.contents || selectedPrivacy.value.contents.trim() === '') {
    if (isDropdownOpen.value) {
      const dropdownItemHeight = 40
      const dropdownPadding = 32
      const baseHeight = 200
      return `${(privacyList.value.length * dropdownItemHeight) + dropdownPadding + baseHeight}px`
    }
    return '200px'
  }
  return 'auto'
})

// 개인정보처리방침 상세 조회
const selectPrivacy = async (privacyIdx: number) => {
  const { data } = await usePost<PrivacyData>('policy/getPrivacyDetail', {
    idx: Number(privacyIdx),
    lang: locale.value
  })

  if (data.value?.data) {
    selectedPrivacy.value = data.value.data
    selectedIndex.value = privacyList.value.findIndex((privacy: PrivacyData) => privacy.idx === privacyIdx)
    isDropdownOpen.value = false
  } else if (data.value?.error) {
    handleApiError(data.value.error)
  }
}

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

// 개인정보처리방침 목록 조회
const loadPrivacyList = async () => {
  const { data } = await usePost<PrivacyData[]>('policy/getPrivacyList', {
    lang: locale.value,
    view_type: 'talk'
  })

  if (data.value?.data) {
    privacyList.value = data.value.data || []
    if (data.value.data && data.value.data.length > 0 && data.value.data[0]?.idx) {
      await selectPrivacy(data.value.data[0].idx)
    } else {
      selectedPrivacy.value = null
      selectedIndex.value = 0
    }
  } else if (data.value?.error) {
    handleApiError(data.value.error)
  }
}

// 언어 변경 감지
watch(() => locale.value, async () => {
  await loadPrivacyList()
})

onMounted(async () => {
  await loadPrivacyList()

  window.addEventListener('click', (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (target && !target.matches('.dropbtn')) {
      isDropdownOpen.value = false
    }
  })
})
</script>

<template>
  <div id="container" class="policy">
    <div class="cont_area">
      <div class="history">
        <span class="history_tit">{{ t('policy_tab_05') }}</span>
        <div class="dropdown">
          <button
              @click="toggleDropdown"
              id="dropdownButton"
              class="dropbtn"
              :class="{ on: isDropdownOpen }"
          >
            {{ selectedIndex === 0 ? t('policy_tab_06') + ' ' : '' }}{{ formatTDate(selectedPrivacy?.change_dt) }}{{ selectedIndex === 0 ? ' ' + t('policy_tab_07') : '' }}
          </button>
          <div
              id="myDropdown"
              class="dropdown-content"
              :class="{ show: isDropdownOpen }"
          >
            <a
                v-for="(privacy, index) in privacyList"
                :key="privacy.idx"
                href="javascript:void(0)"
                class="privacy_change_dt"
                @click="selectPrivacy(privacy.idx)"
            >
              {{ index === 0 ? t('policy_tab_06') + ' ' : '' }}{{ formatTDate(privacy.change_dt) }}{{ index === 0 ? ' ' + t('policy_tab_07') : '' }}
            </a>
          </div>
        </div>
      </div>

      <!-- 데이터가 없을 때 표시 -->
      <div v-if="!selectedPrivacy?.contents" class="policy-txt no-data" :style="{ minHeight: dynamicMinHeight }"></div>

      <!-- 데이터가 있을 때 표시 -->
      <div
          v-else
          class="policy-txt"
          id="privacy_contents"
          :style="{ minHeight: dynamicMinHeight }"
          v-html="selectedPrivacy.contents">
      </div>
    </div>
  </div>
</template>
