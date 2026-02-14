# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /app

# Copy csproj and restore
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./
RUN dotnet publish -c Release -o out

# Run stage
FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS runtime
WORKDIR /app
COPY --from=build /app/out .

# Render dynamically assigns a port via the PORT env var
# ASP.NET Core 8+ listens on port 8080 by default in containerized environments
# but Render uses PORT. We can force it to listen on the Render-assigned port.
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "ZakatSimulator.Api.dll"]
