export function renderPolygon(el) {
    const fill = el.fill ?? 'transparent';
    const stroke = el.stroke ?? 'none';
    const strokeWidth = el.strokeWidth ?? 1;
    const w = el.width ?? 100;
    const h = el.height ?? 100;
    const containerStyle = [
        `position: absolute`,
        `left: ${el.x}px`,
        `top: ${el.y}px`,
        `width: ${w}px`,
        `height: ${h}px`,
        el.rotation != null && el.rotation !== 0
            ? `transform: rotate(${el.rotation}deg); transform-origin: center center`
            : '',
        el.opacity != null && el.opacity !== 1 ? `opacity: ${el.opacity}` : '',
    ]
        .filter(Boolean)
        .join('; ');
    const strokeAttr = stroke !== 'none'
        ? ` stroke="${stroke}" stroke-width="${strokeWidth}"`
        : ' stroke="none"';
    return [
        `<div style="${containerStyle}">`,
        `  <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block">`,
        `    <polygon points="${el.points}" fill="${fill}"${strokeAttr}/>`,
        `  </svg>`,
        `</div>`,
    ].join('\n');
}
//# sourceMappingURL=polygon.js.map