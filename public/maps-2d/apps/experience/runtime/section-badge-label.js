// Wrap at word boundaries; CSS handles unusually long unbroken words.
export function sectionBadgeLabel(name, limit = 36) {
  const lines = [];
  for (const word of String(name).trim().split(/\s+/)) {
    const last = lines.length - 1;
    if (last >= 0 && lines[last].length + word.length + 1 <= limit) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines.join('\n');
}
