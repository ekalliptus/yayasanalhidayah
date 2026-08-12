import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '../icon';
import { runSeoChecks, scoreLabel, scoreBgColor, type SeoInput, type SeoGroup, type CheckStatus } from './seo-checks';

interface Props {
  title: string;
  slug: string;
  metaTitle: string;
  metaDesc: string;
  excerpt: string;
  contentText: string;
  contentHtml: string;
  hasCover: boolean;
  focusKeyword: string;
  usedFocusKeywords?: string[];
  onFocusKeywordChange: (kw: string) => void;
  onScoreChange?: (score: number) => void;
}

const statusIcon: Record<CheckStatus, { name: string; className: string }> = {
  pass: { name: 'circle-check', className: 'text-emerald-400' },
  warning: { name: 'alert-triangle', className: 'text-amber-400' },
  fail: { name: 'circle-x', className: 'text-red-400' },
};

export default function SeoAnalyzer(props: Props) {
  const result = React.useMemo(
    () =>
      runSeoChecks({
        focusKeyword: props.focusKeyword,
        title: props.title,
        slug: props.slug,
        metaTitle: props.metaTitle,
        metaDesc: props.metaDesc,
        excerpt: props.excerpt,
        text: props.contentText,
        html: props.contentHtml,
        hasCover: props.hasCover,
        usedFocusKeywords: props.usedFocusKeywords,
      }),
    [
      props.focusKeyword, props.title, props.slug, props.metaTitle,
      props.metaDesc, props.excerpt, props.contentText, props.contentHtml,
      props.hasCover, props.usedFocusKeywords,
    ],
  );

  React.useEffect(() => { props.onScoreChange?.(result.percentage); }, [result.percentage, props.onScoreChange]);

  const label = scoreLabel(result.percentage);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon name="search-check" className="size-4" />
          Analisis SEO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Focus keyword input */}
        <div className="space-y-1.5">
          <Label className="text-xs">Focus Keyword</Label>
          <Input
            value={props.focusKeyword}
            onChange={(e) => props.onFocusKeywordChange(e.target.value)}
            placeholder="mis: yayasan al hidayah"
            className="h-8 text-sm"
          />
        </div>

        {/* Score bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Skor SEO</span>
            <span className={`font-semibold tabular-nums ${label.color}`}>
              {result.percentage}/100 — {label.text}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scoreBgColor(result.percentage)}`}
              style={{ width: `${result.percentage}%` }}
            />
          </div>
        </div>

        {/* Check groups */}
        <div className="space-y-1">
          {result.groups.map((group) => (
            <CheckGroup key={group.label} group={group} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CheckGroup({ group }: { group: SeoGroup }) {
  const [open, setOpen] = React.useState(false);
  const passed = group.checks.filter((c) => c.status === 'pass').length;
  const total = group.checks.length;
  const allPassed = passed === total;

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
      >
        <Icon name={group.icon} className="size-3.5 text-muted-foreground" />
        <span className="flex-1 font-medium">{group.label}</span>
        <span className={`text-xs tabular-nums ${allPassed ? 'text-emerald-400' : 'text-muted-foreground'}`}>
          {passed}/{total}
        </span>
        <Icon
          name="chevron-down"
          className={`size-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t px-3 py-2 space-y-1.5">
          {group.checks.map((check) => {
            const icon = statusIcon[check.status];
            return (
              <div key={check.id} className="flex items-start gap-2">
                <Icon name={icon.name} className={`size-3.5 mt-0.5 shrink-0 ${icon.className}`} />
                <span className="text-xs text-muted-foreground leading-relaxed">{check.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
