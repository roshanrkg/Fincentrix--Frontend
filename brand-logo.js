/**
 * Fincentrix Brand & Logo System
 * Standardized single source of truth for the Fincentrix brand mark and typography across all portals.
 * 
 * Provides:
 * 1. <fincentrix-logo> Web Component (custom element)
 * 2. window.FincentrixBrand helper utility
 */

(function () {
  'use strict';

  // Prevent multiple definitions
  if (window.FincentrixBrand) return;

  const FincentrixBrand = {
    /**
     * Generate HTML for the standard Fincentrix Logo
     * @param {Object} options
     * @param {'sm'|'md'|'lg'|'xl'} [options.size='md']
     * @param {'horizontal'|'vertical'|'icon'} [options.layout='horizontal']
     * @param {string} [options.href] Link URL, or empty/null for no link
     * @param {string} [options.badge] Optional badge text (e.g. 'Operator Console')
     * @param {string} [options.subtitle] Optional subtitle text
     * @param {'auto'|'light'|'dark'} [options.theme='auto']
     * @param {string} [options.className=''] Extra CSS classes
     * @returns {string} HTML string
     */
    renderLogo(options = {}) {
      const size = options.size || 'md';
      const layout = options.layout || 'horizontal';
      const href = options.href !== undefined ? options.href : null;
      const badge = options.badge || '';
      const subtitle = options.subtitle || '';
      const theme = options.theme || 'auto';
      const extraClass = options.className || '';

      // Size mappings
      const sizeConfig = {
        sm: {
          iconBox: 'w-7 h-7 rounded-lg text-lg',
          text: 'text-base',
          gap: 'gap-2',
          badgeText: 'text-[9px] px-1.5 py-0.2',
          subtitleText: 'text-[10px]'
        },
        md: {
          iconBox: 'w-9 h-9 rounded-xl text-2xl',
          text: 'text-xl',
          gap: 'gap-2.5',
          badgeText: 'text-[10px] px-2 py-0.5',
          subtitleText: 'text-xs'
        },
        lg: {
          iconBox: 'w-12 h-12 rounded-2xl text-3xl',
          text: 'text-2xl sm:text-3xl',
          gap: 'gap-3',
          badgeText: 'text-xs px-2.5 py-0.5',
          subtitleText: 'text-xs sm:text-sm'
        },
        xl: {
          iconBox: 'w-16 h-16 rounded-2xl text-4xl shadow-xl',
          text: 'text-3xl sm:text-4xl',
          gap: 'gap-4',
          badgeText: 'text-xs px-3 py-1',
          subtitleText: 'text-sm'
        }
      }[size] || sizeConfig.md;

      // Text color handling
      let textColor = 'text-gray-900 dark:text-white';
      if (theme === 'dark') {
        textColor = 'text-white';
      } else if (theme === 'light') {
        textColor = 'text-gray-900';
      }

      // Icon markup
      const iconMarkup = `
        <span class="fcx-logo-icon flex items-center justify-center shrink-0 ${sizeConfig.iconBox} font-extrabold italic text-white select-none transition-transform duration-200 group-hover:scale-105"
              style="background: linear-gradient(135deg, #4778ff 0%, #2450e8 100%); box-shadow: 0 4px 14px rgba(36, 80, 232, 0.35); font-style: italic; font-weight: 800; font-family: ui-sans-serif, system-ui, sans-serif;">
          F
        </span>
      `;

      if (layout === 'icon') {
        if (href) {
          return `<a href="${href}" class="fcx-logo group inline-flex items-center ${extraClass}" aria-label="Fincentrix">${iconMarkup}</a>`;
        }
        return `<span class="fcx-logo group inline-flex items-center ${extraClass}">${iconMarkup}</span>`;
      }

      // Badge markup
      const badgeMarkup = badge ? `
        <span class="inline-flex items-center font-bold uppercase tracking-wider rounded-md bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400 border border-brand-500/20 ${sizeConfig.badgeText}">
          ${badge}
        </span>
      ` : '';

      // Subtitle markup
      const subtitleMarkup = subtitle ? `
        <p class="font-medium text-gray-500 dark:text-gray-400 mt-1 ${sizeConfig.subtitleText}">
          ${subtitle}
        </p>
      ` : '';

      // Wordmark
      let textMarkup = '';
      if (layout === 'vertical') {
        textMarkup = `
          <div class="text-center mt-2">
            <span class="fcx-logo-text block font-extrabold italic tracking-tight ${textColor} ${sizeConfig.text}"
                  style="font-style: italic; font-weight: 800; letter-spacing: -0.03em;">
              Fincentrix
            </span>
            ${badge ? `<div class="mt-1">${badgeMarkup}</div>` : ''}
            ${subtitleMarkup}
          </div>
        `;
      } else {
        // Horizontal
        if (badge) {
          textMarkup = `
            <div class="flex flex-col text-left">
              <span class="fcx-logo-text font-extrabold italic tracking-tight leading-tight ${textColor} ${sizeConfig.text}"
                    style="font-style: italic; font-weight: 800; letter-spacing: -0.03em;">
                Fincentrix
              </span>
              <div class="mt-0.5">${badgeMarkup}</div>
              ${subtitleMarkup}
            </div>
          `;
        } else {
          textMarkup = `
            <span class="fcx-logo-text font-extrabold italic tracking-tight ${textColor} ${sizeConfig.text}"
                  style="font-style: italic; font-weight: 800; letter-spacing: -0.03em;">
              Fincentrix
            </span>
            ${subtitleMarkup}
          `;
        }
      }

      const containerClasses = layout === 'vertical'
        ? `flex flex-col items-center justify-center text-center ${extraClass}`
        : `flex items-center ${sizeConfig.gap} ${extraClass}`;

      if (href) {
        return `
          <a href="${href}" class="fcx-logo group ${containerClasses}" aria-label="Fincentrix">
            ${iconMarkup}
            ${textMarkup}
          </a>
        `;
      }

      return `
        <div class="fcx-logo group ${containerClasses}">
          ${iconMarkup}
          ${textMarkup}
        </div>
      `;
    }
  };

  // Expose Global Object
  window.FincentrixBrand = FincentrixBrand;

  // Define Web Component <fincentrix-logo>
  if (typeof customElements !== 'undefined' && !customElements.get('fincentrix-logo')) {
    class FincentrixLogoElement extends HTMLElement {
      static get observedAttributes() {
        return ['size', 'layout', 'href', 'badge', 'subtitle', 'theme'];
      }

      connectedCallback() {
        this.render();
      }

      attributeChangedCallback() {
        this.render();
      }

      render() {
        const size = this.getAttribute('size') || 'md';
        const layout = this.getAttribute('layout') || 'horizontal';
        const href = this.getAttribute('href');
        const badge = this.getAttribute('badge') || '';
        const subtitle = this.getAttribute('subtitle') || '';
        const theme = this.getAttribute('theme') || 'auto';
        const className = this.getAttribute('class') || '';

        this.innerHTML = FincentrixBrand.renderLogo({
          size,
          layout,
          href: href === 'none' ? null : href,
          badge,
          subtitle,
          theme,
          className
        });
      }
    }

    customElements.define('fincentrix-logo', FincentrixLogoElement);
  }
})();
