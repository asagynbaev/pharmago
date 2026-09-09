<script setup lang="ts">
interface Suggestion {
  slug: string
  name: string
  substance: string
  category: string
  prescription: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    size?: 'hero' | 'compact'
    /** Отправлять ли форму сразу при выборе подсказки. */
    autoNavigate?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: 'Название лекарства, например Ибупрофен',
    size: 'hero',
    autoNavigate: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'submit': [value: string]
}>()

const router = useRouter()

const query = ref(props.modelValue)
watch(() => props.modelValue, v => { query.value = v })

const open = ref(false)
const activeIndex = ref(-1)
const suggestions = ref<Suggestion[]>([])
const loading = ref(false)
const root = useTemplateRef<HTMLElement>('root')
const input = useTemplateRef<HTMLInputElement>('input')

const listId = useId()

let controller: AbortController | null = null

/** Подсказки тянем с задержкой, чтобы не дёргать сервер на каждую букву. */
const fetchSuggestions = useDebounceFn(async (value: string) => {
  if (value.trim().length < 2) {
    suggestions.value = []
    loading.value = false
    return
  }

  controller?.abort()
  controller = new AbortController()
  loading.value = true

  try {
    const data = await $fetch<{ items: Suggestion[] }>('/api/suggest', {
      query: { q: value },
      signal: controller.signal,
    })
    suggestions.value = data.items
    activeIndex.value = -1
  }
  catch (e) {
    // Отменённый запрос — не ошибка, просто пришёл более свежий ввод.
    if ((e as Error)?.name !== 'AbortError') suggestions.value = []
  }
  finally {
    loading.value = false
  }
}, 180)

watch(query, (value) => {
  emit('update:modelValue', value)
  open.value = true
  fetchSuggestions(value)
})

function submit() {
  const value = query.value.trim()
  if (!value) return
  open.value = false
  emit('submit', value)
  if (props.autoNavigate) router.push({ path: '/search', query: { q: value } })
}

function pick(item: Suggestion) {
  query.value = item.name
  open.value = false
  if (props.autoNavigate) router.push(`/medicine/${item.slug}`)
  else emit('submit', item.name)
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value || !suggestions.value.length) {
    if (event.key === 'Enter') submit()
    return
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
      break
    case 'ArrowUp':
      event.preventDefault()
      activeIndex.value
        = activeIndex.value <= 0 ? suggestions.value.length - 1 : activeIndex.value - 1
      break
    case 'Enter': {
      event.preventDefault()
      const item = suggestions.value[activeIndex.value]
      if (item) pick(item)
      else submit()
      break
    }
    case 'Escape':
      open.value = false
      activeIndex.value = -1
      break
  }
}

onClickOutside(root, () => { open.value = false })

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div ref="root" class="sb" :class="`sb--${size}`">
    <form class="sb__bar" role="search" @submit.prevent="submit">
      <svg class="sb__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>

      <input
        ref="input"
        v-model="query"
        class="sb__input"
        type="search"
        :placeholder="placeholder"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="open && suggestions.length > 0"
        :aria-controls="listId"
        :aria-activedescendant="activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined"
        aria-label="Поиск лекарства"
        @keydown="onKeydown"
        @focus="open = true"
      >

      <button class="sb__submit btn btn--primary" type="submit">Найти</button>
    </form>

    <Transition name="drop">
      <ul
        v-if="open && (suggestions.length || loading)"
        :id="listId"
        class="sb__list"
        role="listbox"
        aria-label="Подсказки"
      >
        <li v-if="loading && !suggestions.length" class="sb__loading">
          <PgLoader :size="34" label="Ищем" />
          <span>Ищем…</span>
        </li>
        <li
          v-for="(item, i) in suggestions"
          :id="`${listId}-${i}`"
          :key="item.slug"
          class="sb__item"
          :class="{ 'sb__item--active': i === activeIndex }"
          role="option"
          :aria-selected="i === activeIndex"
          @mouseenter="activeIndex = i"
          @mousedown.prevent="pick(item)"
        >
          <span class="sb__name">
            {{ item.name }}
            <span v-if="item.prescription" class="tag tag--rx">Rx</span>
          </span>
          <span class="sb__meta">{{ item.substance }}</span>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.sb {
  position: relative;
  width: 100%;
  max-width: 760px;
}

.sb__bar {
  display: flex;
  gap: 8px;
  background: #fff;
  border-radius: var(--r-pill);
  padding: 8px 8px 8px 22px;
  align-items: center;
  box-shadow: var(--shadow-xl);
}

.sb--compact .sb__bar {
  padding: 6px 6px 6px 18px;
  box-shadow: none;
}

.sb__icon {
  color: var(--ink-muted);
  flex: none;
}

.sb__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  font-size: 17px;
  padding: 12px 6px;
  background: transparent;
  color: var(--ink);
}

.sb--compact .sb__input {
  font-size: 15px;
  padding: 9px 6px;
}

/* Убираем нативный крестик Chrome — он ломает вертикальный ритм. */
.sb__input::-webkit-search-cancel-button {
  appearance: none;
}

.sb__submit {
  flex: none;
  padding: 14px 26px;
}

.sb--compact .sb__submit {
  padding: 11px 20px;
  font-size: 14px;
}

.sb__list {
  position: absolute;
  z-index: 40;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: #fff;
  border-radius: var(--r-item);
  box-shadow: var(--shadow-lg);
  max-height: 340px;
  overflow-y: auto;
}

.sb__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
}

.sb__item--active {
  background: var(--bg);
}

.sb__name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}

.sb__meta {
  font-size: 13px;
  color: var(--ink-muted);
}

.sb__loading {
  padding: 16px;
  font-size: 14px;
  color: var(--ink-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.drop-enter-active,
.drop-leave-active {
  transition: opacity 0.15s var(--ease), transform 0.15s var(--ease);
}

.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (width <= 560px) {
  .sb__bar {
    padding-left: 16px;
  }

  .sb__submit {
    padding: 12px 18px;
    font-size: 14px;
  }
}
</style>
