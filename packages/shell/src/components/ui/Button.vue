<script lang="ts">
import { Fragment, Text, defineComponent, h, type PropType, type VNode } from 'vue'
import { cn } from '@/lib/cn'
import { buttonVariants, type ButtonVariants } from './button-variants'

// Plain text inside the button gets 2px of horizontal padding (codeva's `wrapLabels`), so labels
// sit correctly next to icons.
function wrapLabels(nodes: VNode[]): VNode[] {
  return nodes.flatMap((n) => {
    if (n.type === Fragment && Array.isArray(n.children)) return wrapLabels(n.children as VNode[])
    if (n.type === Text && String(n.children).trim() !== '') return [h('span', { class: 'px-0.5' }, n.children as string)]
    return [n]
  })
}

export default defineComponent({
  name: 'Button',
  inheritAttrs: false,
  props: {
    variant: String as PropType<ButtonVariants['variant']>,
    size: String as PropType<ButtonVariants['size']>,
    /** Render as another element, for example `a`. */
    as: { type: String, default: 'button' },
  },
  setup(props, { slots, attrs }) {
    return () =>
      h(
        props.as,
        {
          type: props.as === 'button' ? 'button' : undefined,
          'data-slot': 'button',
          'data-variant': props.variant ?? 'default',
          'data-size': props.size ?? 'default',
          ...attrs,
          class: cn(buttonVariants({ variant: props.variant, size: props.size }), attrs.class as string),
        },
        wrapLabels(slots.default?.() ?? []),
      )
  },
})
</script>
