<script lang="ts">
  let { class: className = '', hoverable = false, children, ...restProps } = $props();
</script>

<div 
  class="bg-[var(--color-surface-panel)] rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] transition-all duration-150 {hoverable ? 'hover:border-[var(--color-border-focus)] hover:bg-[var(--color-surface-lift)]/80 cursor-pointer' : ''} {className}"
  {...restProps}
>
  {@render children?.()}
</div>
