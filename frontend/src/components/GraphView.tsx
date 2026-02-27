import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface GraphNode {
    id: string;
    name: string;
    riskScore: number;
    type: 'supplier' | 'buyer';
}

interface GraphLink {
    source: string;
    target: string;
    value: number;
}

interface GraphViewProps {
    nodes: GraphNode[];
    links: GraphLink[];
    width?: number;
    height?: number;
}

export default function GraphView({ nodes, links, width = 700, height = 500 }: GraphViewProps) {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || nodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const riskColor = (score: number) => {
            if (score >= 0.7) return '#ef4444';
            if (score >= 0.3) return '#f59e0b';
            return '#10b981';
        };

        const nodeRadius = (d: GraphNode) => {
            return d.type === 'supplier' ? 12 + d.riskScore * 10 : 10;
        };

        // Defs for glow filter
        const defs = svg.append('defs');
        const filter = defs.append('filter').attr('id', 'glow');
        filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Arrow markers
        defs.append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 25)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#475569');

        const simulation = d3.forceSimulation(nodes as any)
            .force('link', d3.forceLink(links as any).id((d: any) => d.id).distance(120))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(30));

        const g = svg.append('g');

        // Zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.3, 3])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Links
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke', '#334155')
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.6)
            .attr('marker-end', 'url(#arrowhead)');

        // Nodes
        const node = g.append('g')
            .selectAll('g')
            .data(nodes)
            .join('g')
            .call(d3.drag<SVGGElement, GraphNode>()
                .on('start', (event, d: any) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d: any) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d: any) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }) as any
            );

        // Node circles
        node.append('circle')
            .attr('r', nodeRadius)
            .attr('fill', d => riskColor(d.riskScore))
            .attr('fill-opacity', 0.3)
            .attr('stroke', d => riskColor(d.riskScore))
            .attr('stroke-width', 2)
            .style('filter', 'url(#glow)')
            .style('cursor', 'pointer')
            .on('mouseover', function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('fill-opacity', 0.6)
                    .attr('stroke-width', 3);
            })
            .on('mouseout', function (_, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('fill-opacity', 0.3)
                    .attr('stroke-width', 2);
            });

        // Node labels
        node.append('text')
            .text(d => d.name.length > 15 ? d.name.slice(0, 15) + '…' : d.name)
            .attr('dy', d => nodeRadius(d) + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', '#94a3b8')
            .attr('font-size', '10px')
            .attr('font-family', 'Inter, sans-serif');

        // Risk score label
        node.append('text')
            .text(d => (d.riskScore * 100).toFixed(0))
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .attr('fill', 'white')
            .attr('font-size', '9px')
            .attr('font-weight', '600')
            .attr('font-family', 'JetBrains Mono, monospace');

        // Simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);

            node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        return () => {
            simulation.stop();
        };
    }, [nodes, links, width, height]);

    return (
        <div className="glass-card overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white">Supplier-Buyer Network</h3>
                    <p className="text-sm text-slate-400 mt-1">
                        {nodes.length} entities • Risk-colored graph
                    </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-emerald-400/50 border border-emerald-400"></span>
                        Low Risk
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-amber-400/50 border border-amber-400"></span>
                        Medium
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-400/50 border border-red-400"></span>
                        High Risk
                    </span>
                </div>
            </div>
            <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                className="w-full"
                style={{ minHeight: `${height}px`, background: 'rgba(0,0,0,0.2)' }}
            />
        </div>
    );
}
