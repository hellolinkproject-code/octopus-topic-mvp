export default function GraphQuestion({ prompt }) {
  const summary = prompt.chartData
    .map(
      (row) =>
        `${row.label}: ${row.values.map((item) => `${prompt.series.find((series) => series.key === item.series).label} ${item.value}%`).join(', ')}`,
    )
    .join('; ')
  return (
    <section className="exam-graph-question">
      <h2>{prompt.title}</h2>
      <p>{prompt.description}</p>
      <figure className="exam-graph">
        <div className="exam-graph-legend">
          {prompt.series.map((series, index) => (
            <span key={series.key}>
              <i className={`exam-series-${index}`} />
              {series.label}
            </span>
          ))}
        </div>
        <div className="exam-graph-area" role="img" aria-label={`${prompt.title}. ${summary}`}>
          <div className="exam-graph-axis" aria-hidden="true">
            {[100, 80, 60, 40, 20, 0].map((tick) => (
              <span key={tick} style={{ top: `${100 - tick}%` }}>
                {tick}
              </span>
            ))}
          </div>
          <div className="exam-graph-plot" aria-hidden="true">
            {prompt.chartData.map((row) => (
              <div className="exam-graph-group" key={row.label}>
                <div className="exam-graph-bars">
                  {row.values.map((item) => (
                    <div
                      key={item.series}
                      className={`exam-graph-bar exam-series-${prompt.series.findIndex((series) => series.key === item.series)}`}
                      style={{ height: `${item.value}%` }}
                    >
                      <b>{item.value}</b>
                    </div>
                  ))}
                </div>
                <strong>{row.label}</strong>
              </div>
            ))}
          </div>
        </div>
        <figcaption>{prompt.source}</figcaption>
      </figure>
    </section>
  )
}
