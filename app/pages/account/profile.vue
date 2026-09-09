<script setup lang="ts">
const { user, updateProfile, logout } = useAuth()
const toast = useToast()

const form = reactive({
  name: user.value?.name ?? '',
  address: user.value?.address ?? '',
})

const pending = ref(false)
const errorMessage = ref('')
const shakeKey = ref(0)

const dirty = computed(
  () => form.name !== (user.value?.name ?? '') || form.address !== (user.value?.address ?? ''),
)

async function save() {
  errorMessage.value = ''
  pending.value = true
  try {
    await updateProfile({ name: form.name, address: form.address })
    toast.success('Профиль сохранён')
  }
  catch (e) {
    const err = e as { data?: { statusMessage?: string } }
    errorMessage.value = err.data?.statusMessage ?? 'Не удалось сохранить'
    shakeKey.value++
  }
  finally {
    pending.value = false
  }
}

const registeredAt = computed(() =>
  user.value
    ? new Date(user.value.createdAt).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '',
)

useSeoMeta({ title: 'Профиль' })
</script>

<template>
  <div class="page-body">
    <section class="card">
      <h2 class="h-block">Профиль</h2>

      <form class="form" @submit.prevent="save">
        <label class="row">
          <span>Имя</span>
          <input v-model="form.name" class="field" placeholder="Как к вам обращаться">
        </label>

        <label class="row">
          <span>Адрес доставки по умолчанию</span>
          <textarea
            v-model="form.address"
            class="field"
            rows="2"
            placeholder="Улица, дом, квартира, ориентир"
          />
          <small>Подставится в форму заказа — не придётся вводить каждый раз.</small>
        </label>

        <p v-if="errorMessage" :key="shakeKey" class="field-error pg-shake" role="alert">
          {{ errorMessage }}
        </p>

        <button class="btn btn--primary" type="submit" :disabled="pending || !dirty">
          <template v-if="pending">Сохраняем<PgDots /></template>
          <template v-else>Сохранить</template>
        </button>
      </form>
    </section>

    <section class="card">
      <h2 class="h-block">Номер телефона</h2>
      <div class="phone">
        <b>{{ user?.phone }}</b>
        <span class="tag tag--in">Подтверждён через WhatsApp</span>
      </div>
      <p class="muted">
        Номер — это логин, сменить его самостоятельно нельзя. Если номер
        изменился, позвоните на <a href="tel:+996312000000">+996 312 00-00-00</a>:
        оператор перенесёт брони и заказы на новый.
      </p>
      <p class="muted">Аккаунт создан {{ registeredAt }}.</p>
    </section>

    <section class="card">
      <h2 class="h-block">Данные и выход</h2>
      <p class="muted">
        Историю поиска храним 12 месяцев, данные брони — 30 дней.
        Подробности — в <NuxtLink to="/terms#privacy">политике конфиденциальности</NuxtLink>.
      </p>
      <div class="actions">
        <button class="btn btn--dark" type="button" @click="logout">Выйти из аккаунта</button>
        <a class="btn" href="mailto:hello@pharmago.kg?subject=Удаление%20аккаунта">
          Запросить удаление аккаунта
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.card {
  background: var(--surface);
  border-radius: var(--r-card);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
}

.row small {
  font-weight: 400;
  font-size: 12px;
}

.row textarea {
  resize: vertical;
  min-height: 64px;
}

.form .btn {
  align-self: flex-start;
}

.phone {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.phone b {
  font-size: 20px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
