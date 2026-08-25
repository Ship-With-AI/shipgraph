import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import LiveDemo from '../../components/LiveDemo.vue';
import './custom.css';

// Register the live demo component globally so any markdown page can embed it
// with `<ClientOnly><LiveDemo /></ClientOnly>`.
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('LiveDemo', LiveDemo);
  },
} satisfies Theme;
