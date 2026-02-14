using ZakatSimulator.Api.Models;
using ZakatSimulator.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173", "https://zakat-simulator-experience.netlify.app") // Replace with actual Netlify URL
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddSingleton<SimulationService>();

var app = builder.Build();

app.UseCors();

app.MapPost("/api/simulate", (SimulationRequest request, SimulationService service) =>
{
    var result = service.Run(request);
    return Results.Ok(result);
});

app.Run();
