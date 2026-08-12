import { describe, expect, test } from 'bun:test';
import { runSeoChecks } from './seo-checks';

const input = {
  focusKeyword: 'kafarat',
  title: '7 Panduan Kafarat Lengkap dan Praktis',
  slug: 'panduan-kafarat',
  metaTitle: '7 Panduan Kafarat Lengkap dan Praktis',
  metaDesc: 'Panduan kafarat lengkap untuk memahami kewajiban, cara menunaikan, dan penyaluran yang tepat sesuai syariat Islam di Indonesia.',
  excerpt: 'Panduan kafarat lengkap.',
  text: 'Kafarat adalah kewajiban. Oleh karena itu, pahami kafarat dengan baik.\n\nSelain itu, tunaikan kafarat secara amanah.\n\nKemudian salurkan kepada penerima yang berhak. '.repeat(30),
  html: '<h2>Panduan kafarat</h2><p>Kafarat adalah kewajiban.</p><h3>Cara menunaikan</h3><p><a href="/program">Program</a> <a href="https://kemenag.go.id">Sumber</a></p><img src="https://x.test/a.jpg" alt="Kafarat">',
  hasCover: true,
  usedFocusKeywords: [],
};

describe('Rank Math-style article analysis', () => {
  test('runs exactly 35 checks across five groups', () => {
    const result = runSeoChecks(input);
    expect(result.groups).toHaveLength(5);
    expect(result.groups.flatMap((group) => group.checks)).toHaveLength(35);
    expect(result.percentage).toBeGreaterThan(0);
    expect(result.percentage).toBeLessThanOrEqual(100);
  });

  test('warns when another article uses the focus keyword', () => {
    const result = runSeoChecks({ ...input, usedFocusKeywords: ['KAFARAT'] });
    const check = result.groups.flatMap((group) => group.checks).find((item) => item.id === 'kw-unique');
    expect(check?.status).toBe('warning');
  });
});
