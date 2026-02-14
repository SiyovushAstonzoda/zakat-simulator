using ZakatSimulator.Api.Models;

namespace ZakatSimulator.Api.Services;

public class SimulationService
{
    public SimulationResult Run(SimulationRequest req)
    {
        var withTaxPop = RunPopulation(req, applyZakat: true, out var timelineWithTax);
        var noTaxPop = RunPopulation(req, applyZakat: false, out var timelineNoTax);

        // Merge timelines
        var timeline = timelineWithTax.Zip(timelineNoTax, (a, b) => new YearSnapshot
        {
            Year = a.Year,
            GiniWithTax = a.GiniWithTax,
            GiniNoTax = b.GiniNoTax
        }).ToList();

        return new SimulationResult
        {
            WithTax = ComputeStats(withTaxPop, req.Nisab),
            NoTax = ComputeStats(noTaxPop, req.Nisab),
            ChartData = BuildPercentileChart(withTaxPop, noTaxPop),
            Timeline = timeline
        };
    }

    private double[] RunPopulation(SimulationRequest req, bool applyZakat, out List<YearSnapshot> timeline)
    {
        var rng = new Random();
        int n = req.Population;
        var pop = new double[n];
        Array.Fill(pop, req.InitialWealth);

        double stakePct = req.Volatility / 100.0;
        double zakatRate = req.TaxRate / 100.0;
        // Base income covers living costs + modest surplus
        double baseIncome = req.CostOfLiving * 1.3;
        // Multiplicative return rate on invested capital (the key driver of inequality)
        double returnRate = 0.08;
        timeline = [];

        for (int year = 1; year <= req.Years; year++)
        {
            // 1. Income: everyone earns a base wage (with variance)
            for (int i = 0; i < n; i++)
            {
                double incomeVariance = 0.5 + rng.NextDouble(); // 0.5x to 1.5x
                pop[i] += baseIncome * incomeVariance;
            }

            // 2. Cost of living (expenses)
            for (int i = 0; i < n; i++)
                pop[i] -= req.CostOfLiving;

            // 3. Multiplicative returns on total wealth (the Pareto driver)
            // Symmetric coin flip: wealth × (1 ± r). Even though E[X] stays the same,
            // E[log(X)] < 0 — so geometric mean shrinks, causing natural concentration.
            for (int i = 0; i < n; i++)
            {
                if (pop[i] > 0)
                {
                    pop[i] = rng.NextDouble() > 0.5
                        ? pop[i] * (1 + returnRate)
                        : pop[i] * (1 - returnRate);
                }
            }

            // 4. Market trades (zero-sum exchange)
            for (int t = 0; t < req.TradesPerYear; t++)
            {
                int a = rng.Next(n);
                int b = rng.Next(n);
                if (a == b || pop[a] <= 0 || pop[b] <= 0) continue;

                double stake = Math.Min(pop[a], pop[b]) * stakePct;
                if (rng.NextDouble() > 0.5)
                {
                    pop[a] += stake;
                    pop[b] -= stake;
                }
                else
                {
                    pop[a] -= stake;
                    pop[b] += stake;
                }
            }

            // 5. Floor wealth
            for (int i = 0; i < n; i++)
                pop[i] = Math.Max(0.1, pop[i]);

            // 6. Zakat
            if (applyZakat)
            {
                double pool = 0;
                for (int i = 0; i < n; i++)
                {
                    if (pop[i] > req.Nisab)
                    {
                        double tax = pop[i] * zakatRate;
                        pop[i] -= tax;
                        pool += tax;
                    }
                }

                // Distribute to those below nisab
                var recipientIndices = new List<int>();
                for (int i = 0; i < n; i++)
                    if (pop[i] < req.Nisab) recipientIndices.Add(i);

                if (recipientIndices.Count > 0 && pool > 0)
                {
                    double share = pool / recipientIndices.Count;
                    foreach (int idx in recipientIndices)
                        pop[idx] += share;
                }
            }

            // Snapshot every 5 years
            if (year % 5 == 0 || year == 1)
            {
                double gini = CalculateGini(pop);
                timeline.Add(new YearSnapshot
                {
                    Year = year,
                    GiniWithTax = applyZakat ? gini : 0,
                    GiniNoTax = applyZakat ? 0 : gini
                });
            }
        }

        return pop;
    }

    private StatsBlock ComputeStats(double[] wealths, double nisab)
    {
        var sorted = wealths.OrderBy(w => w).ToArray();
        int n = sorted.Length;
        double total = sorted.Sum();
        double mean = total / n;
        double median = n % 2 == 0
            ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2.0
            : sorted[n / 2];

        double top1Total = sorted.Skip((int)(n * 0.99)).Sum();
        double bot50Total = sorted.Take(n / 2).Sum();

        // How many richest hold half the wealth
        int count = 0;
        double running = 0;
        for (int i = n - 1; i >= 0; i--)
        {
            running += sorted[i];
            count++;
            if (running >= total / 2) break;
        }

        return new StatsBlock
        {
            Gini = CalculateGini(wealths),
            Mean = Math.Round(mean, 2),
            Median = Math.Round(median, 2),
            Top1Pct = Math.Round(top1Total / total * 100, 2),
            Bot50Pct = Math.Round(bot50Total / total * 100, 2),
            HalfHeldByPct = Math.Round((double)count / n * 100, 2),
            Poor = sorted.Count(w => w < nisab * 0.5),
            Middle = sorted.Count(w => w >= nisab * 0.5 && w < nisab * 3),
            Rich = sorted.Count(w => w >= nisab * 3 && w < nisab * 10),
            SuperRich = sorted.Count(w => w >= nisab * 10)
        };
    }

    private List<PercentilePoint> BuildPercentileChart(double[] pop1, double[] pop2)
    {
        var s1 = pop1.OrderBy(w => w).ToArray();
        var s2 = pop2.OrderBy(w => w).ToArray();
        int buckets = 100;
        double gs = (double)s1.Length / buckets;

        return Enumerable.Range(0, buckets).Select(i =>
        {
            int start = (int)(i * gs);
            int end = (int)((i + 1) * gs);
            var slice1 = s1[start..end];
            var slice2 = s2[start..end];
            return new PercentilePoint
            {
                Pct = i + 1,
                WithTax = Math.Round(slice1.Average(), 2),
                NoTax = Math.Round(slice2.Average(), 2)
            };
        }).ToList();
    }

    private static double CalculateGini(double[] wealths)
    {
        // Efficient O(n log n) Gini using sorted order
        var sorted = wealths.OrderBy(w => w).ToArray();
        int n = sorted.Length;
        double sumOfProducts = 0;
        double totalWealth = 0;

        for (int i = 0; i < n; i++)
        {
            sumOfProducts += (2 * (i + 1) - n - 1) * sorted[i];
            totalWealth += sorted[i];
        }

        if (totalWealth <= 0) return 1.0;
        return Math.Round(sumOfProducts / (n * totalWealth), 4);
    }
}
