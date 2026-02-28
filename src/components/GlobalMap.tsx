import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

interface GlobalMapProps {
  analyzedCountries: { name: string; score: number }[];
}

const GlobalMap: React.FC<GlobalMapProps> = ({ analyzedCountries }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 450;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const projection = d3.geoNaturalEarth1()
      .scale(150)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const colorScale = d3.scaleThreshold<number, string>()
      .domain([3, 7])
      .range(['#10b981', '#f59e0b', '#ef4444']); // Green, Yellow, Red

    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then((data: any) => {
      const countries = topojson.feature(data, data.objects.countries) as any;

      svg.append('g')
        .selectAll('path')
        .data(countries.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('fill', (d: any) => {
          const countryName = d.properties.name;
          const match = analyzedCountries.find(c => 
            countryName.toLowerCase().includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(countryName.toLowerCase())
          );
          return match ? colorScale(match.score) : '#27272a';
        })
        .attr('stroke', '#3f3f46')
        .attr('stroke-width', 0.5)
        .append('title')
        .text((d: any) => d.properties.name);
    });
  }, [analyzedCountries]);

  return (
    <div className="w-full h-full bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center">
      <svg ref={svgRef} viewBox={`0 0 800 450`} className="w-full h-auto max-h-full" />
    </div>
  );
};

export default GlobalMap;
