export const css = `
html {
  scroll-behavior: smooth;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
}

:root {
  --fuwari-radius-large: 1rem;
  --fuwari-content-delay: 150ms;
  --fuwari-hue: 250;
  --fuwari-page-width: 75rem;
  --fuwari-toc-width: calc((100vw - var(--fuwari-page-width)) / 2 - 1rem);

  /* Light mode (Exact flare-stack-blog Fuwari OKLCH variables) */
  --fuwari-primary: oklch(0.7 0.14 var(--fuwari-hue));
  --fuwari-primary-hover: oklch(0.65 0.14 var(--fuwari-hue));
  --fuwari-primary-active: oklch(0.6 0.14 var(--fuwari-hue));
  --fuwari-page-bg: oklch(0.95 0.01 var(--fuwari-hue));
  --fuwari-card-bg: white;
  --fuwari-btn-content: oklch(0.55 0.12 var(--fuwari-hue));
  --fuwari-btn-regular-bg: oklch(0.95 0.025 var(--fuwari-hue));
  --fuwari-btn-regular-bg-hover: oklch(0.9 0.05 var(--fuwari-hue));
  --fuwari-btn-regular-bg-active: oklch(0.85 0.08 var(--fuwari-hue));
  --fuwari-btn-plain-bg-hover: oklch(0.95 0.025 var(--fuwari-hue));
  --fuwari-btn-plain-bg-active: oklch(0.98 0.01 var(--fuwari-hue));
  --fuwari-enter-btn-bg: var(--fuwari-btn-regular-bg);
  --fuwari-enter-btn-bg-hover: var(--fuwari-btn-regular-bg-hover);
  --fuwari-enter-btn-bg-active: var(--fuwari-btn-regular-bg-active);
  --fuwari-meta-divider: rgba(0, 0, 0, 0.2);
  --fuwari-selection-bg: oklch(0.9 0.05 var(--fuwari-hue));
  --fuwari-inline-code-bg: var(--fuwari-btn-regular-bg);
  --fuwari-inline-code-color: var(--fuwari-btn-content);
  --fuwari-input-bg: rgba(0, 0, 0, 0.07);
  --fuwari-input-border: rgba(0, 0, 0, 0.1);
  --fuwari-toc-btn-hover: oklch(0.926 0.015 var(--fuwari-hue));
  --fuwari-toc-btn-active: oklch(0.9 0.015 var(--fuwari-hue));
  --fuwari-link-underline: oklch(0.8 0.08 var(--fuwari-hue));
  --fuwari-link-hover: var(--fuwari-primary);
}

.dark {
  --fuwari-primary: oklch(0.75 0.14 var(--fuwari-hue));
  --fuwari-primary-hover: oklch(0.8 0.14 var(--fuwari-hue));
  --fuwari-primary-active: oklch(0.85 0.14 var(--fuwari-hue));
  --fuwari-page-bg: oklch(0.16 0.014 var(--fuwari-hue));
  --fuwari-card-bg: oklch(0.23 0.015 var(--fuwari-hue));
  --fuwari-btn-content: oklch(0.75 0.1 var(--fuwari-hue));
  --fuwari-btn-regular-bg: oklch(0.33 0.035 var(--fuwari-hue));
  --fuwari-btn-regular-bg-hover: oklch(0.38 0.04 var(--fuwari-hue));
  --fuwari-btn-regular-bg-active: oklch(0.43 0.045 var(--fuwari-hue));
  --fuwari-btn-plain-bg-hover: oklch(0.3 0.035 var(--fuwari-hue));
  --fuwari-btn-plain-bg-active: oklch(0.27 0.025 var(--fuwari-hue));
  --fuwari-meta-divider: rgba(255, 255, 255, 0.2);
  --fuwari-selection-bg: oklch(0.4 0.08 var(--fuwari-hue));
  --fuwari-inline-code-bg: var(--fuwari-btn-regular-bg);
  --fuwari-inline-code-color: var(--fuwari-btn-content);
  --fuwari-input-bg: rgba(255, 255, 255, 0.05);
  --fuwari-input-border: rgba(255, 255, 255, 0.1);
  --fuwari-toc-btn-hover: oklch(0.22 0.02 var(--fuwari-hue));
  --fuwari-toc-btn-active: oklch(0.25 0.02 var(--fuwari-hue));
  --fuwari-link-underline: oklch(0.45 0.08 var(--fuwari-hue));
  --fuwari-link-hover: var(--fuwari-primary);
}

body {
  margin: 0;
  background-color: var(--fuwari-page-bg);
  color: rgb(0 0 0 / 0.9);
  transition: background-color 0.3s, color 0.3s;
}

.dark body {
  color: rgb(255 255 255 / 0.9);
}

/* ==========================================
   Fuwari Component Classes
   ========================================== */
.fuwari-card-base {
  border-radius: var(--fuwari-radius-large);
  overflow: hidden;
  background-color: var(--fuwari-card-bg);
  transition: background-color 0.3s, color 0.3s;
}

.fuwari-btn-regular {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--fuwari-btn-regular-bg);
  color: var(--fuwari-btn-content);
  transition: background-color 0.2s, color 0.2s;
  text-decoration: none;
}
.fuwari-btn-regular:hover {
  background-color: var(--fuwari-btn-regular-bg-hover);
}
.fuwari-btn-regular:active {
  background-color: var(--fuwari-btn-regular-bg-active);
}
.dark .fuwari-btn-regular {
  color: rgb(255 255 255 / 0.75);
}

.fuwari-btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--fuwari-primary);
  color: white;
  transition: background-color 0.2s, color 0.2s, opacity 0.2s;
}
.fuwari-btn-primary:hover {
  background-color: var(--fuwari-primary-hover);
}
.fuwari-btn-primary:active {
  background-color: var(--fuwari-primary-active);
}
.dark .fuwari-btn-primary {
  color: rgb(0 0 0 / 0.75);
}

.fuwari-text-90 {
  color: rgb(0 0 0 / 0.9);
}
.dark .fuwari-text-90 {
  color: rgb(255 255 255 / 0.9);
}

.fuwari-text-75 {
  color: rgb(0 0 0 / 0.75);
}
.dark .fuwari-text-75 {
  color: rgb(255 255 255 / 0.75);
}

.fuwari-text-70 {
  color: rgb(0 0 0 / 0.7);
}
.dark .fuwari-text-70 {
  color: rgb(255 255 255 / 0.7);
}

.fuwari-text-50 {
  color: rgb(0 0 0 / 0.5);
}
.dark .fuwari-text-50 {
  color: rgb(255 255 255 / 0.5);
}

.fuwari-text-30 {
  color: rgb(0 0 0 / 0.3);
}
.dark .fuwari-text-30 {
  color: rgb(255 255 255 / 0.3);
}

.fuwari-meta-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--fuwari-btn-regular-bg);
  color: var(--fuwari-btn-content);
  margin-right: 0.5rem;
  transition: background-color 0.2s, color 0.2s;
  flex-shrink: 0;
}

.fuwari-expand-animation {
  position: relative;
  z-index: 0;
}
.fuwari-expand-animation::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  scale: 0.85;
  z-index: -1;
  transition: scale 0.2s ease-out, background-color 0.2s;
}
.fuwari-expand-animation:hover::before {
  scale: 1;
  background-color: var(--fuwari-btn-plain-bg-hover);
}
.fuwari-expand-animation:active::before {
  background-color: var(--fuwari-btn-plain-bg-active);
}

.fuwari-timeline-dash {
  position: relative;
}
.fuwari-timeline-dash::before {
  content: "";
  position: absolute;
  width: 10%;
  height: 100%;
  left: calc(50% - 1px);
  border-left: 2px dashed rgba(0, 0, 0, 0.1);
  pointer-events: none;
  transition: all 0.3s;
  transform: translateY(-50%);
}
.dark .fuwari-timeline-dash::before {
  border-left: 2px dashed rgba(255, 255, 255, 0.1);
}

.fuwari-toc-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}
.dark .fuwari-toc-scrollbar {
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
.fuwari-toc-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.fuwari-toc-scrollbar::-webkit-scrollbar-track {
  background-color: transparent;
}
.fuwari-toc-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

/* Fuwari onload / entrance animations */
@keyframes fuwari-fade-in-up {
  0% {
    transform: translateY(2rem);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.fuwari-onload-animation {
  opacity: 0;
  animation: 300ms fuwari-fade-in-up ease-out forwards;
}

/* Page transition animations with Swup (Exact Fuwari transition) */
html.is-changing .transition-swup-fade {
  transition: opacity 200ms ease-in-out, transform 200ms ease-in-out;
}
html.is-animating .transition-swup-fade {
  opacity: 0;
  transform: translateY(1rem);
}

::selection {
  background-color: var(--fuwari-selection-bg);
  color: inherit;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background-color: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.35);
  background-clip: padding-box;
  border: 2px solid transparent;
  border-radius: 9999px;
}
.dark ::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.35);
}

/* ==========================================
   Fuwari Custom Markdown (.fuwari-custom-md)
   ========================================== */
.fuwari-custom-md {
  color: rgb(0 0 0 / 0.9);
  line-height: 1.8;
  font-size: 1rem;
}
.dark .fuwari-custom-md {
  color: rgb(255 255 255 / 0.9);
}

.fuwari-custom-md h1 {
  font-size: 1.875rem;
  line-height: 2.25rem;
  font-weight: 700;
  margin-top: 2.5rem;
  margin-bottom: 1.5rem;
}
.fuwari-custom-md h2 {
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 700;
  margin-top: 2.5rem;
  margin-bottom: 1.25rem;
}
.fuwari-custom-md h3 {
  font-size: 1.25rem;
  line-height: 1.75rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 1rem;
}
.fuwari-custom-md h1:hover::after,
.fuwari-custom-md h2:hover::after,
.fuwari-custom-md h3:hover::after {
  content: "#";
  color: var(--fuwari-primary);
  opacity: 0.5;
  font-weight: 400;
  margin-left: 0.25ch;
}

.fuwari-custom-md p {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.fuwari-custom-md a:not(.no-styling) {
  color: var(--fuwari-primary);
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: var(--fuwari-link-underline);
  text-decoration-style: dashed;
  text-underline-offset: 4px;
  border-radius: 4px;
  padding: 0 2px;
  transition: all 0.15s ease;
}
.fuwari-custom-md a:not(.no-styling):hover {
  background: var(--fuwari-btn-plain-bg-hover);
  text-decoration-color: var(--fuwari-primary);
}

.fuwari-custom-md :not(pre) > code {
  background-color: var(--fuwari-inline-code-bg);
  color: var(--fuwari-inline-code-color);
  padding: 0.15rem 0.4rem;
  border-radius: 0.375rem;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875em;
}

.fuwari-custom-md pre {
  background-color: oklch(0.2 0.015 var(--fuwari-hue)) !important;
  color: #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  overflow-x: auto;
  margin: 1.25rem 0;
}
.fuwari-custom-md pre code {
  background: transparent !important;
  color: inherit !important;
  padding: 0 !important;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875rem;
}

.fuwari-custom-md blockquote {
  margin: 1.25rem 0;
  padding: 0.5rem 1rem;
  border-left: 4px solid var(--fuwari-primary);
  background-color: var(--fuwari-btn-regular-bg);
  border-radius: 0 0.5rem 0.5rem 0;
}

.fuwari-custom-md ul,
.fuwari-custom-md ol {
  padding-left: 1.5rem;
  margin: 1rem 0;
}
.fuwari-custom-md ul {
  list-style-type: disc;
}
.fuwari-custom-md ol {
  list-style-type: decimal;
}
.fuwari-custom-md li {
  margin: 0.35rem 0;
}

.fuwari-custom-md img {
  max-width: 100%;
  border-radius: 0.75rem;
  margin: 1.25rem 0;
}

/* ==========================================
   Hue Slider Panel & Search Modal
   ========================================== */
.hue-picker-wrap {
  position: relative;
}
.hue-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 240px;
  padding: 16px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition: all 0.2s ease;
  z-index: 100;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}
.hue-panel.is-open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.hue-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    oklch(0.75 0.14 0),
    oklch(0.75 0.14 60),
    oklch(0.75 0.14 120),
    oklch(0.75 0.14 180),
    oklch(0.75 0.14 240),
    oklch(0.75 0.14 300),
    oklch(0.75 0.14 360)
  );
  outline: none;
  cursor: pointer;
}
.hue-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  border: 3px solid var(--fuwari-primary);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  cursor: grab;
}

.search-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
}
.search-modal.is-open {
  opacity: 1;
  visibility: visible;
}
.search-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

/* ==========================================
   Giscus Comments
   ========================================== */
.giscus,
.giscus-frame {
  width: 100%;
}
`;
