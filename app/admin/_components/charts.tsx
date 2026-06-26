import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { adminTheme } from './adminTheme';

type Point = { x: number; y: number };

function buildSmoothPath(points: Point[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function buildAreaPath(points: Point[], height: number): string {
  if (points.length < 2) return '';
  const line = buildSmoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x} ${height} L ${first.x} ${height} Z`;
}

function normalizeValues(values: number[], width: number, height: number, padding = 8): Point[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => ({
    x: padding + (i / (values.length - 1)) * (width - padding * 2),
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
  }));
}

function WebSvg({
  width,
  height,
  children,
  style,
}: {
  width: number;
  height: number;
  children: React.ReactNode;
  style?: object;
}) {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={[{ width, height }, style]}>
      {React.createElement(
        'svg',
        {
          width: '100%',
          height: '100%',
          viewBox: `0 0 ${width} ${height}`,
          preserveAspectRatio: 'none',
          style: { display: 'block' },
        },
        children,
      )}
    </View>
  );
}

type SparklineProps = {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  gradientId: string;
};

export function MiniSparkline({
  values,
  color,
  width = 120,
  height = 48,
  gradientId,
}: SparklineProps) {
  const points = normalizeValues(values, width, height, 4);
  const linePath = buildSmoothPath(points);

  return (
    <WebSvg width={width} height={height} style={styles.sparkline}>
      {React.createElement(
        'defs',
        null,
        React.createElement(
          'linearGradient',
          { id: gradientId, x1: '0', y1: '0', x2: '0', y2: '1' },
          React.createElement('stop', { offset: '0%', stopColor: color, stopOpacity: 0.35 }),
          React.createElement('stop', { offset: '100%', stopColor: color, stopOpacity: 0 }),
        ),
      )}
      {React.createElement('path', {
        d: buildAreaPath(points, height),
        fill: `url(#${gradientId})`,
      })}
      {React.createElement('path', {
        d: linePath,
        fill: 'none',
        stroke: color,
        strokeWidth: 2,
        strokeLinecap: 'round',
      })}
    </WebSvg>
  );
}

type FlowChartProps = {
  values: number[];
  labels: string[];
};

export function CommissionFlowChart({ values, labels }: FlowChartProps) {
  const width = 900;
  const height = 220;
  const chartHeight = 170;
  const points = normalizeValues(values, width, chartHeight, 12);
  const linePath = buildSmoothPath(points);
  const areaPath = buildAreaPath(points, chartHeight);

  return (
    <View style={styles.flowWrap}>
      <WebSvg width={width} height={chartHeight} style={styles.flowChart}>
        {React.createElement(
          'defs',
          null,
          React.createElement(
            'linearGradient',
            { id: 'flowGradient', x1: '0', y1: '0', x2: '0', y2: '1' },
            React.createElement('stop', { offset: '0%', stopColor: '#05FF9B', stopOpacity: 0.35 }),
            React.createElement('stop', { stopColor: '#05FF9B', stopOpacity: 0.04, offset: '100%' }),
          ),
        )}
        {React.createElement('path', { d: areaPath, fill: 'url(#flowGradient)' })}
        {React.createElement('path', {
          d: linePath,
          fill: 'none',
          stroke: '#05FF9B',
          strokeWidth: 2.5,
          strokeLinecap: 'round',
        })}
        {points.map((p, i) =>
          React.createElement('circle', {
            key: labels[i],
            cx: p.x,
            cy: p.y,
            r: 4,
            fill: '#0A110E',
            stroke: '#05FF9B',
            strokeWidth: 2,
          }),
        )}
      </WebSvg>
      <View style={styles.flowLabels}>
        {labels.map((label) => (
          <Text key={label} style={styles.flowLabel}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sparkline: { opacity: 0.95 },
  flowWrap: { marginTop: 8 },
  flowChart: { width: '100%' as unknown as number, maxWidth: '100%' as unknown as number },
  flowLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  flowLabel: {
    fontSize: 11,
    color: adminTheme.textMuted,
    fontWeight: '500',
  },
});

type BidsHourlyChartProps = {
  buckets: { label: string; total: number }[];
  peakLabel?: string;
};

export function BidsHourlyChart({ buckets, peakLabel }: BidsHourlyChartProps) {
  const width = 520;
  const height = 160;
  const padding = { top: 12, bottom: 8, left: 8, right: 8 };
  const chartH = height - padding.top - padding.bottom;
  const chartW = width - padding.left - padding.right;
  const max = Math.max(...buckets.map((b) => b.total), 1);
  const barW = chartW / buckets.length - 2;

  return (
    <View style={hourlyStyles.wrap}>
      {peakLabel ? <Text style={hourlyStyles.peak}>{peakLabel}</Text> : null}
      <WebSvg width={width} height={height} style={hourlyStyles.chart}>
        {React.createElement(
          'defs',
          null,
          React.createElement(
            'linearGradient',
            { id: 'barGradient', x1: '0', y1: '0', x2: '0', y2: '1' },
            React.createElement('stop', { offset: '0%', stopColor: '#05FF9B', stopOpacity: 0.9 }),
            React.createElement('stop', { offset: '100%', stopColor: '#10B981', stopOpacity: 0.35 }),
          ),
        )}
        {buckets.map((bucket, i) => {
          const barHeight = (bucket.total / max) * chartH;
          const x = padding.left + i * (chartW / buckets.length) + 1;
          const y = padding.top + chartH - barHeight;
          return React.createElement('rect', {
            key: bucket.label,
            x,
            y,
            width: Math.max(barW, 4),
            height: Math.max(barHeight, bucket.total > 0 ? 3 : 0),
            rx: 3,
            fill: 'url(#barGradient)',
            opacity: bucket.total === max && max > 0 ? 1 : 0.72,
          });
        })}
      </WebSvg>
      <View style={hourlyStyles.labels}>
        {buckets
          .filter((_, i) => i % 3 === 0)
          .map((bucket) => (
            <Text key={bucket.label} style={hourlyStyles.label}>
              {bucket.label}
            </Text>
          ))}
      </View>
    </View>
  );
}

const hourlyStyles = StyleSheet.create({
  wrap: { marginTop: 4 },
  peak: {
    fontSize: 12,
    color: adminTheme.neon,
    fontWeight: '600',
    marginBottom: 8,
  },
  chart: { width: '100%' as unknown as number, maxWidth: '100%' as unknown as number },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 10,
    color: adminTheme.textMuted,
    fontWeight: '500',
  },
});
