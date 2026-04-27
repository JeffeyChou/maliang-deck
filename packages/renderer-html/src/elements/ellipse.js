import { buildBaseStyle, escapeHtml, escapeJsonForScript } from '../utils.js';
export function renderEllipse(el) {
    const fill = el.fill ?? 'transparent';
    const stroke = el.stroke ?? 'none';
    const strokeWidth = el.strokeWidth ?? 1;
    const extras = [
        `background-color: ${fill}`,
        `border-radius: 50%`,
    ];
    if (stroke !== 'none') {
        extras.push(`border: ${strokeWidth}px solid ${stroke}`);
    }
    const style = buildBaseStyle(el, extras);
    const morphAttr = el.morphSteps?.length ? ' data-shape-morph' : '';
    let html = `<div${morphAttr} style="${style}"></div>`;
    if (el.morphSteps?.length) {
        const config = {
            elementType: 'ellipse',
            morphSteps: el.morphSteps,
            morphStepTrigger: el.morphStepTrigger ?? 'click',
        };
        const configJson = escapeJsonForScript(JSON.stringify(config));
        html += `<script type="application/json" data-for="${escapeHtml(el.id)}">${configJson}</script>`;
    }
    return html;
}
//# sourceMappingURL=ellipse.js.map