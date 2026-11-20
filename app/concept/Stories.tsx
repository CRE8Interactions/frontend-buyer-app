/* Featured stories: all four clients at once as a grid of photo cards (four across on wide screens, two on tablets,
   stacked on phones). Each card carries the client, the headline figure and the link to the case study. */
type Story = { slug: string; org: string; r: string; img: string; logo: string; b: number };

export default function Stories({ items }: { items: Story[] }) {
  return (
    <div className="st" role="list">
      {items.map((c, i) => {
        const [name, league] = c.org.split(" · ");
        return (
          <article key={c.slug} role="listitem" className="st-p">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="st-bg" loading="lazy" decoding="async" src={c.img} alt="" style={{ filter: `brightness(${c.b})` }} />
            <span className="st-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <div className="st-body">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="st-logo" loading="lazy" decoding="async" src={c.logo} alt={name} />
              <p className="st-org">{name}<em>{league}</em></p>
              <p className="st-r">{c.r}</p>
              <a href={`/case-study/${c.slug}`} className="st-go">
                Read case study
                <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
