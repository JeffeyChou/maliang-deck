import { buildBaseStyle, escapeHtml, escapeJsonForScript } from '../utils.js';
export function renderFormula(el) {
    const style = buildBaseStyle(el, [
        el.fontSize ? `font-size: ${el.fontSize}px` : '',
        el.color ? `color: ${el.color}` : '',
    ].filter(Boolean));
    // Config stored in companion <script> block
    const config = {
        latex: el.latex,
        displayMode: el.displayMode ?? true,
        steps: el.steps,
        morphEasing: el.morphEasing,
        morphDuration: el.morphDuration ?? 800,
        morphMap: el.morphMap,
        stepTrigger: el.stepTrigger ?? 'click',
    };
    const configJson = escapeJsonForScript(JSON.stringify(config));
    return `<div data-formula style="${style}"></div><script type="application/json" data-for="${escapeHtml(el.id)}">${configJson}</script>`;
}
//# sourceMappingURL=formula.js.map