import matter from 'gray-matter';

export function parseAgent(mdContent, id) {
  const { data, content } = matter(mdContent);
  return {
    id,
    name:        data.name        || id,
    description: data.description || '',
    blurb:       data.blurb       || data.description || '',
    tone:        data.tone        || 'neutral',
    toneLabel:   data.toneLabel   || '',
    est:         data.est         || '',
    lastRun:     data.lastRun     || '—',
    inputs:      data.inputs      || [],
    body:        content,
  };
}
