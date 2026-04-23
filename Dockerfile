# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["PathfindingEdu.csproj", "./"]
RUN dotnet restore "PathfindingEdu.csproj"

COPY . .
RUN dotnet publish "PathfindingEdu.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Persistent SQLite location (can be mounted by host platforms)
RUN mkdir -p /var/data

ENV ASPNETCORE_URLS=http://0.0.0.0:10000
ENV ConnectionStrings__DefaultConnection=Data\ Source=/var/data/pathfinding.db

COPY --from=build /app/publish .

EXPOSE 10000
ENTRYPOINT ["dotnet", "PathfindingEdu.dll"]
