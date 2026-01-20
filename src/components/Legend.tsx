export function Legend() {
  return (
    <div className="legend">
      <h3>Efficiency Gap (EG)</h3>
      <div className="legend-scale">
        <div className="legend-gradient" />
        <div className="legend-labels">
          <span>D +20%</span>
          <span>Neutral</span>
          <span>R +20%</span>
        </div>
      </div>
      <p className="legend-explanation">
        Measures wasted votes. Positive = R advantage, negative = D advantage.
      </p>
    </div>
  );
}
