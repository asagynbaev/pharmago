<script setup lang="ts">
/** Стек уведомлений. Монтируется один раз в layout. */
const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="toaster" role="region" aria-label="Уведомления">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          role="status"
          @click="dismiss(toast.id)"
        >
          <PgLoader
            v-if="toast.icon === 'loader'"
            :size="26"
            color="#fff"
            trail1="#7FB8FF"
            trail2="rgba(207,226,251,.6)"
            label=""
          />
          <PgMark
            v-else-if="toast.icon === 'check'"
            kind="check"
            :size="26"
            mark="#fff"
          />
          <PgMark
            v-else-if="toast.icon === 'fail'"
            kind="fail"
            :size="26"
            mark="#fff"
          />

          <div class="toast__body">
            <b class="toast__title">{{ toast.title }}</b>
            <span v-if="toast.text" class="toast__text">{{ toast.text }}</span>
          </div>

          <div v-if="toast.duration > 0" class="toast__bar">
            <i :style="{ animationDuration: `${toast.duration}ms` }" />
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toaster {
  position: fixed;
  left: 16px;
  right: 16px;
  top: 16px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  pointer-events: none;
}

.toast {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 420px;
  background: var(--night);
  color: #fff;
  border-radius: var(--r-item);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 12px 40px rgb(0 0 0 / 25%);
  cursor: pointer;
  pointer-events: auto;
}

.toast__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.toast__title {
  font-size: 16px;
  font-weight: 700;
}

.toast__text {
  font-size: 14px;
  color: var(--on-night);
}

.toast__bar {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 0;
  height: 3px;
  border-radius: 2px;
  background: rgb(255 255 255 / 15%);
  overflow: hidden;
}

.toast__bar > i {
  display: block;
  height: 100%;
  background: var(--green);
  animation: pgBarFill linear reverse both;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.35s var(--ease), transform 0.35s var(--ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-120%);
}

.toast-leave-active {
  position: absolute;
}
</style>
