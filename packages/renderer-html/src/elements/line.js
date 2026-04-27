export function renderLine(el) {
    const stroke = el.stroke ?? '#000000';
    const strokeWidth = el.strokeWidth ?? 1;
    const dasharray = el.strokeDasharray ?? '';
    // Compute bounding box from (x,y) to (x2,y2)
    const minX = Math.min(el.x, el.x2);
    const minY = Math.min(el.y, el.y2);
    const maxX = Math.max(el.x, el.x2);
    const maxY = Math.max(el.y, el.y2);
    // Add padding equal to strokeWidth so the line is not clipped at edges
    const pad = strokeWidth;
    const svgW = maxX - minX + pad * 2;
    const svgH = maxY - minY + pad * 2;
    // Local coordinates within the padded SVG
    const lx1 = el.x - minX + pad;
    const ly1 = el.y - minY + pad;
    const lx2 = el.x2 - minX + pad;
    const ly2 = el.y2 - minY + pad;
    const dasharrayAttr = dasharray ? ` stroke-dasharray="${dasharray}"` : '';
    const containerStyle = [
        `position: absolute`,
        `left: ${minX - pad}px`,
        `top: ${minY - pad}px`,
        `width: ${svgW}px`,
        `height: ${svgH}px`,
        el.opacity != null && el.opacity !== 1 ? `opacity: ${el.opacity}` : '',
    ]
        .filter(Boolean)
        .join('; ');
    return [
        `<div style="${containerStyle}" data-maliang-deck-x="${el.x}" data-maliang-deck-y="${el.y}" data-maliang-deck-x2="${el.x2}" data-maliang-deck-y2="${el.y2}">`,
        `  <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible">`,
        `    <line x1="${lx1}" y1="${ly1}" x2="${lx2}" y2="${ly2}" stroke="${stroke}" stroke-width="${strokeWidth}"${dasharrayAttr}/>`,
        `  </svg>`,
        `</div>`,
    ].join('\n');
}
//# sourceMappingURL=line.js.map