# syntax=docker/dockerfile:1
# The northspan planner's image: build with the pinned SDK, prove the whole
# engine suite inside the build, then ship only the ASP.NET runtime and the
# published output.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY engine/ engine/
RUN dotnet test engine/Northspan.slnx --configuration Release
RUN dotnet publish engine/src/Northspan.Api --configuration Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/ .
# The platform's probes should hit /health for liveness and /ready for
# readiness; both stay open alongside /metrics and the workbench page.
ENV ASPNETCORE_URLS=http://+:47231
EXPOSE 47231
ENTRYPOINT ["dotnet", "Northspan.Api.dll"]
