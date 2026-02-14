namespace ZakatSimulator.Api.Models;

public record SimulationResult
{
    public StatsBlock WithTax { get; init; } = new();
    public StatsBlock NoTax { get; init; } = new();
    public List<PercentilePoint> ChartData { get; init; } = [];
    public List<YearSnapshot> Timeline { get; init; } = [];
}

public record StatsBlock
{
    public double Gini { get; init; }
    public double Mean { get; init; }
    public double Median { get; init; }
    public double Top1Pct { get; init; }
    public double Bot50Pct { get; init; }
    public double HalfHeldByPct { get; init; }
    public int Poor { get; init; }
    public int Middle { get; init; }
    public int Rich { get; init; }
    public int SuperRich { get; init; }
}

public record PercentilePoint
{
    public int Pct { get; init; }
    public double WithTax { get; init; }
    public double NoTax { get; init; }
}

public record YearSnapshot
{
    public int Year { get; init; }
    public double GiniWithTax { get; init; }
    public double GiniNoTax { get; init; }
}
