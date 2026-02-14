namespace ZakatSimulator.Api.Models;

public record SimulationRequest
{
    public int Population { get; init; } = 5000;
    public double InitialWealth { get; init; } = 10000;
    public int Years { get; init; } = 50;
    public double Volatility { get; init; } = 5;   // trade stake %
    public double TaxRate { get; init; } = 2.5;     // zakat rate %
    public double Nisab { get; init; } = 7395;      // gold standard 85g × $85
    public double CostOfLiving { get; init; } = 1500;
    public int TradesPerYear { get; init; } = 5000;
}
