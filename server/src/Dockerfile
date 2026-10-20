FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["Sabeel.Ingest/Sabeel.Ingest.csproj", "Sabeel.Ingest/"]
COPY ["Sabeel.Domain/Sabeel.Domain.csproj", "Sabeel.Domain/"]
RUN dotnet restore "Sabeel.Ingest/Sabeel.Ingest.csproj"

COPY . .
WORKDIR "/src/Sabeel.Ingest"
RUN dotnet publish "Sabeel.Ingest.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/runtime:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Sabeel.Ingest.dll"]
